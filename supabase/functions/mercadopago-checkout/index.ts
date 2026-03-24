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

    // Log para debug - mostrar prefixo do token (sem expor o token completo)
    const tokenPrefix = mpAccessToken.substring(0, 20);
    console.log('🔑 Access Token prefix:', tokenPrefix + '...');

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
      discount,         // {percentage, amount} opcional (desconto progressivo)
      coupon,           // {coupon_id, code, amount} opcional (cupom)
      deviceId,         // Device Session ID para anti-fraude (obrigatório)
    } = body;

    console.log('📥 Request:', JSON.stringify({ 
      action, 
      paymentId, 
      photosCount: photos?.length, 
      buyerEmail: buyer?.email, 
      hasDeviceId: !!deviceId,
      hasProgressiveDiscount: !!discount,
      hasCoupon: !!coupon 
    }));

    // ===== AÇÃO: VERIFICAR CREDENCIAIS DO MERCADO PAGO =====
    if (action === 'check_credentials') {
      console.log('🔍 Verificando credenciais do Mercado Pago...');

      // Testar se o Access Token é válido
      const testResponse = await fetch('https://api.mercadopago.com/users/me', {
        headers: { 'Authorization': `Bearer ${mpAccessToken}` },
      });

      const testResult = await testResponse.json();

      if (!testResponse.ok) {
        console.error('❌ Access Token inválido:', testResult);
        return new Response(JSON.stringify({
          success: false,
          error: 'Access Token inválido ou expirado',
          details: testResult
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('✅ Credenciais válidas:', { id: testResult.id, email: testResult.email, site_id: testResult.site_id });

      return new Response(JSON.stringify({
        success: true,
        account: {
          id: testResult.id,
          email: testResult.email,
          site_id: testResult.site_id,
          nickname: testResult.nickname,
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ===== AÇÃO: VERIFICAR STATUS DO PAGAMENTO =====
    // NOTA: Esta ação evita consultas desnecessárias no banco, mas sincroniza estados terminais
    if (action === 'check_status' && paymentId) {
      console.log('🔍 Verificando status do pagamento:', paymentId);

      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { 'Authorization': `Bearer ${mpAccessToken}` },
      });

      const mpResult = await mpResponse.json();

      if (!mpResponse.ok || mpResult.error) {
        const errorMsg = mpResult?.cause?.[0]?.description || mpResult?.message || 'Erro ao verificar status do pagamento';
        console.error('❌ Erro ao consultar Mercado Pago:', { paymentId, errorMsg, raw: mpResult });
        return new Response(JSON.stringify({
          success: false,
          status: 'error',
          statusDetail: mpResult?.status_detail || null,
          error: errorMsg,
        }), {
          status: mpResponse.status >= 500 ? 502 : 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const status = mpResult.status;
      const statusDetail = mpResult.status_detail;
      console.log('📋 Status MP:', status, statusDetail || '');

      // Se aprovado, processar compra (única operação de banco)
      if (status === 'approved') {
        try {
          await processApprovedPayment(supabaseAdmin, mpResult);
        } catch (dbError) {
          console.warn('⚠️ Erro ao processar aprovação no DB (será reconciliado):', dbError);
          // Não falhar - o webhook/reconciliação cuidará disso
        }
      }

      // Se rejeitado/cancelado, sincronizar como failed para evitar pendências infinitas
      const terminalFailureStatuses = ['rejected', 'cancelled', 'refunded', 'charged_back'];
      if (terminalFailureStatuses.includes(status)) {
        const externalRef = mpResult.external_reference?.split('|')[0];
        if (externalRef) {
          try {
            const { data: purchases } = await supabaseAdmin
              .from('purchases')
              .select('id')
              .like('stripe_payment_intent_id', `%${externalRef}%`);

            if (purchases && purchases.length > 0) {
              const purchaseIds = purchases.map((p: any) => p.id);
              await supabaseAdmin
                .from('purchases')
                .update({ status: 'failed' })
                .in('id', purchaseIds);
              console.log('🛑 Purchases marcadas como failed:', purchaseIds.length);
            }
          } catch (syncError) {
            console.warn('⚠️ Falha ao sincronizar status failed (será reconciliado):', syncError);
          }
        }
      }

      return new Response(JSON.stringify({
        success: true,
        status,
        statusDetail,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ===== VALIDAÇÕES COMUNS =====
    if (!photos || !Array.isArray(photos) || photos.length === 0) {
      return errorResponse('Nenhuma foto selecionada', 400);
    }

    // Para compra gratuita, buyer pode ser simplificado
    if (action !== 'free_purchase') {
      if (!buyer || !buyer.email || !buyer.cpf) {
        return errorResponse('Dados do comprador incompletos (email e CPF são obrigatórios)', 400);
      }
    }

    // Limpar CPF
    const cleanCpf = (buyer?.cpf || '').replace(/\D/g, '');
    if (action !== 'free_purchase' && cleanCpf.length !== 11) {
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

    // ===== CALCULAR VALORES (VALIDAÇÃO SERVER-SIDE) =====
    // Buscar preços REAIS das fotos no banco (NUNCA confiar no frontend)
    const photoIds = photos.map((p: any) => p.id);
    const { data: dbPhotos, error: dbPhotosError } = await supabaseAdmin
      .from('photos')
      .select('id, price, campaign_id')
      .in('id', photoIds);

    if (dbPhotosError || !dbPhotos || dbPhotos.length === 0) {
      return errorResponse('Fotos não encontradas no banco de dados', 400);
    }

    const dbPhotoMap = new Map(dbPhotos.map((p: any) => [p.id, p]));
    const subtotal = dbPhotos.reduce((sum: number, p: any) => sum + (Number(p.price) || 0), 0);
    const photoCount = dbPhotos.length;

    // Validar desconto progressivo SERVER-SIDE (recalcular, não confiar no frontend)
    // Verificar se as campanhas têm desconto progressivo habilitado
    const campaignIds = [...new Set(dbPhotos.map((p: any) => p.campaign_id))];
    const { data: campaigns } = await supabaseAdmin
      .from('campaigns')
      .select('id, progressive_discount_enabled')
      .in('id', campaignIds);

    const allCampaignsHaveDiscount = campaigns?.every((c: any) => c.progressive_discount_enabled !== false) ?? false;

    let serverProgressiveDiscountPercent = 0;
    if (allCampaignsHaveDiscount) {
      if (photoCount >= 5 && photoCount <= 10) serverProgressiveDiscountPercent = 5;
      else if (photoCount >= 11 && photoCount <= 20) serverProgressiveDiscountPercent = 10;
      else if (photoCount > 20) serverProgressiveDiscountPercent = 15;
    }

    const serverProgressiveDiscountAmount = Number((subtotal * serverProgressiveDiscountPercent / 100).toFixed(2));
    const subtotalAfterProgressive = subtotal - serverProgressiveDiscountAmount;

    // Validar cupom SERVER-SIDE (chamar função do banco)
    let serverCouponDiscountAmount = 0;
    let validatedCouponId: string | null = null;
    if (coupon?.coupon_id) {
      const { data: couponValidation } = await supabaseAdmin
        .rpc('validate_coupon', {
          p_code: coupon.code || '',
          p_user_id: buyerId,
          p_purchase_amount: subtotalAfterProgressive,
        });

      if (couponValidation && couponValidation.length > 0 && couponValidation[0].valid) {
        serverCouponDiscountAmount = Number(couponValidation[0].discount_amount) || 0;
        validatedCouponId = couponValidation[0].coupon_id;
        console.log('✅ Cupom validado server-side:', { id: validatedCouponId, discount: serverCouponDiscountAmount });
      } else {
        console.warn('⚠️ Cupom inválido server-side, ignorando:', coupon.coupon_id);
      }
    }

    const totalDiscount = serverProgressiveDiscountAmount + serverCouponDiscountAmount;
    const finalTotal = Math.max(subtotal - totalDiscount, 0);

    // SEGURANÇA: Compra gratuita SÓ é permitida com cupom válido
    if (finalTotal <= 0 && !validatedCouponId) {
      console.error('🚨 BLOQUEADO: Tentativa de compra gratuita sem cupom válido!', { subtotal, totalDiscount, buyerId });
      return errorResponse('Compra gratuita requer cupom válido. Valor mínimo: R$ 1,00', 400);
    }

    console.log('💰 Valores (server-validated):', { 
      subtotal, 
      serverProgressiveDiscountPercent,
      serverProgressiveDiscountAmount, 
      serverCouponDiscountAmount,
      totalDiscount,
      finalTotal,
      validatedCouponId
    });

    // ===== CRIAR REGISTROS DE PURCHASE =====
    const purchaseIds: string[] = [];
    const discountFactor = subtotal > 0 ? finalTotal / subtotal : 1;

    console.log('📊 Fator de desconto:', { discountFactor, subtotal, finalTotal });

    // Gerar idempotency key ANTES de criar purchases (hash completo para evitar colisões)
    const photoIdsSorted = photos.map((p: any) => p.id).sort().join(',');
    const idempotencyBase = `${action}|${buyerId}|${photoIdsSorted}|${Number(finalTotal).toFixed(2)}`;
    const idempotencyKey = await createIdempotencyKey(idempotencyBase);
    
    console.log('🔑 Idempotency key:', idempotencyKey);

    // ===== VERIFICAR PAGAMENTO DUPLICADO =====
    // Buscar purchases recentes (últimos 2 minutos) do mesmo buyer com as mesmas fotos
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    
    const { data: recentPurchases } = await supabaseAdmin
      .from('purchases')
      .select('id, status, photo_id, stripe_payment_intent_id')
      .eq('buyer_id', buyerId)
      .in('photo_id', photoIds)
      .gte('created_at', twoMinutesAgo)
      .in('status', ['pending', 'completed']);

    if (recentPurchases && recentPurchases.length >= photoIds.length) {
      console.warn('⚠️ Possível pagamento duplicado detectado! Purchases recentes:', recentPurchases.length);
      
      // Verificar se TODAS as fotos já têm purchase recente
      const existingPhotoIds = new Set(recentPurchases.map(p => p.photo_id));
      const allPhotosHavePurchase = photoIds.every((id: string) => existingPhotoIds.has(id));
      
      if (allPhotosHavePurchase) {
        const existingIds = recentPurchases.map(p => p.id);
        const existingRef = recentPurchases[0]?.stripe_payment_intent_id;
        
        // Se já tem um payment_id associado (mp:XXXXX), extrair e retornar
        if (existingRef && existingRef.includes('mp:')) {
          const mpId = existingRef.split('mp:')[1];
          console.log('🔄 Retornando pagamento existente:', mpId);
          
          if (action === 'create_card') {
            return new Response(JSON.stringify({
              success: false,
              error: 'Este pagamento já foi processado. Verifique suas compras.',
              status: 'duplicate',
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          if (action === 'create_pix') {
            return new Response(JSON.stringify({
              success: false,
              error: 'Um PIX já foi gerado para estas fotos. Verifique o código PIX anterior ou aguarde 2 minutos.',
              status: 'duplicate',
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }
        
        // Se purchases existem mas sem payment_id, são de uma tentativa anterior que não completou
        // Reusar essas purchases em vez de criar novas
        console.log('♻️ Reusando purchases existentes:', existingIds);
        
        const externalReference = existingIds.length === 1
          ? existingIds[0]
          : `batch_${existingIds[0].slice(0, 8)}_${existingIds.length}_${Date.now().toString(36)}`;
        
        await supabaseAdmin
          .from('purchases')
          .update({ stripe_payment_intent_id: externalReference })
          .in('id', existingIds);

        // Pular criação de novas purchases e ir direto para o pagamento
        return await processPayment(action, externalReference, existingIds, finalTotal, photos, buyer, cleanCpf, deviceId, mpAccessToken, supabaseUrl, corsHeaders, cardToken, cardPaymentMethodId, cardIssuerId, installments, idempotencyKey);
      }
    }

    for (const photo of photos) {
      const dbPhoto = dbPhotoMap.get(photo.id);
      if (!dbPhoto) {
        console.warn('⚠️ Foto não encontrada no mapa:', photo.id);
        continue;
      }

      const { data: photoData } = await supabaseAdmin
        .from('photos')
        .select('photographer_id')
        .eq('id', photo.id)
        .single();

      if (!photoData) {
        console.warn('⚠️ Foto não encontrada:', photo.id);
        continue;
      }

      // Calcular valor proporcional com desconto (usando preço do BANCO, não do frontend)
      const originalPrice = Number(dbPhoto.price) || 0;
      const discountedAmount = Number((originalPrice * discountFactor).toFixed(2));
      const photoDiscountAmount = Number((originalPrice - discountedAmount).toFixed(2));

      const { data: purchase, error: purchaseError } = await supabaseAdmin
        .from('purchases')
        .insert({
          photo_id: photo.id,
          buyer_id: buyerId,
          photographer_id: photoData.photographer_id,
          amount: discountedAmount,
          status: 'pending',
          progressive_discount_percentage: serverProgressiveDiscountPercent,
          progressive_discount_amount: photoDiscountAmount,
        })
        .select()
        .single();

      if (purchaseError) {
        console.error('❌ Erro ao criar purchase:', purchaseError);
        continue;
      }

      purchaseIds.push(purchase.id);
      console.log(`💰 Purchase criada: foto ${photo.id} | original: R$${originalPrice} → final: R$${discountedAmount} (desconto: R$${photoDiscountAmount})`);
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

    // ===== COMPRA GRATUITA (finalTotal <= 0) =====
    // SEGURANÇA: Já validado acima que free purchase requer cupom válido
    if (finalTotal <= 0 && validatedCouponId) {
      console.log('🎁 Compra gratuita com cupom válido! Marcando purchases como completed...');

      // Marcar todas as purchases como completed
      await supabaseAdmin
        .from('purchases')
        .update({ status: 'completed' })
        .in('id', purchaseIds);

      // Registrar uso do cupom
      await supabaseAdmin.from('coupon_uses').insert({
        coupon_id: validatedCouponId,
        user_id: buyerId,
        original_amount: subtotal,
        discount_amount: serverCouponDiscountAmount,
        final_amount: 0,
      });
      console.log('🎟️ Uso de cupom registrado:', validatedCouponId);

      return new Response(JSON.stringify({
        success: true,
        status: 'approved',
        statusDetail: 'free_purchase',
        purchaseIds,
        paymentId: null,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return await processPayment(action, externalReference, purchaseIds, finalTotal, photos, buyer, cleanCpf, deviceId, mpAccessToken, supabaseUrl, corsHeaders, cardToken, cardPaymentMethodId, cardIssuerId, installments, idempotencyKey);


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

async function processPayment(
  action: string, externalReference: string, purchaseIds: string[],
  finalTotal: number, photos: any[], buyer: any, cleanCpf: string,
  deviceId: string, mpAccessToken: string, supabaseUrl: string,
  corsHeaders: Record<string, string>, cardToken?: string,
  cardPaymentMethodId?: string, cardIssuerId?: string,
  installments?: number, idempotencyKey?: string,
) {
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

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
        identification: { type: 'CPF', number: cleanCpf },
      },
      external_reference: externalReference,
      notification_url: `${supabaseUrl}/functions/v1/mercadopago-webhook`,
    };

    const mpHeaders: Record<string, string> = {
      'Authorization': `Bearer ${mpAccessToken}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': idempotencyKey || `pix-${externalReference}`,
    };
    if (deviceId) mpHeaders['X-meli-session-id'] = deviceId;

    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST', headers: mpHeaders, body: JSON.stringify(pixPayload),
    });
    const mpResult = await mpResponse.json();

    if (!mpResponse.ok || mpResult.error) {
      await supabaseAdmin.from('purchases').delete().in('id', purchaseIds);

      const mpStatusCode = Number(mpResponse.status || 0);
      const statusDetail = mpResult?.status_detail || null;
      const errorCode = mpResult?.error || null;
      const mpDescription = mpResult?.cause?.[0]?.description
        || mpResult?.message
        || mpResult?.error_description
        || statusDetail;

      const errorMsg = mpDescription || (mpStatusCode >= 500
        ? `Erro temporário no Mercado Pago (${mpStatusCode})`
        : 'Erro ao gerar PIX');

      const retryable = mpStatusCode === 429 || mpStatusCode >= 500;

      console.error('❌ Erro MP PIX:', {
        statusCode: mpStatusCode,
        retryable,
        errorCode,
        statusDetail,
        response: mpResult,
      });

      return new Response(JSON.stringify({
        success: false,
        error: errorMsg,
        status: 'error',
        statusCode: mpStatusCode,
        retryable,
        statusDetail,
        errorCode,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await supabaseAdmin.from('purchases')
      .update({ stripe_payment_intent_id: `${externalReference}|mp:${mpResult.id}` })
      .in('id', purchaseIds);

    const pixInfo = mpResult.point_of_interaction?.transaction_data;
    return new Response(JSON.stringify({
      success: true, paymentId: mpResult.id, purchaseIds,
      pix: pixInfo ? {
        qrCode: pixInfo.qr_code, qrCodeBase64: pixInfo.qr_code_base64,
        expirationDate: mpResult.date_of_expiration,
      } : null,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  if (action === 'create_card') {
    if (!cardToken) return errorResponse('Token do cartão não fornecido', 400);
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
        identification: { type: 'CPF', number: cleanCpf },
      },
      external_reference: externalReference,
      notification_url: `${supabaseUrl}/functions/v1/mercadopago-webhook`,
    };
    if (cardIssuerId) cardPayload.issuer_id = Number(cardIssuerId);

    const mpCardHeaders: Record<string, string> = {
      'Authorization': `Bearer ${mpAccessToken}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': idempotencyKey || `card-${externalReference}`,
    };
    if (deviceId) mpCardHeaders['X-meli-session-id'] = deviceId;

    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST', headers: mpCardHeaders, body: JSON.stringify(cardPayload),
    });
    const mpResult = await mpResponse.json();
    console.log('📦 Resposta MP Cartão:', mpResult.status, mpResult.status_detail);

    if (!mpResponse.ok || mpResult.error) {
      await supabaseAdmin.from('purchases').delete().in('id', purchaseIds);
      const errorMsg = mpResult.cause?.[0]?.description || mpResult.message || 'Erro ao processar cartão';
      return new Response(JSON.stringify({ 
        success: false, error: errorMsg, status: 'error',
        statusDetail: mpResult.status_detail || 'gateway_error'
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    await supabaseAdmin.from('purchases')
      .update({ stripe_payment_intent_id: `${externalReference}|mp:${mpResult.id}` })
      .in('id', purchaseIds);

    if (mpResult.status === 'approved') {
      await supabaseAdmin.from('purchases')
        .update({ status: 'completed' })
        .in('id', purchaseIds);
    }

    return new Response(JSON.stringify({
      success: mpResult.status === 'approved',
      status: mpResult.status, statusDetail: mpResult.status_detail,
      paymentId: mpResult.id, purchaseIds,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  return errorResponse('Ação não reconhecida', 400);
}

async function processApprovedPayment(supabase: any, mpResult: any) {
  const externalRef = mpResult.external_reference;
  if (!externalRef) return;
  console.log('✅ Processando pagamento aprovado:', externalRef);

  const { data: purchases } = await supabase
    .from('purchases').select('id')
    .like('stripe_payment_intent_id', `%${externalRef.split('|')[0]}%`);

  if (!purchases || purchases.length === 0) return;

  const purchaseIds = purchases.map((p: any) => p.id);
  await supabase.from('purchases').update({ status: 'completed' }).in('id', purchaseIds);
}
