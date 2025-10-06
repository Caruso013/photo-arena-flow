import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const webhookSecret = Deno.env.get('MERCADO_PAGO_WEBHOOK_SECRET')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Tentar validar assinatura do webhook (não bloquear em caso de falha)
    const xSignature = req.headers.get('x-signature');
    const xRequestId = req.headers.get('x-request-id') || '';

    const rawBody = await req.text();
    let payload: any = {};
    try {
      payload = JSON.parse(rawBody || '{}');
    } catch (_) {
      console.warn('Webhook body is not valid JSON');
    }

    console.log('Webhook headers:', { xSignature, xRequestId });
    console.log('Webhook received:', rawBody);

    let signatureValid = false;
    try {
      if (xSignature && xRequestId && webhookSecret) {
        const dataId = payload?.data?.id || '';
        // Formato documentado pelo MP para v1: "id:<id>;request-id:<x-request-id>;"
        const signatureDataV1 = `id:${dataId};request-id:${xRequestId};`;
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
          'raw',
          encoder.encode(webhookSecret),
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign']
        );
        const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(signatureDataV1));
        const expectedHex = Array.from(new Uint8Array(signature))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');

        // O header do MP pode vir em diferentes formatos. Tentar extrair sha256/v1/signature
        const parts = xSignature.split(',').map(p => p.trim());
        const found = parts.find(p => p.startsWith('sha256=') || p.startsWith('v1=') || p.startsWith('signature='));
        const received = found ? found.split('=')[1] : undefined;
        if (received && received.toLowerCase() === expectedHex.toLowerCase()) {
          signatureValid = true;
        }
      }
    } catch (e) {
      console.warn('Signature validation error (continuing):', e);
    }

    if (!signatureValid) {
      console.warn('Signature not validated. Proceeding by verifying with Mercado Pago API.');
    }

    // Detectar tipo de evento (payment ou merchant_order)
    const topic = payload?.topic || payload?.type || (payload?.action?.includes('payment') ? 'payment' : undefined);
    const resource: string | undefined = payload?.resource;

    const mpAccessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
    if (!mpAccessToken) {
      console.error('MERCADO_PAGO_ACCESS_TOKEN not set');
      return new Response(JSON.stringify({ error: 'Missing MP access token' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Helpers
    const updatePurchases = async (externalReference: string, status: string, paymentIdForLog?: string) => {
      let purchaseStatus = 'pending';
      if (status === 'approved' || status === 'paid') purchaseStatus = 'completed';
      else if (status === 'rejected' || status === 'cancelled' || status === 'expired') purchaseStatus = 'failed';

      const purchaseIds = externalReference.split(',').map((id: string) => id.trim()).filter(Boolean);
      for (const pid of purchaseIds) {
        const { error: updateError } = await supabase
          .from('purchases')
          .update({ status: purchaseStatus, stripe_payment_intent_id: paymentIdForLog?.toString() })
          .eq('id', pid);
        if (updateError) console.error(`Erro ao atualizar purchase ${pid}:`, updateError);
        else console.log(`Purchase ${pid} -> ${purchaseStatus}`);
      }
      // E-mail somente quando concluído
      if (purchaseStatus === 'completed') {
        try {
          const emailResp = await fetch(`${supabaseUrl}/functions/v1/send-purchase-confirmation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseServiceKey}` },
            body: JSON.stringify({ purchaseIds: externalReference.split(',') }),
          });
          if (!emailResp.ok) console.error('Falha ao enviar email:', await emailResp.text());
        } catch (err) {
          console.error('Erro ao chamar função de e-mail:', err);
        }
      }
      return purchaseStatus;
    };

    const processPayment = async (paymentId: string) => {
      console.log(`Processando payment ${paymentId}`);
      const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { 'Authorization': `Bearer ${mpAccessToken}` },
      });
      if (!paymentRes.ok) {
        console.error('Falha ao buscar payment no MP:', await paymentRes.text());
        return new Response(JSON.stringify({ error: 'Failed to fetch payment' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const paymentData = await paymentRes.json();
      console.log('Payment data:', JSON.stringify(paymentData));
      const externalReference = paymentData.external_reference as string | undefined;
      if (!externalReference) {
        console.error('Payment sem external_reference');
        return new Response(JSON.stringify({ error: 'No external reference' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const finalStatus = await updatePurchases(externalReference, paymentData.status, paymentId);
      return new Response(JSON.stringify({ success: true, status: finalStatus }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    };

    const processMerchantOrder = async (merchantOrderId: string) => {
      console.log(`Processando merchant_order ${merchantOrderId}`);
      const moRes = await fetch(`https://api.mercadopago.com/merchant_orders/${merchantOrderId}`, {
        headers: { 'Authorization': `Bearer ${mpAccessToken}` },
      });
      if (!moRes.ok) {
        console.error('Falha ao buscar merchant_order:', await moRes.text());
        return new Response(JSON.stringify({ error: 'Failed to fetch merchant order' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const mo = await moRes.json();
      console.log('Merchant order:', JSON.stringify(mo));

      const externalReference: string | undefined = mo.external_reference;
      const approvedPayment = (mo.payments || []).find((p: any) => p.status === 'approved');
      const anyRejected = (mo.payments || []).some((p: any) => p.status === 'rejected' || p.status === 'cancelled' || p.status === 'expired');

      if (!externalReference) {
        console.error('Merchant order sem external_reference');
        return new Response(JSON.stringify({ error: 'No external reference' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      let statusForRef = 'pending';
      if (approvedPayment) statusForRef = 'approved';
      else if (anyRejected) statusForRef = 'rejected';

      const finalStatus = await updatePurchases(externalReference, statusForRef, approvedPayment?.id?.toString());
      return new Response(JSON.stringify({ success: true, status: finalStatus }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    };

    // Identificar o ID a partir do payload ou resource
    const paymentIdFromPayload = payload?.data?.id || (resource?.match(/payments\/(\d+)/)?.[1]);
    const merchantOrderIdFromResource = resource?.match(/merchant_orders\/(\d+)/)?.[1];

    if ((topic === 'payment' || payload?.action?.includes('payment')) && paymentIdFromPayload) {
      return await processPayment(paymentIdFromPayload.toString());
    }

    if ((topic === 'merchant_order' || resource?.includes('merchant_orders')) && merchantOrderIdFromResource) {
      return await processMerchantOrder(merchantOrderIdFromResource.toString());
    }

    // Última tentativa: se só temos paymentId, processar por payment
    if (paymentIdFromPayload) {
      return await processPayment(paymentIdFromPayload.toString());
    }

    console.log('Evento não reconhecido, retornando 200 para evitar retries');
    return new Response(JSON.stringify({ message: 'Webhook received' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});