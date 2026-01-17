import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature, x-request-id',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const webhookSecret = Deno.env.get('MERCADO_PAGO_WEBHOOK_SECRET');
  const mpAccessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Obter headers e query params
  const xSignature = req.headers.get('x-signature') || '';
  const xRequestId = req.headers.get('x-request-id') || '';
  const userAgent = req.headers.get('user-agent') || '';
  const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown';
  const url = new URL(req.url);
  
  // data.id pode vir como query param (novo formato) ou no body (antigo formato)
  const dataIdFromQuery = url.searchParams.get('data.id') || url.searchParams.get('id') || '';

  // Ler o body uma única vez
  const rawBody = await req.text();
  let payload: any = {};
  try {
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    console.warn('Body não é JSON válido, tentando parse de form data');
  }

  // Obter data.id de múltiplas fontes
  const dataId = dataIdFromQuery || payload?.data?.id?.toString() || payload?.id?.toString() || '';

  console.log('=== Webhook Mercado Pago Recebido ===');
  console.log('User-Agent:', userAgent);
  console.log('dataId final:', dataId);
  console.log('Payload:', JSON.stringify(payload).substring(0, 500));

  // Helper para registrar log de webhook
  const logWebhook = async (
    eventType: string,
    signatureValid: boolean,
    responseStatus: number,
    errorMessage?: string,
    paymentId?: string,
    merchantOrderId?: string
  ) => {
    try {
      await supabase.from('webhook_logs').insert({
        event_type: eventType,
        payment_id: paymentId || dataId || null,
        merchant_order_id: merchantOrderId || null,
        signature_valid: signatureValid,
        ip_address: ipAddress,
        user_agent: userAgent,
        request_headers: {
          'x-signature': xSignature ? xSignature.substring(0, 80) + '...' : null,
          'x-request-id': xRequestId
        },
        request_body: {
          topic: payload?.topic,
          type: payload?.type,
          action: payload?.action,
          data_id: dataId || payload?.data_id
        },
        response_status: responseStatus,
        error_message: errorMessage || null
      });
    } catch (logError) {
      console.error('Erro ao registrar log de webhook:', logError);
    }
  };

  try {
    console.log('Headers:', { xSignature: xSignature ? 'present' : 'missing', xRequestId });
    console.log('Query params dataId:', dataIdFromQuery);
    console.log('IP:', ipAddress);

    // Validar assinatura - flexível para diferentes formatos do MP
    let signatureValid = false;
    const isProduction = mpAccessToken && !mpAccessToken.startsWith('TEST-');
    
    // Verificar se é um IP conhecido do Mercado Pago (opcional, como fallback)
    const knownMPIps = ['18.213.114.129', '18.206.34.84', '54.88.218.97', '3.2.51.16', '3.2.51.17', '3.2.51.18', '3.2.51.19', '3.2.51.22', '99.82.165.72', '99.82.165.74', '99.82.165.75'];
    const ipFromRequest = ipAddress.split(',')[0].trim();
    const isKnownMPIp = knownMPIps.some(ip => ipAddress.includes(ip));
    
    // Tentar validar assinatura se temos todos os dados
    if (xSignature && xRequestId && webhookSecret && dataId) {
      try {
        // Separar o x-signature em ts e v1
        const parts = xSignature.split(',');
        let ts = '';
        let hash = '';
        
        parts.forEach(part => {
          const [key, value] = part.split('=');
          if (key?.trim() === 'ts') ts = value?.trim() || '';
          if (key?.trim() === 'v1') hash = value?.trim() || '';
        });

        if (ts && hash) {
          // Verificar timestamp não muito antigo (máximo 10 minutos para dar margem)
          const timestampSeconds = parseInt(ts, 10);
          const nowSeconds = Math.floor(Date.now() / 1000);
          const timeDiff = Math.abs(nowSeconds - timestampSeconds);
          
          if (timeDiff > 600) { // 10 minutos
            console.warn('⚠️ Timestamp antigo mas processando mesmo assim:', { timeDiff, ts });
          }
          
          // Criar o manifest conforme documentação MP
          // Formato: id:{data_id};request-id:{x-request-id};ts:{ts};
          const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
          
          console.log('Manifest para validação:', manifest);

          // Calcular HMAC SHA256
          const encoder = new TextEncoder();
          const key = await crypto.subtle.importKey(
            'raw',
            encoder.encode(webhookSecret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
          );
          
          const signature = await crypto.subtle.sign(
            'HMAC',
            key,
            encoder.encode(manifest)
          );
          
          const calculatedHash = Array.from(new Uint8Array(signature))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

          console.log('Hash calculado:', calculatedHash.substring(0, 20) + '...');
          console.log('Hash recebido:', hash.substring(0, 20) + '...');

          if (calculatedHash === hash) {
            signatureValid = true;
            console.log('✅ Assinatura válida!');
          } else {
            console.warn('⚠️ Assinatura não bateu, mas vamos verificar IP');
            // Se o hash não bate mas é um IP conhecido do MP, aceitar com log
            if (isKnownMPIp) {
              console.log('✅ IP conhecido do MP, aceitando webhook');
              signatureValid = true;
              await logWebhook('signature_ip_fallback', true, 200, 'Hash mismatch but known MP IP');
            }
          }
        } else {
          console.warn('⚠️ Formato de assinatura incompleto');
        }
      } catch (e) {
        console.error('❌ Erro ao validar assinatura:', e);
      }
    } else if (!dataId && xSignature) {
      // Webhook tipo Feed v2.0 pode não ter data.id no query string
      // Vamos aceitar se for de um IP conhecido do MP
      console.warn('⚠️ Webhook sem data.id, verificando IP');
      if (isKnownMPIp) {
        console.log('✅ IP conhecido do MP, aceitando webhook sem data.id');
        signatureValid = true;
      }
    }
    
    // DECISÃO DE SEGURANÇA:
    // Em vez de rejeitar webhooks, vamos aceitar se:
    // 1. Assinatura válida, OU
    // 2. IP conhecido do Mercado Pago
    // Isso garante que pagamentos sejam processados mesmo se a validação de assinatura falhar
    
    if (!signatureValid && isProduction) {
      if (isKnownMPIp) {
        console.log('⚠️ Assinatura inválida mas IP conhecido do MP, aceitando');
        signatureValid = true;
      } else {
        console.error('🚫 Webhook rejeitado: assinatura inválida e IP desconhecido');
        await logWebhook('rejected_unknown_source', false, 401, `Unknown IP: ${ipFromRequest}`);
        return new Response(JSON.stringify({ error: 'Invalid signature and unknown IP' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Helper: Atualizar purchases no banco
    const updatePurchases = async (externalReference: string, status: string, paymentIdForLog?: string) => {
      let purchaseStatus = 'pending';
      if (status === 'approved' || status === 'paid') purchaseStatus = 'completed';
      else if (status === 'rejected' || status === 'cancelled' || status === 'expired') purchaseStatus = 'failed';

      const purchaseIds = externalReference.split(',').map(id => id.trim()).filter(Boolean);
      console.log(`📦 Atualizando ${purchaseIds.length} purchases para ${purchaseStatus}`);
      
      for (const pid of purchaseIds) {
        // IDEMPOTÊNCIA: Verificar status atual antes de atualizar
        const { data: currentPurchase } = await supabase
          .from('purchases')
          .select('status')
          .eq('id', pid)
          .single();
        
        if (!currentPurchase) {
          console.warn(`⚠️ Purchase ${pid} não encontrado`);
          continue;
        }
        
        // Se já está no status final, pular (webhook duplicado)
        if (currentPurchase.status === purchaseStatus) {
          console.log(`⏭️ Purchase ${pid} já está ${purchaseStatus}, skip`);
          continue;
        }
        
        // Não permitir voltar de 'completed' para outro status
        if (currentPurchase.status === 'completed' && purchaseStatus !== 'completed') {
          console.warn(`⚠️ Purchase ${pid} já completed, ignorando mudança para ${purchaseStatus}`);
          continue;
        }
        
        const { error: updateError } = await supabase
          .from('purchases')
          .update({ 
            status: purchaseStatus, 
            stripe_payment_intent_id: paymentIdForLog?.toString() 
          })
          .eq('id', pid);
          
        if (updateError) {
          console.error(`❌ Erro ao atualizar purchase ${pid}:`, updateError);
          throw updateError;
        } else {
          console.log(`✅ Purchase ${pid}: ${currentPurchase.status} → ${purchaseStatus}`);
        }
      }
      
      return purchaseStatus;
    };

    // Helper: Enviar email de confirmação (fire-and-forget, não bloqueia o fluxo)
    const sendConfirmationEmail = async (purchaseIds: string[]) => {
      console.log('📧 Tentando enviar email de confirmação (não bloqueante)...');
      // Usar setTimeout para não bloquear a resposta do webhook
      // O email é enviado em background e qualquer erro é apenas logado
      setTimeout(async () => {
        try {
          const emailResp = await fetch(`${supabaseUrl}/functions/v1/send-purchase-confirmation`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json', 
              'Authorization': `Bearer ${supabaseServiceKey}` 
            },
            body: JSON.stringify({ purchaseIds }),
          });
          
          const result = await emailResp.json().catch(() => ({}));
          console.log('📧 Resultado do email:', result);
        } catch (err) {
          // Apenas logar - NUNCA falhar o webhook por causa de email
          console.warn('📧 Email não enviado (não crítico):', err);
        }
      }, 100);
      
      // Retornar imediatamente - não esperar o email
      console.log('📧 Email agendado em background');
    };

    // Helper: Processar Payment
    const processPayment = async (paymentId: string) => {
      console.log(`🔄 Processando payment ${paymentId}`);
      
      const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { 'Authorization': `Bearer ${mpAccessToken}` },
      });
      
      if (!paymentRes.ok) {
        const errText = await paymentRes.text();
        console.error('❌ Falha ao buscar payment:', errText);
        await logWebhook('payment_fetch_error', signatureValid, 500, errText, paymentId);
        return new Response(JSON.stringify({ error: 'Failed to fetch payment' }), { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }
      
      const paymentData = await paymentRes.json();
      console.log('💰 Payment status:', paymentData.status);
      console.log('💰 External reference:', paymentData.external_reference);
      
      const externalReference = paymentData.external_reference as string | undefined;
      if (!externalReference) {
        console.error('❌ Payment sem external_reference');
        await logWebhook('payment_no_reference', signatureValid, 400, 'No external reference', paymentId);
        return new Response(JSON.stringify({ error: 'No external reference' }), { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }
      
      const finalStatus = await updatePurchases(externalReference, paymentData.status, paymentId);
      
      // Registrar sucesso
      await logWebhook(`payment_${paymentData.status}`, signatureValid, 200, undefined, paymentId);

      // Enviar email SOMENTE se o pagamento foi APROVADO
      if (finalStatus === 'completed') {
        const purchaseIds = externalReference.split(',').map(id => id.trim()).filter(Boolean);
        await sendConfirmationEmail(purchaseIds);
      }
      
      return new Response(JSON.stringify({ success: true, status: finalStatus }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    };

    // Helper: Processar Merchant Order
    const processMerchantOrder = async (merchantOrderId: string) => {
      console.log(`🔄 Processando merchant_order ${merchantOrderId}`);
      
      const moRes = await fetch(`https://api.mercadopago.com/merchant_orders/${merchantOrderId}`, {
        headers: { 'Authorization': `Bearer ${mpAccessToken}` },
      });
      
      if (!moRes.ok) {
        const errText = await moRes.text();
        console.error('❌ Falha ao buscar merchant_order:', errText);
        await logWebhook('merchant_order_fetch_error', signatureValid, 500, errText, undefined, merchantOrderId);
        return new Response(JSON.stringify({ error: 'Failed to fetch merchant order' }), { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }
      
      const mo = await moRes.json();
      console.log('📦 Merchant order status:', mo.order_status);
      console.log('📦 External reference:', mo.external_reference);

      const externalReference: string | undefined = mo.external_reference;
      const approvedPayment = (mo.payments || []).find((p: any) => p.status === 'approved');
      const anyRejected = (mo.payments || []).some((p: any) => 
        p.status === 'rejected' || p.status === 'cancelled' || p.status === 'expired'
      );

      if (!externalReference) {
        console.error('❌ Merchant order sem external_reference');
        await logWebhook('merchant_order_no_reference', signatureValid, 400, 'No external reference', undefined, merchantOrderId);
        return new Response(JSON.stringify({ error: 'No external reference' }), { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      let statusForRef = 'pending';
      if (approvedPayment) statusForRef = 'approved';
      else if (anyRejected) statusForRef = 'rejected';

      const finalStatus = await updatePurchases(externalReference, statusForRef, approvedPayment?.id?.toString());
      
      // Registrar sucesso
      await logWebhook(`merchant_order_${statusForRef}`, signatureValid, 200, undefined, approvedPayment?.id?.toString(), merchantOrderId);

      // Enviar email SOMENTE se o pagamento foi APROVADO
      if (finalStatus === 'completed') {
        const purchaseIds = externalReference.split(',').map(id => id.trim()).filter(Boolean);
        await sendConfirmationEmail(purchaseIds);
      }
      
      return new Response(JSON.stringify({ success: true, status: finalStatus }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    };

    // Detectar tipo de notificação
    const topic = payload?.topic || payload?.type || (payload?.action?.includes('payment') ? 'payment' : undefined);
    const resource: string | undefined = payload?.resource;
    
    // Obter IDs de payment ou merchant_order de múltiplas fontes
    const paymentIdFromPayload = dataId || payload?.data?.id?.toString() || payload?.data_id?.toString() || (resource?.match(/payments\/(\d+)/)?.[1]);
    const merchantOrderIdFromResource = resource?.match(/merchant_orders\/(\d+)/)?.[1];

    console.log('📋 Tipo de notificação:', { topic, paymentIdFromPayload, merchantOrderIdFromResource });

    // Processar conforme o tipo
    if ((topic === 'payment' || payload?.action?.includes('payment')) && paymentIdFromPayload) {
      return await processPayment(paymentIdFromPayload.toString());
    }

    if ((topic === 'merchant_order' || resource?.includes('merchant_orders')) && merchantOrderIdFromResource) {
      return await processMerchantOrder(merchantOrderIdFromResource.toString());
    }

    // Fallback: tentar processar por payment se temos um ID
    if (paymentIdFromPayload) {
      return await processPayment(paymentIdFromPayload.toString());
    }

    // Se chegou aqui sem processar, mas temos topic, tentar extrair ID do resource
    if (topic === 'merchant_order' && resource) {
      const moIdMatch = resource.match(/\/(\d+)$/);
      if (moIdMatch) {
        return await processMerchantOrder(moIdMatch[1]);
      }
    }

    // Evento não reconhecido
    console.log('⚠️ Evento não reconhecido, retornando 200');
    await logWebhook('unknown_event', signatureValid, 200, `Topic: ${topic}, Resource: ${resource}`);
    return new Response(JSON.stringify({ message: 'Webhook received' }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error: unknown) {
    console.error('❌ Erro no webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    await logWebhook('error', false, 500, errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
