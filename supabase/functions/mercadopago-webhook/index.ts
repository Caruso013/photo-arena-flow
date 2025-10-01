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

    // Validar assinatura do webhook
    const xSignature = req.headers.get('x-signature');
    const xRequestId = req.headers.get('x-request-id');
    
    if (!xSignature || !xRequestId) {
      console.error('Missing signature headers');
      return new Response(JSON.stringify({ error: 'Missing signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = await req.json();
    console.log('Webhook received:', JSON.stringify(payload, null, 2));

    // Validar assinatura HMAC
    const dataId = payload.data?.id || '';
    const signatureData = `id:${dataId};request-id:${xRequestId};`;
    
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
      encoder.encode(signatureData)
    );
    
    const expectedSignature = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    const receivedSignature = xSignature.split(',')[0].split('=')[1];
    
    if (expectedSignature !== receivedSignature) {
      console.error('Invalid signature');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Mercado Pago envia notificações com type="payment"
    if (payload.type === 'payment') {
      const paymentId = payload.data?.id;
      
      if (!paymentId) {
        console.error('No payment ID in webhook');
        return new Response(JSON.stringify({ error: 'No payment ID' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`Processing payment ${paymentId}`);

      // Buscar informações do pagamento no Mercado Pago
      const mpAccessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
      const paymentResponse = await fetch(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        {
          headers: {
            'Authorization': `Bearer ${mpAccessToken}`,
          },
        }
      );

      if (!paymentResponse.ok) {
        console.error('Failed to fetch payment from Mercado Pago');
        return new Response(JSON.stringify({ error: 'Failed to fetch payment' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const paymentData = await paymentResponse.json();
      console.log('Payment data:', JSON.stringify(paymentData, null, 2));

      // Extrair informações do pagamento
      const status = paymentData.status; // approved, pending, rejected, etc
      const externalReference = paymentData.external_reference; // ID da purchase
      
      if (!externalReference) {
        console.error('No external reference in payment');
        return new Response(JSON.stringify({ error: 'No external reference' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Atualizar status da purchase no banco
      let purchaseStatus = 'pending';
      if (status === 'approved') {
        purchaseStatus = 'completed';
      } else if (status === 'rejected' || status === 'cancelled') {
        purchaseStatus = 'failed';
      }

      // Suporta múltiplas purchases (separadas por vírgula)
      const purchaseIds = externalReference.split(',');
      
      for (const purchaseId of purchaseIds) {
        const { error: updateError } = await supabase
          .from('purchases')
          .update({
            status: purchaseStatus,
            stripe_payment_intent_id: paymentId.toString(),
          })
          .eq('id', purchaseId.trim());

        if (updateError) {
          console.error(`Error updating purchase ${purchaseId}:`, updateError);
        } else {
          console.log(`Purchase ${purchaseId} updated to ${purchaseStatus}`);
        }
      }

      return new Response(JSON.stringify({ success: true, status: purchaseStatus }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ message: 'Webhook received' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});