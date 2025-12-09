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
  const dataId = url.searchParams.get('data.id') || '';

  // Ler o body uma única vez
  const rawBody = await req.text();
  let payload: any = {};
  try {
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    console.warn('Body não é JSON válido');
  }

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
        payment_id: paymentId || dataId || payload?.data?.id?.toString() || null,
        merchant_order_id: merchantOrderId || null,
        signature_valid: signatureValid,
        ip_address: ipAddress,
        user_agent: userAgent,
        request_headers: {
          'x-signature': xSignature ? xSignature.substring(0, 50) + '...' : null,
          'x-request-id': xRequestId
        },
        request_body: {
          topic: payload?.topic,
          type: payload?.type,
          action: payload?.action,
          data_id: dataId
        },
        response_status: responseStatus,
        error_message: errorMessage || null
      });
    } catch (logError) {
      console.error('Erro ao registrar log de webhook:', logError);
    }
  };

  try {
    console.log('=== Webhook Mercado Pago Recebido ===');
    console.log('Headers:', { xSignature: xSignature ? 'present' : 'missing', xRequestId });
    console.log('Query params:', { dataId });
    console.log('IP:', ipAddress);

    // Validar assinatura - OBRIGATÓRIO em produção
    let signatureValid = false;
    const isProduction = mpAccessToken && !mpAccessToken.startsWith('TEST-');
    
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
          // Verificar timestamp não muito antigo (máximo 5 minutos)
          const timestampSeconds = parseInt(ts, 10);
          const nowSeconds = Math.floor(Date.now() / 1000);
          const timeDiff = Math.abs(nowSeconds - timestampSeconds);
          
          if (timeDiff > 300) { // 5 minutos
            console.error('❌ Timestamp muito antigo:', { timeDiff, ts });
            await logWebhook('signature_expired', false, 401, `Timestamp expired: ${timeDiff}s old`);
            return new Response(JSON.stringify({ error: 'Signature timestamp expired' }), {
              status: 401,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
          
          // Criar o manifest conforme documentação
          const dataIdLower = isNaN(Number(dataId)) ? dataId.toLowerCase() : dataId;
          const manifest = `id:${dataIdLower};request-id:${xRequestId};ts:${ts};`;
          
          console.log('Validando assinatura...');

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

          if (calculatedHash === hash) {
            signatureValid = true;
            console.log('✅ Assinatura válida!');
          } else {
            console.error('❌ Assinatura inválida!');
            await logWebhook('signature_invalid', false, 401, 'Hash mismatch');
          }
        } else {
          console.error('❌ Formato de assinatura inválido');
          await logWebhook('signature_malformed', false, 401, 'Missing ts or v1 in signature');
        }
      } catch (e) {
        console.error('❌ Erro ao validar assinatura:', e);
        await logWebhook('signature_error', false, 500, e.message);
      }
    } else {
      console.warn('⚠️ Dados insuficientes para validar assinatura');
      if (isProduction && xSignature) {
        await logWebhook('signature_incomplete', false, 401, 'Missing required signature data');
      }
    }
    
    // SEGURANÇA: Em produção, rejeitar webhooks com assinatura inválida
    if (isProduction && !signatureValid && xSignature) {
      console.error('🚫 REJEITANDO webhook com assinatura inválida em produção');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Helper: Atualizar purchases no banco
    const updatePurchases = async (externalReference: string, status: string, paymentIdForLog?: string) => {
      let purchaseStatus = 'pending';
      if (status === 'approved' || status === 'paid') purchaseStatus = 'completed';
      else if (status === 'rejected' || status === 'cancelled' || status === 'expired') purchaseStatus = 'failed';

      const purchaseIds = externalReference.split(',').map(id => id.trim()).filter(Boolean);
      
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

    // Helper: Enviar email de confirmação
    const sendConfirmationEmail = async (purchaseIds: string[]) => {
      console.log('📧 Enviando email de confirmação...');
      try {
        const purchaseIdsParam = purchaseIds.join(',');
        const emailResp = await fetch(`${supabaseUrl}/functions/v1/send-purchase-confirmation`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
            'Authorization': `Bearer ${supabaseServiceKey}` 
          },
          body: JSON.stringify({ 
            purchaseIds,
            redirectUrl: `https://stafotos.com/dashboard/purchases?purchase_ids=${purchaseIdsParam}`
          }),
        });
        
        if (!emailResp.ok) {
          console.error('❌ Falha ao enviar email:', await emailResp.text());
        } else {
          console.log('✅ Email enviado com sucesso');
        }
      } catch (err) {
        console.error('❌ Erro ao chamar função de email:', err);
      }
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
      await logWebhook(`payment_${paymentData.status}`, signatureValid, 200, null, paymentId);
      
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
        await logWebhook('merchant_order_fetch_error', signatureValid, 500, errText, null, merchantOrderId);
        return new Response(JSON.stringify({ error: 'Failed to fetch merchant order' }), { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }
      
      const mo = await moRes.json();
      console.log('📦 Merchant order status:', mo.order_status);

      const externalReference: string | undefined = mo.external_reference;
      const approvedPayment = (mo.payments || []).find((p: any) => p.status === 'approved');
      const anyRejected = (mo.payments || []).some((p: any) => 
        p.status === 'rejected' || p.status === 'cancelled' || p.status === 'expired'
      );

      if (!externalReference) {
        console.error('❌ Merchant order sem external_reference');
        await logWebhook('merchant_order_no_reference', signatureValid, 400, 'No external reference', null, merchantOrderId);
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
      await logWebhook(`merchant_order_${statusForRef}`, signatureValid, 200, null, approvedPayment?.id?.toString(), merchantOrderId);
      
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
    
    // Obter IDs de payment ou merchant_order
    const paymentIdFromPayload = dataId || payload?.data?.id || (resource?.match(/payments\/(\d+)/)?.[1]);
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

    // Evento não reconhecido
    console.log('⚠️ Evento não reconhecido, retornando 200');
    await logWebhook('unknown_event', signatureValid, 200, 'Unrecognized event type');
    return new Response(JSON.stringify({ message: 'Webhook received' }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('❌ Erro no webhook:', error);
    await logWebhook('error', false, 500, error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});