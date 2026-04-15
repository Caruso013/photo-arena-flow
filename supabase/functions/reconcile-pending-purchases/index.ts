import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';
import { corsHeaders } from '../_shared/cors.ts';

const BATCH_SIZE = 15; // Process max 15 payments per run to avoid connection exhaustion

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const mpAccessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');

    if (!mpAccessToken) {
      console.error('❌ MERCADO_PAGO_ACCESS_TOKEN não configurado');
      return new Response(JSON.stringify({
        success: false,
        error: 'Sistema de pagamento não configurado'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // ===== VALIDAÇÃO DE ADMIN =====
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ success: false, error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      console.error('❌ JWT validation failed:', claimsError);
      return new Response(JSON.stringify({ success: false, error: 'Token inválido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claimsData.claims.sub;

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (!profile || profile.role !== 'admin') {
      return new Response(JSON.stringify({ success: false, error: 'Apenas administradores podem reconciliar' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ Admin autorizado, iniciando reconciliação em lotes...');

    // ===== BUSCAR PURCHASES PENDENTES (LIMITADO) =====
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    // Limitar a busca para evitar sobrecarga - buscar apenas as mais antigas primeiro
    const { data: pendingPurchases, error: fetchError } = await supabaseAdmin
      .from('purchases')
      .select('id, stripe_payment_intent_id, created_at, amount, status')
      .in('status', ['pending', 'failed'])
      .lt('created_at', tenMinutesAgo)
      .not('stripe_payment_intent_id', 'is', null)
      .order('created_at', { ascending: true })
      .limit(200); // Cap fetch to 200 records max

    if (fetchError) {
      console.error('❌ Erro ao buscar purchases:', fetchError);
      return new Response(JSON.stringify({ success: false, error: 'Erro ao buscar compras pendentes' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`📋 Encontradas ${pendingPurchases?.length || 0} compras pendentes`);

    const results = {
      total: pendingPurchases?.length || 0,
      reconciled: 0,
      skipped: 0,
      failed: 0,
      noPaymentId: 0,
      batchesProcessed: 0,
      totalPayments: 0,
      details: [] as any[],
    };

    if (!pendingPurchases || pendingPurchases.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Nenhuma compra pendente para reconciliar',
        results,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ===== AGRUPAR POR PAYMENT ID =====
    const paymentGroups = new Map<string, typeof pendingPurchases>();

    for (const purchase of pendingPurchases) {
      const paymentRef = purchase.stripe_payment_intent_id;
      if (!paymentRef) {
        results.noPaymentId++;
        continue;
      }

      const mpMatch = paymentRef.match(/\|mp:(\d+)/);
      if (!mpMatch) {
        results.skipped++;
        continue;
      }

      const mpPaymentId = mpMatch[1];
      if (!paymentGroups.has(mpPaymentId)) {
        paymentGroups.set(mpPaymentId, []);
      }
      paymentGroups.get(mpPaymentId)!.push(purchase);
    }

    results.totalPayments = paymentGroups.size;
    console.log(`🔍 Total de ${paymentGroups.size} pagamentos únicos. Processando até ${BATCH_SIZE} por lote.`);

    // ===== PROCESSAR EM LOTES =====
    let processedCount = 0;
    const entries = Array.from(paymentGroups.entries());

    for (const [mpPaymentId, purchases] of entries) {
      if (processedCount >= BATCH_SIZE) {
        console.log(`⏸️ Limite de ${BATCH_SIZE} pagamentos atingido. Restam ${entries.length - processedCount} para próxima execução.`);
        break;
      }

      try {
        const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${mpPaymentId}`, {
          headers: { 'Authorization': `Bearer ${mpAccessToken}` },
        });

        if (!mpResponse.ok) {
          console.warn(`⚠️ MP retornou ${mpResponse.status} para payment ${mpPaymentId}`);
          results.skipped += purchases.length;
          processedCount++;
          // Rate limit
          await new Promise(resolve => setTimeout(resolve, 200));
          continue;
        }

        const mpResult = await mpResponse.json();
        const purchaseIds = purchases.map(p => p.id);

        if (mpResult.status === 'approved') {
          const { error: updateError } = await supabaseAdmin
            .from('purchases')
            .update({ status: 'completed' })
            .in('id', purchaseIds);

          if (updateError) {
            console.error(`❌ Erro ao atualizar purchases:`, updateError);
            results.failed += purchases.length;
          } else {
            console.log(`✅ Reconciliadas ${purchaseIds.length} compras (payment ${mpPaymentId})`);
            results.reconciled += purchases.length;
          }
        } else if (mpResult.status === 'rejected' || mpResult.status === 'cancelled') {
          await supabaseAdmin
            .from('purchases')
            .update({ status: 'failed' })
            .in('id', purchaseIds);
          results.failed += purchases.length;
        } else {
          // pending, in_process, etc - skip
          results.skipped += purchases.length;
        }
      } catch (error: any) {
        console.error(`❌ Erro payment ${mpPaymentId}:`, error.message);
        results.failed += purchases.length;
      }

      processedCount++;
      results.batchesProcessed = processedCount;

      // Rate limiting: 200ms between requests
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    const remaining = Math.max(0, entries.length - processedCount);
    console.log(`✅ Lote concluído: ${results.reconciled} liberadas, ${results.skipped} puladas, ${results.failed} falharam. Restam: ${remaining}`);

    return new Response(JSON.stringify({
      success: true,
      message: `Reconciliação: ${results.reconciled} liberadas, ${remaining} pendentes para próximo lote`,
      results: { ...results, remaining },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ Erro geral na reconciliação:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Erro interno',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
