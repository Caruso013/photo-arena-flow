import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/**
 * Webhook do Mercado Pago - Otimizado para minimizar conexões DB
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

    const paymentId = body.data?.id;
    const action = body.action || body.type;

    if (!paymentId) {
      console.log('⚠️ Webhook sem payment_id, ignorando');
      return new Response('OK', { status: 200 });
    }

    // Log webhook (fire and forget - don't await)
    supabase.from('webhook_logs').insert({
      event_type: action || 'unknown',
      payment_id: String(paymentId),
      request_body: body,
      request_headers: Object.fromEntries(req.headers.entries()),
    }).then(() => {});

    // Buscar detalhes do pagamento no MP
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

    if (payment.status !== 'approved') {
      console.log('⏭️ Pagamento não aprovado:', payment.status);
      return new Response('OK', { status: 200 });
    }

    const externalRef = payment.external_reference;
    if (!externalRef) {
      console.warn('⚠️ Pagamento sem external_reference');
      return new Response('OK', { status: 200 });
    }

    console.log('📋 External reference:', externalRef);

    // Buscar purchases pendentes - single query
    const { data: purchases, error: searchError } = await supabase
      .from('purchases')
      .select('id, status, amount, buyer_id, photo_id, photographer_id')
      .like('stripe_payment_intent_id', `%${externalRef}%`);

    if (searchError || !purchases || purchases.length === 0) {
      console.warn('⚠️ Nenhuma purchase encontrada para:', externalRef);
      return new Response('OK', { status: 200 });
    }

    const pendingPurchases = purchases.filter(p => p.status === 'pending' || p.status === 'failed');

    if (pendingPurchases.length === 0) {
      console.log('✅ Todas purchases já estão completed');
      return new Response('OK', { status: 200 });
    }

    const purchaseIds = pendingPurchases.map(p => p.id);
    console.log(`📝 Atualizando ${purchaseIds.length} purchases para completed`);

    // Update status - single query
    const { error: updateError } = await supabase
      .from('purchases')
      .update({ status: 'completed' })
      .in('id', purchaseIds);

    if (updateError) {
      console.error('❌ Erro ao atualizar purchases:', updateError);
    } else {
      console.log('✅ Purchases atualizadas com sucesso!');
    }

    // Send confirmation email - optimized with fewer queries
    const firstPurchase = pendingPurchases[0];
    if (firstPurchase) {
      try {
        // Single query for buyer
        const { data: buyer } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', firstPurchase.buyer_id)
          .single();

        // Batch query for all photos at once (instead of N queries)
        const photoIds = pendingPurchases.map(p => p.photo_id);
        const { data: photos } = await supabase
          .from('photos')
          .select('id, title, watermarked_url, campaign_id, campaigns(title, photographer_id)')
          .in('id', photoIds);

        let campaignTitle = '';
        const photosData: any[] = [];

        // Get unique photographer IDs for batch lookup
        const photographerIds = new Set<string>();
        if (photos) {
          for (const photo of photos) {
            const campaign = photo.campaigns as any;
            if (campaign?.photographer_id) {
              photographerIds.add(campaign.photographer_id);
            }
            if (!campaignTitle && campaign?.title) {
              campaignTitle = campaign.title;
            }
          }
        }

        // Single query for all photographers
        let photographerMap: Record<string, string> = {};
        if (photographerIds.size > 0) {
          const { data: photographers } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', Array.from(photographerIds));
          if (photographers) {
            photographerMap = Object.fromEntries(
              photographers.map(p => [p.id, p.full_name || ''])
            );
          }
        }

        // Build photo data without additional queries
        if (photos) {
          for (const photo of photos) {
            const campaign = photo.campaigns as any;
            const purchase = pendingPurchases.find(p => p.photo_id === photo.id);
            photosData.push({
              id: photo.id,
              title: photo.title || 'Foto do evento',
              thumbnail_url: photo.watermarked_url,
              price: Number(purchase?.amount || 0),
              photographer_name: campaign?.photographer_id ? (photographerMap[campaign.photographer_id] || '') : '',
            });
          }
        }

        const totalAmount = pendingPurchases.reduce((sum, p) => sum + Number(p.amount), 0);

        if (buyer?.email) {
          console.log('📧 Enviando email para:', buyer.email, 'com', photosData.length, 'fotos');

          // Fire and forget - don't block webhook response
          fetch(`${supabaseUrl}/functions/v1/send-purchase-confirmation-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              buyerEmail: buyer.email,
              buyerName: buyer.full_name,
              photos: photosData,
              campaignTitle,
              amount: totalAmount,
              photographerName: photosData[0]?.photographer_name || '',
            }),
          }).catch(err => console.warn('⚠️ Erro email (não crítico):', err.message));
        }
      } catch (emailError: any) {
        console.warn('⚠️ Erro ao preparar email (não crítico):', emailError.message);
      }
    }

    return new Response('OK', { status: 200 });

  } catch (error) {
    console.error('❌ Erro no webhook:', error);
    return new Response('OK', { status: 200 });
  }
});
