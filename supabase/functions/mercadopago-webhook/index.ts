import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Webhook do Mercado Pago para receber notificações de pagamento
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const mpAccessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json();
    console.log('📥 Webhook recebido:', JSON.stringify(body));

    // Mercado Pago envia: { action: 'payment.updated', data: { id: 'payment_id' } }
    const paymentId = body.data?.id;
    const action = body.action || body.type;

    if (!paymentId) {
      console.log('⚠️ Webhook sem payment_id, ignorando');
      return new Response('OK', { status: 200 });
    }

    // Logar webhook
    await supabase.from('webhook_logs').insert({
      event_type: action || 'unknown',
      payment_id: String(paymentId),
      request_body: body,
      request_headers: Object.fromEntries(req.headers.entries()),
    });

    // Buscar detalhes do pagamento no Mercado Pago
    console.log('🔍 Buscando pagamento:', paymentId);
    
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${mpAccessToken}` },
    });

    if (!mpResponse.ok) {
      console.error('❌ Erro ao buscar pagamento no MP:', mpResponse.status);
      return new Response('OK', { status: 200 });
    }

    const payment = await mpResponse.json();
    console.log('💰 Status do pagamento:', payment.status, payment.status_detail);

    // Processar apenas pagamentos aprovados
    if (payment.status !== 'approved') {
      console.log('⏭️ Pagamento não aprovado, ignorando:', payment.status);
      return new Response('OK', { status: 200 });
    }

    // Buscar purchases pelo external_reference
    const externalRef = payment.external_reference;
    if (!externalRef) {
      console.warn('⚠️ Pagamento sem external_reference');
      return new Response('OK', { status: 200 });
    }

    console.log('📋 External reference:', externalRef);

    // Buscar purchases que correspondem
    const { data: purchases, error: searchError } = await supabase
      .from('purchases')
      .select('id, status')
      .or(`stripe_payment_intent_id.like.%${externalRef}%,id.eq.${externalRef}`);

    if (searchError || !purchases || purchases.length === 0) {
      console.warn('⚠️ Nenhuma purchase encontrada para:', externalRef);
      return new Response('OK', { status: 200 });
    }

    // Filtrar apenas pending
    const pendingPurchases = purchases.filter(p => p.status !== 'completed');
    
    if (pendingPurchases.length === 0) {
      console.log('✅ Todas purchases já estão completed');
      return new Response('OK', { status: 200 });
    }

    const purchaseIds = pendingPurchases.map(p => p.id);
    console.log(`📝 Atualizando ${purchaseIds.length} purchases para completed`);

    // Atualizar status para completed
    const { error: updateError } = await supabase
      .from('purchases')
      .update({ status: 'completed' })
      .in('id', purchaseIds);

    if (updateError) {
      console.error('❌ Erro ao atualizar purchases:', updateError);
    } else {
      console.log('✅ Purchases atualizadas com sucesso!');
    }

    // Atualizar log do webhook
    await supabase
      .from('webhook_logs')
      .update({
        processed_at: new Date().toISOString(),
        response_status: 200,
      })
      .eq('payment_id', String(paymentId))
      .order('created_at', { ascending: false })
      .limit(1);

    // Tentar enviar email de confirmação
    try {
      await fetch(`${supabaseUrl}/functions/v1/send-purchase-confirmation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ purchaseIds }),
      });
    } catch (emailError) {
      console.warn('⚠️ Erro ao enviar email:', emailError);
    }

    return new Response('OK', { status: 200 });

  } catch (error) {
    console.error('❌ Erro no webhook:', error);
    return new Response('OK', { status: 200 }); // Sempre retorna 200 para MP não retentar
  }
});
