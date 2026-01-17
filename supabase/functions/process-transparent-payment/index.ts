import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Função para calcular o desconto progressivo (SINCRONIZADO com frontend)
function calculateProgressiveDiscount(quantity: number): number {
  if (quantity >= 10) return 20;
  if (quantity >= 5) return 10;
  if (quantity >= 2) return 5;
  return 0;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const mpAccessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Obter usuário autenticado
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

    const requestBody = await req.json();
    const { 
      action,          // Ação: 'check_pix_status' ou undefined (processar pagamento)
      paymentMethod,   // 'pix' ou 'card'
      paymentId,       // Para verificar status do PIX
      token,           // Token do cartão gerado pelo SDK MP
      paymentMethodId, // Tipo de cartão (visa, mastercard, etc)
      issuerId,        // Banco emissor
      installments,    // Parcelas
      photos,          // Fotos a comprar
      buyerInfo,       // Dados do comprador
      progressiveDiscount, // Desconto aplicado
    } = requestBody;

    // ============ VERIFICAR STATUS DO PIX ============
    if (action === 'check_pix_status' && paymentId) {
      console.log('🔍 Verificando status do PIX:', paymentId);
      
      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${mpAccessToken}`,
        },
      });

      const mpResult = await mpResponse.json();
      
      if (mpResult.status === 'approved') {
        // Atualizar purchases para completed
        const externalReference = mpResult.external_reference;
        if (externalReference) {
          const purchaseIds = externalReference.split(',');
          
          await supabaseAdmin
            .from('purchases')
            .update({ 
              status: 'completed',
              stripe_payment_intent_id: paymentId.toString(),
            })
            .in('id', purchaseIds);

          // Criar revenue_shares
          for (const purchaseId of purchaseIds) {
            await createRevenueShare(supabaseAdmin, purchaseId);
          }

          // Enviar email de confirmação
          try {
            await fetch(`${supabaseUrl}/functions/v1/send-purchase-confirmation`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${supabaseServiceKey}` 
              },
              body: JSON.stringify({ purchaseIds }),
            });
          } catch (e) {
            console.warn('⚠️ Erro ao enviar email:', e);
          }
        }
      }

      return new Response(JSON.stringify({
        success: mpResult.status === 'approved',
        status: mpResult.status,
        status_detail: mpResult.status_detail,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ============ VALIDAÇÕES COMUNS ============
    if (!photos || !Array.isArray(photos) || photos.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Nenhuma foto fornecida' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!buyerInfo || !buyerInfo.email || !buyerInfo.document) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Dados do comprador incompletos' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Buscar usuário por email se não autenticado
    if (!buyerId) {
      const { data: profileData } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', buyerInfo.email.toLowerCase())
        .maybeSingle();
      
      if (profileData) {
        buyerId = profileData.id;
      }
    }

    if (!buyerId) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Usuário não encontrado. Por favor, faça login.' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calcular valores
    let subtotal = photos.reduce((sum: number, p: any) => sum + (Number(p.price) || 0), 0);
    let discountAmount = 0;
    let discountPercentage = 0;
    
    if (progressiveDiscount?.enabled) {
      discountPercentage = progressiveDiscount.percentage;
      discountAmount = progressiveDiscount.amount;
    } else {
      discountPercentage = calculateProgressiveDiscount(photos.length);
      discountAmount = (subtotal * discountPercentage) / 100;
    }
    
    const finalTotal = subtotal - discountAmount;
    
    if (finalTotal < 1) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Valor mínimo para pagamento é R$ 1,00' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Criar registros de purchase ANTES do pagamento
    const purchaseIds: string[] = [];
    
    for (const photo of photos) {
      const { data: photoData, error: photoError } = await supabaseAdmin
        .from('photos')
        .select('*, campaigns(*)')
        .eq('id', photo.id)
        .single();

      if (photoError || !photoData) {
        console.error('❌ Foto não encontrada:', photo.id);
        continue;
      }

      const campaign = photoData.campaigns;
      if (!campaign) {
        console.error('❌ Campanha não encontrada para foto:', photo.id);
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
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Não foi possível criar os registros de compra' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const externalReference = purchaseIds.join(',');

    // ============ PAGAMENTO PIX ============
    if (paymentMethod === 'pix') {
      console.log('🔄 Gerando pagamento PIX...');
      
      const pixPaymentData = {
        transaction_amount: Number(finalTotal.toFixed(2)),
        payment_method_id: 'pix',
        description: photos.length > 1 
          ? `Compra de ${photos.length} fotos - STA Fotos` 
          : `Compra de foto - STA Fotos`,
        payer: {
          email: buyerInfo.email.toLowerCase(),
          first_name: buyerInfo.name,
          last_name: buyerInfo.surname,
          identification: {
            type: 'CPF',
            number: buyerInfo.document.replace(/\D/g, ''),
          },
        },
        external_reference: externalReference,
        notification_url: `${supabaseUrl}/functions/v1/mercadopago-webhook`,
        metadata: {
          purchase_ids: purchaseIds,
          discount_percentage: discountPercentage,
          discount_amount: discountAmount,
        },
      };

      const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mpAccessToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': `pix-${externalReference}`,
        },
        body: JSON.stringify(pixPaymentData),
      });

      const mpResult = await mpResponse.json();
      
      console.log('📦 Resposta MP PIX:', JSON.stringify({
        id: mpResult.id,
        status: mpResult.status,
        point_of_interaction: mpResult.point_of_interaction ? 'present' : 'missing',
      }));

      if (mpResult.error) {
        console.error('❌ Erro MP:', mpResult);
        // Deletar purchases criadas
        await supabaseAdmin.from('purchases').delete().in('id', purchaseIds);
        
        return new Response(JSON.stringify({ 
          success: false, 
          error: mpResult.message || 'Erro ao gerar PIX' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Atualizar purchases com payment_id (usando stripe_payment_intent_id para compatibilidade)
      await supabaseAdmin
        .from('purchases')
        .update({ stripe_payment_intent_id: mpResult.id?.toString() })
        .in('id', purchaseIds);

      // Retornar dados do PIX
      const pixInfo = mpResult.point_of_interaction?.transaction_data;
      
      return new Response(JSON.stringify({
        success: true,
        status: mpResult.status,
        payment_id: mpResult.id,
        purchase_ids: purchaseIds,
        pixData: pixInfo ? {
          qr_code: pixInfo.qr_code,
          qr_code_base64: pixInfo.qr_code_base64,
          expiration_date: mpResult.date_of_expiration,
        } : null,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ============ PAGAMENTO CARTÃO ============
    if (paymentMethod === 'card' || token) {
      if (!token) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Token do cartão não fornecido' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('🔄 Processando pagamento com cartão...');

      const cardPaymentData: any = {
        transaction_amount: Number(finalTotal.toFixed(2)),
        token: token,
        description: photos.length > 1 
          ? `Compra de ${photos.length} fotos - STA Fotos` 
          : `Compra de foto - STA Fotos`,
        installments: Number(installments) || 1,
        payment_method_id: paymentMethodId,
        payer: {
          email: buyerInfo.email.toLowerCase(),
          first_name: buyerInfo.name,
          last_name: buyerInfo.surname,
          identification: {
            type: 'CPF',
            number: buyerInfo.document.replace(/\D/g, ''),
          },
        },
        external_reference: externalReference,
        statement_descriptor: 'STA FOTOS',
        notification_url: `${supabaseUrl}/functions/v1/mercadopago-webhook`,
        metadata: {
          purchase_ids: purchaseIds,
          discount_percentage: discountPercentage,
          discount_amount: discountAmount,
        },
      };

      if (issuerId) {
        cardPaymentData.issuer_id = Number(issuerId);
      }

      const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mpAccessToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': `card-${externalReference}`,
        },
        body: JSON.stringify(cardPaymentData),
      });

      const mpResult = await mpResponse.json();
      
      console.log('📦 Resposta MP Cartão:', JSON.stringify({
        id: mpResult.id,
        status: mpResult.status,
        status_detail: mpResult.status_detail,
      }));

      // Atualizar status das purchases
      let finalStatus = 'pending';
      if (mpResult.status === 'approved') {
        finalStatus = 'completed';
      } else if (mpResult.status === 'rejected') {
        finalStatus = 'failed';
      }

      await supabaseAdmin
        .from('purchases')
        .update({ 
          status: finalStatus,
          stripe_payment_intent_id: mpResult.id?.toString(),
        })
        .in('id', purchaseIds);

      // Se aprovado, criar revenue_shares e enviar email
      if (mpResult.status === 'approved') {
        console.log('✅ Pagamento aprovado! Criando revenue_shares...');
        
        for (const purchaseId of purchaseIds) {
          await createRevenueShare(supabaseAdmin, purchaseId);
        }

        // Enviar email de confirmação
        try {
          await fetch(`${supabaseUrl}/functions/v1/send-purchase-confirmation`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json', 
              'Authorization': `Bearer ${supabaseServiceKey}` 
            },
            body: JSON.stringify({ purchaseIds }),
          });
        } catch (emailError) {
          console.warn('⚠️ Erro ao enviar email:', emailError);
        }
      }

      return new Response(JSON.stringify({
        success: mpResult.status === 'approved',
        status: mpResult.status,
        status_detail: mpResult.status_detail,
        payment_id: mpResult.id,
        purchase_ids: purchaseIds,
        message: getStatusMessage(mpResult.status, mpResult.status_detail),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Método de pagamento não especificado
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Método de pagamento não especificado' 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('❌ Erro:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno';
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Helper: Criar revenue_share para uma purchase
async function createRevenueShare(supabaseAdmin: any, purchaseId: string) {
  const { data: purchase } = await supabaseAdmin
    .from('purchases')
    .select('*, photos(*, campaigns(*))')
    .eq('id', purchaseId)
    .single();

  if (!purchase || !purchase.photos || !purchase.photos.campaigns) {
    console.warn('⚠️ Purchase ou dados relacionados não encontrados:', purchaseId);
    return;
  }

  const campaign = purchase.photos.campaigns;
  const amount = Number(purchase.amount);
  
  // Calcular porcentagens
  let platformPercent = 9;
  let orgPercent = 0;
  let photographerPercent = 91;
  
  if (campaign.organization_id) {
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('admin_percentage')
      .eq('id', campaign.organization_id)
      .single();
    
    if (org) {
      orgPercent = org.admin_percentage || 0;
      photographerPercent = 91 - orgPercent;
    }
  }

  const platformAmount = (amount * platformPercent) / 100;
  const organizationAmount = (amount * orgPercent) / 100;
  const photographerAmount = (amount * photographerPercent) / 100;

  // Verificar se já existe
  const { data: existing } = await supabaseAdmin
    .from('revenue_shares')
    .select('id')
    .eq('purchase_id', purchaseId)
    .maybeSingle();

  if (!existing) {
    await supabaseAdmin
      .from('revenue_shares')
      .insert({
        purchase_id: purchaseId,
        photographer_id: purchase.photographer_id,
        organization_id: campaign.organization_id,
        platform_amount: platformAmount,
        organization_amount: organizationAmount,
        photographer_amount: photographerAmount,
      });
    console.log('✅ Revenue share criado para:', purchaseId);
  }
}

function getStatusMessage(status: string, statusDetail: string): string {
  const messages: Record<string, Record<string, string>> = {
    approved: {
      accredited: 'Pagamento aprovado com sucesso!',
    },
    pending: {
      pending_contingency: 'Pagamento em processamento. Você receberá um email quando for aprovado.',
      pending_review_manual: 'Pagamento em análise. Você receberá um email quando for aprovado.',
    },
    rejected: {
      cc_rejected_bad_filled_card_number: 'Número do cartão incorreto.',
      cc_rejected_bad_filled_date: 'Data de validade incorreta.',
      cc_rejected_bad_filled_other: 'Dados do cartão incorretos.',
      cc_rejected_bad_filled_security_code: 'Código de segurança incorreto.',
      cc_rejected_blacklist: 'Pagamento não autorizado. Use outro cartão.',
      cc_rejected_call_for_authorize: 'Você precisa autorizar o pagamento com sua operadora.',
      cc_rejected_card_disabled: 'Cartão desabilitado. Entre em contato com sua operadora.',
      cc_rejected_card_error: 'Erro no cartão. Tente novamente ou use outro cartão.',
      cc_rejected_duplicated_payment: 'Você já fez um pagamento com esse valor recentemente.',
      cc_rejected_high_risk: 'Pagamento recusado por segurança. Use outro cartão.',
      cc_rejected_insufficient_amount: 'Saldo insuficiente.',
      cc_rejected_invalid_installments: 'Quantidade de parcelas inválida.',
      cc_rejected_max_attempts: 'Limite de tentativas excedido. Tente novamente mais tarde.',
      cc_rejected_other_reason: 'Pagamento não processado. Tente novamente.',
    },
  };

  return messages[status]?.[statusDetail] || 
    (status === 'approved' ? 'Pagamento aprovado!' : 
     status === 'pending' ? 'Pagamento em processamento.' :
     'Pagamento não aprovado. Tente novamente.');
}
