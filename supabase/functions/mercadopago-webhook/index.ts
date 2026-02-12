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

    // Buscar purchases que correspondem com detalhes completos
    // Usar apenas LIKE para evitar crash quando externalRef não é UUID válido (ex: batch_xxx)
    const { data: purchases, error: searchError } = await supabase
      .from('purchases')
      .select(`
        id, 
        status, 
        amount,
        buyer_id,
        photo_id,
        photographer_id
      `)
      .like('stripe_payment_intent_id', `%${externalRef}%`);

    if (searchError || !purchases || purchases.length === 0) {
      console.warn('⚠️ Nenhuma purchase encontrada para:', externalRef);
      return new Response('OK', { status: 200 });
    }

    // Filtrar purchases que ainda não foram completadas (pending ou failed)
    const pendingPurchases = purchases.filter(p => p.status === 'pending' || p.status === 'failed');
    
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

    // Buscar detalhes do comprador e TODAS as fotos para enviar email completo
    const firstPurchase = pendingPurchases[0];
    if (firstPurchase) {
      try {
        // Buscar dados do comprador
        const { data: buyer } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', firstPurchase.buyer_id)
          .single();

        // Buscar dados de TODAS as fotos compradas
        const photosData = [];
        let campaignTitle = '';
        
        for (const purchase of pendingPurchases) {
          const { data: photo } = await supabase
            .from('photos')
            .select('id, title, watermarked_url, campaign_id, campaigns(title, photographer_id)')
            .eq('id', purchase.photo_id)
            .single();

          if (photo) {
            let photographerName = '';
            const campaign = photo.campaigns as any;
            
            if (campaign?.photographer_id) {
              const { data: photographer } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', campaign.photographer_id)
                .single();
              photographerName = photographer?.full_name || '';
            }
            
            // Usar o primeiro título de campanha encontrado
            if (!campaignTitle && campaign?.title) {
              campaignTitle = campaign.title;
            }

            photosData.push({
              id: photo.id,
              title: photo.title || 'Foto do evento',
              thumbnail_url: photo.watermarked_url,
              price: Number(purchase.amount),
              photographer_name: photographerName
            });
          }
        }

        // Calcular valor total
        const totalAmount = pendingPurchases.reduce((sum, p) => sum + Number(p.amount), 0);

        if (buyer?.email) {
          console.log('📧 Enviando email de confirmação para:', buyer.email, 'com', photosData.length, 'fotos');
          
          await fetch(`${supabaseUrl}/functions/v1/send-purchase-confirmation-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              buyerEmail: buyer.email,
              buyerName: buyer.full_name,
              photos: photosData,
              campaignTitle: campaignTitle,
              amount: totalAmount,
              photographerName: photosData[0]?.photographer_name || '',
            }),
          });
          
          console.log('✅ Email de confirmação enviado com', photosData.length, 'fotos!');
        }
      } catch (emailError) {
        console.warn('⚠️ Erro ao enviar email (não crítico):', emailError);
      }
    }

    return new Response('OK', { status: 200 });

  } catch (error) {
    console.error('❌ Erro no webhook:', error);
    return new Response('OK', { status: 200 }); // Sempre retorna 200 para MP não retentar
  }
});
