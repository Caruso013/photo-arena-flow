import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Edge Function para processar pagamentos via Mercado Pago
 * Suporta: PIX (geração e verificação) e Cartão de Crédito
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ===== CONFIGURAÇÃO =====
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const mpAccessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');

    if (!mpAccessToken) {
      console.error('❌ MERCADO_PAGO_ACCESS_TOKEN não configurado');
      return new Response(JSON.stringify({
        success: false,
        error: 'Sistema de pagamento não configurado. Entre em contato com o suporte.'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // ===== AUTENTICAÇÃO DO USUÁRIO =====
    const authHeader = req.headers.get('Authorization');
    let buyerId: string | null = null;

    if (authHeader) {
      const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      });
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (user) {
        buyerId = user.id;
        console.log('✅ Usuário autenticado:', user.id);
      }
    }

    // ===== PARSE DO BODY =====
    const body = await req.json();
    const {
      action,           // 'create_pix' | 'create_card' | 'check_status'
      paymentId,        // Para check_status
      photos,           // Array de fotos [{id, title, price}]
      buyer,            // {name, surname, email, phone, cpf}
      cardToken,        // Token do cartão (para create_card)
      cardPaymentMethodId, // visa, master, etc
      cardIssuerId,     // Banco emissor
      installments,     // Número de parcelas
      discount,         // {percentage, amount} opcional
      deviceId,         // Device Session ID para anti-fraude (obrigatório)
    } = body;

    console.log('📥 Request:', JSON.stringify({ action, paymentId, photosCount: photos?.length, buyerEmail: buyer?.email, hasDeviceId: !!deviceId }));

    // ===== AÇÃO: VERIFICAR STATUS DO PAGAMENTO =====
    if (action === 'check_status' && paymentId) {
      console.log('🔍 Verificando status do pagamento:', paymentId);

      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { 'Authorization': `Bearer ${mpAccessToken}` },
      });

      const mpResult = await mpResponse.json();
      console.log('📋 Status MP:', mpResult.status);

      // Se aprovado, processar compra
      if (mpResult.status === 'approved') {
        await processApprovedPayment(supabaseAdmin, mpResult);
      }

      return new Response(JSON.stringify({
        success: true,
        status: mpResult.status,
        statusDetail: mpResult.status_detail,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ===== VALIDAÇÕES COMUNS =====
    if (!photos || !Array.isArray(photos) || photos.length === 0) {
      return errorResponse('Nenhuma foto selecionada', 400);
    }

    if (!buyer || !buyer.email || !buyer.cpf) {
      return errorResponse('Dados do comprador incompletos (email e CPF são obrigatórios)', 400);
    }

    // Limpar CPF
    const cleanCpf = buyer.cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      return errorResponse('CPF deve ter 11 dígitos', 400);
    }

    // Buscar usuário por email se não autenticado
    if (!buyerId) {
      const { data: profileData } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', buyer.email.toLowerCase())
        .maybeSingle();

      if (profileData) {
        buyerId = profileData.id;
      }
    }

    if (!buyerId) {
      return errorResponse('Usuário não encontrado. Por favor, faça login.', 401);
    }

    // ===== CALCULAR VALORES =====
    const subtotal = photos.reduce((sum: number, p: any) => sum + (Number(p.price) || 0), 0);
    const discountAmount = discount?.amount || 0;
    const finalTotal = Math.max(subtotal - discountAmount, 1); // Mínimo R$ 1

    console.log('💰 Valores:', { subtotal, discountAmount, finalTotal });

    // ===== CRIAR REGISTROS DE PURCHASE =====
    const purchaseIds: string[] = [];

    for (const photo of photos) {
      const { data: photoData } = await supabaseAdmin
        .from('photos')
        .select('photographer_id')
        .eq('id', photo.id)
        .single();

      if (!photoData) {
        console.warn('⚠️ Foto não encontrada:', photo.id);
        continue;
      }

      const { data: purchase, error: purchaseError } = await supabaseAdmin
        .from('purchases')
        .insert({
          photo_id: photo.id,
          buyer_id: buyerId,
          photographer_id: photoData.photographer_id,
          amount: photo.price,
          status: 'pending',
        })
        .select()
        .single();

      if (purchaseError) {
        console.error('❌ Erro ao criar purchase:', purchaseError);
        continue;
      }

      purchaseIds.push(purchase.id);
    }

    if (purchaseIds.length === 0) {
      return errorResponse('Não foi possível processar as fotos selecionadas', 500);
    }

    // Criar referência externa
    const externalReference = purchaseIds.length === 1
      ? purchaseIds[0]
      : `batch_${purchaseIds[0].slice(0, 8)}_${purchaseIds.length}_${Date.now().toString(36)}`;

    // Salvar referência nas purchases
    await supabaseAdmin
      .from('purchases')
      .update({ stripe_payment_intent_id: externalReference })
      .in('id', purchaseIds);

    console.log('📋 External Reference:', externalReference);

    // ===== AÇÃO: CRIAR PAGAMENTO PIX =====
    if (action === 'create_pix') {
      console.log('🔄 Criando pagamento PIX...');

      const pixPayload = {
        transaction_amount: Number(finalTotal.toFixed(2)),
        payment_method_id: 'pix',
        description: photos.length > 1 ? `${photos.length} fotos - STA Fotos` : 'Foto - STA Fotos',
        payer: {
          email: buyer.email.toLowerCase().trim(),
          first_name: (buyer.name || 'Cliente').trim(),
          last_name: (buyer.surname || 'STA').trim(),
          identification: {
            type: 'CPF',
            number: cleanCpf,
          },
        },
        external_reference: externalReference,
        notification_url: `${supabaseUrl}/functions/v1/mercadopago-webhook`,
      };

      // Headers com Device Session ID para anti-fraude
      const mpHeaders: Record<string, string> = {
        'Authorization': `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `pix-${externalReference}`,
      };

      // Adicionar Device Session ID se disponível (obrigatório para evitar bloqueio)
      if (deviceId) {
        mpHeaders['X-meli-session-id'] = deviceId;
        console.log('🔐 Device Session ID adicionado ao request PIX');
      } else {
        console.warn('⚠️ Device Session ID não fornecido - pode causar bloqueio');
      }

      const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: mpHeaders,
        body: JSON.stringify(pixPayload),
      });

      const mpResult = await mpResponse.json();
      console.log('📦 Resposta MP:', JSON.stringify(mpResult));

      if (!mpResponse.ok || mpResult.error) {
        console.error('❌ Erro MP:', mpResult);
        // Limpar purchases criadas
        await supabaseAdmin.from('purchases').delete().in('id', purchaseIds);

        const errorMsg = mpResult.cause?.[0]?.description || mpResult.message || 'Erro ao gerar PIX';
        return errorResponse(errorMsg, 400);
      }

      // Atualizar purchases com payment_id
      await supabaseAdmin
        .from('purchases')
        .update({ stripe_payment_intent_id: `${externalReference}|mp:${mpResult.id}` })
        .in('id', purchaseIds);

      const pixInfo = mpResult.point_of_interaction?.transaction_data;

      return new Response(JSON.stringify({
        success: true,
        paymentId: mpResult.id,
        purchaseIds,
        pix: pixInfo ? {
          qrCode: pixInfo.qr_code,
          qrCodeBase64: pixInfo.qr_code_base64,
          expirationDate: mpResult.date_of_expiration,
        } : null,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ===== AÇÃO: CRIAR PAGAMENTO COM CARTÃO =====
    if (action === 'create_card') {
      if (!cardToken) {
        return errorResponse('Token do cartão não fornecido', 400);
      }

      console.log('🔄 Processando pagamento com cartão...');

      const cardPayload: any = {
        transaction_amount: Number(finalTotal.toFixed(2)),
        token: cardToken,
        description: photos.length > 1 ? `${photos.length} fotos - STA Fotos` : 'Foto - STA Fotos',
        installments: Number(installments) || 1,
        payment_method_id: cardPaymentMethodId,
        payer: {
          email: buyer.email.toLowerCase().trim(),
          first_name: (buyer.name || 'Cliente').trim(),
          last_name: (buyer.surname || 'STA').trim(),
          identification: {
            type: 'CPF',
            number: cleanCpf,
          },
        },
        external_reference: externalReference,
        notification_url: `${supabaseUrl}/functions/v1/mercadopago-webhook`,
      };

      if (cardIssuerId) {
        cardPayload.issuer_id = Number(cardIssuerId);
      }

      // Headers com Device Session ID para anti-fraude
      const mpCardHeaders: Record<string, string> = {
        'Authorization': `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `card-${externalReference}`,
      };

      if (deviceId) {
        mpCardHeaders['X-meli-session-id'] = deviceId;
        console.log('🔐 Device Session ID adicionado ao request Cartão');
      }

      const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: mpCardHeaders,
        body: JSON.stringify(cardPayload),
      });

      const mpResult = await mpResponse.json();
      console.log('📦 Resposta MP Cartão:', mpResult.status, mpResult.status_detail);

      if (!mpResponse.ok || mpResult.error) {
        console.error('❌ Erro MP Cartão:', mpResult);
        await supabaseAdmin.from('purchases').delete().in('id', purchaseIds);

        const errorMsg = mpResult.cause?.[0]?.description || mpResult.message || 'Erro ao processar cartão';
        return errorResponse(errorMsg, 400);
      }

      // Atualizar purchases com payment_id
      await supabaseAdmin
        .from('purchases')
        .update({ stripe_payment_intent_id: `${externalReference}|mp:${mpResult.id}` })
        .in('id', purchaseIds);

      // Se aprovado imediatamente
      if (mpResult.status === 'approved') {
        await supabaseAdmin
          .from('purchases')
          .update({ status: 'completed' })
          .in('id', purchaseIds);
      }

      return new Response(JSON.stringify({
        success: mpResult.status === 'approved',
        status: mpResult.status,
        statusDetail: mpResult.status_detail,
        paymentId: mpResult.id,
        purchaseIds,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return errorResponse('Ação não reconhecida. Use: create_pix, create_card ou check_status', 400);

  } catch (error) {
    console.error('❌ Erro geral:', error);
    return errorResponse('Erro interno do servidor', 500);
  }
});

// ===== FUNÇÕES AUXILIARES =====

function errorResponse(message: string, status: number) {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status,
    headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
  });
}

async function processApprovedPayment(supabase: any, mpResult: any) {
  const externalRef = mpResult.external_reference;
  if (!externalRef) return;

  console.log('✅ Processando pagamento aprovado:', externalRef);

  // Buscar purchases pelo external_reference
  const { data: purchases } = await supabase
    .from('purchases')
    .select('id')
    .like('stripe_payment_intent_id', `%${externalRef.split('|')[0]}%`);

  if (!purchases || purchases.length === 0) {
    console.warn('⚠️ Nenhuma purchase encontrada para:', externalRef);
    return;
  }

  const purchaseIds = purchases.map((p: any) => p.id);
  console.log(`📋 Atualizando ${purchaseIds.length} purchases para completed`);

  // Atualizar status
  await supabase
    .from('purchases')
    .update({ status: 'completed' })
    .in('id', purchaseIds);
}
