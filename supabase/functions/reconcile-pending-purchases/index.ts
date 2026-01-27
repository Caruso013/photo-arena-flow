import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Edge Function para reconciliar compras pendentes com pagamentos aprovados no Mercado Pago
 * 
 * Lógica:
 * 1. Busca purchases com status='pending' criadas há mais de 10 minutos
 * 2. Extrai o payment_id do Mercado Pago do campo stripe_payment_intent_id
 * 3. Consulta a API do MP para verificar o status real
 * 4. Se aprovado, atualiza para 'completed' (trigger cria revenue_shares)
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ===== CONFIGURAÇÃO =====
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
      console.error('❌ Authorization header missing or invalid');
      return new Response(JSON.stringify({ success: false, error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Usar getClaims para validar o token
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error('❌ Token inválido:', claimsError);
      return new Response(JSON.stringify({ success: false, error: 'Token inválido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claimsData.claims.sub;
    console.log('🔐 User ID:', userId);

    // Verificar se é admin usando supabaseAdmin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error('❌ Erro ao buscar perfil:', profileError);
      return new Response(JSON.stringify({ success: false, error: 'Perfil não encontrado' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (profile.role !== 'admin') {
      console.error('❌ Usuário não é admin:', profile.role);
      return new Response(JSON.stringify({ success: false, error: 'Apenas administradores podem reconciliar' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log('✅ Admin autorizado, iniciando reconciliação...');

    // ===== BUSCAR PURCHASES PENDENTES =====
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    
    const { data: pendingPurchases, error: fetchError } = await supabaseAdmin
      .from('purchases')
      .select('id, stripe_payment_intent_id, created_at, amount')
      .eq('status', 'pending')
      .lt('created_at', tenMinutesAgo)
      .not('stripe_payment_intent_id', 'is', null);

    if (fetchError) {
      console.error('❌ Erro ao buscar purchases:', fetchError);
      return new Response(JSON.stringify({ success: false, error: 'Erro ao buscar compras pendentes' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`📋 Encontradas ${pendingPurchases?.length || 0} compras pendentes com >10min`);

    const results = {
      total: pendingPurchases?.length || 0,
      reconciled: 0,
      skipped: 0,
      failed: 0,
      noPaymentId: 0,
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

    // ===== PROCESSAR CADA PURCHASE =====
    // Agrupar por external_reference (várias purchases podem ter o mesmo pagamento)
    const paymentGroups = new Map<string, typeof pendingPurchases>();
    
    for (const purchase of pendingPurchases) {
      const paymentRef = purchase.stripe_payment_intent_id;
      if (!paymentRef) {
        results.noPaymentId++;
        continue;
      }

      // Extrair payment_id do MP (formato: "external_ref|mp:12345")
      const mpMatch = paymentRef.match(/\|mp:(\d+)/);
      if (!mpMatch) {
        // Pode ser formato antigo ou sem ID do MP
        results.skipped++;
        results.details.push({
          purchaseId: purchase.id,
          status: 'skipped',
          reason: 'Sem payment_id do MP',
        });
        continue;
      }

      const mpPaymentId = mpMatch[1];
      
      if (!paymentGroups.has(mpPaymentId)) {
        paymentGroups.set(mpPaymentId, []);
      }
      paymentGroups.get(mpPaymentId)!.push(purchase);
    }

    console.log(`🔍 Verificando ${paymentGroups.size} pagamentos únicos no MP...`);

    // Verificar cada pagamento no MP
    for (const [mpPaymentId, purchases] of paymentGroups) {
      try {
        const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${mpPaymentId}`, {
          headers: { 'Authorization': `Bearer ${mpAccessToken}` },
        });

        const mpResult = await mpResponse.json();
        console.log(`📋 MP Payment ${mpPaymentId}: ${mpResult.status}`);

        if (mpResult.status === 'approved') {
          // Atualizar todas as purchases deste pagamento para completed
          const purchaseIds = purchases.map(p => p.id);
          
          const { error: updateError } = await supabaseAdmin
            .from('purchases')
            .update({ status: 'completed' })
            .in('id', purchaseIds);

          if (updateError) {
            console.error(`❌ Erro ao atualizar purchases:`, updateError);
            results.failed += purchases.length;
            results.details.push({
              mpPaymentId,
              purchaseIds,
              status: 'failed',
              reason: updateError.message,
            });
          } else {
            console.log(`✅ Reconciliadas ${purchaseIds.length} compras para pagamento ${mpPaymentId}`);
            results.reconciled += purchases.length;
            results.details.push({
              mpPaymentId,
              purchaseIds,
              status: 'reconciled',
              mpStatus: mpResult.status,
            });
          }
        } else if (mpResult.status === 'pending' || mpResult.status === 'in_process') {
          // Ainda pendente no MP, manter como está
          results.skipped += purchases.length;
          results.details.push({
            mpPaymentId,
            purchaseIds: purchases.map(p => p.id),
            status: 'skipped',
            reason: `Pagamento ainda ${mpResult.status} no MP`,
          });
        } else if (mpResult.status === 'rejected' || mpResult.status === 'cancelled') {
          // Pagamento rejeitado/cancelado - marcar como failed
          const purchaseIds = purchases.map(p => p.id);
          
          await supabaseAdmin
            .from('purchases')
            .update({ status: 'failed' })
            .in('id', purchaseIds);

          results.failed += purchases.length;
          results.details.push({
            mpPaymentId,
            purchaseIds,
            status: 'cancelled',
            reason: `Pagamento ${mpResult.status} no MP`,
          });
        } else {
          results.skipped += purchases.length;
          results.details.push({
            mpPaymentId,
            purchaseIds: purchases.map(p => p.id),
            status: 'skipped',
            reason: `Status desconhecido: ${mpResult.status}`,
          });
        }
      } catch (error: any) {
        console.error(`❌ Erro ao verificar pagamento ${mpPaymentId}:`, error);
        results.failed += purchases.length;
        results.details.push({
          mpPaymentId,
          purchaseIds: purchases.map(p => p.id),
          status: 'error',
          reason: error.message,
        });
      }

      // Rate limiting: esperar 100ms entre requests ao MP
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`✅ Reconciliação concluída: ${results.reconciled} liberadas, ${results.skipped} puladas, ${results.failed} falharam`);

    return new Response(JSON.stringify({
      success: true,
      message: `Reconciliação concluída: ${results.reconciled} compras liberadas`,
      results,
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
