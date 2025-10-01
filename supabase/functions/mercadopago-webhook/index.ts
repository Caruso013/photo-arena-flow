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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload = await req.json();
    console.log('Webhook received:', JSON.stringify(payload, null, 2));

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

      const { error: updateError } = await supabase
        .from('purchases')
        .update({
          status: purchaseStatus,
          stripe_payment_intent_id: paymentId.toString(), // Reutilizando campo para armazenar payment_id do MP
        })
        .eq('id', externalReference);

      if (updateError) {
        console.error('Error updating purchase:', updateError);
        return new Response(JSON.stringify({ error: 'Failed to update purchase' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`Purchase ${externalReference} updated to ${purchaseStatus}`);

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