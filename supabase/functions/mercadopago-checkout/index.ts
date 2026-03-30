import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-connection-pool, x-supabase-api-version',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
};

/**
 * Edge Function para processar pagamentos via Mercado Pago
 * Suporta: PIX (geração e verificação) e Cartão de Crédito
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
        error: 'Sistema de pagamento não configurado. Entre em contato com o suporte.'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log para debug - mostrar prefixo do token (sem expor o token completo)
    const tokenPrefix = mpAccessToken.substring(0, 20);
    console.log('🔑 Access Token prefix:', tokenPrefix + '...');

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // ===== AUTENTICAÇÃO DO USUÁRIO =====
    const authHeader = req.headers.get('Authorization');
    let buyerId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      try {
        // Método 1: getUser com token direto (mais confiável)
        const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
        if (user && !userError) {
          buyerId = user.id;
          console.log('✅ Usuário autenticado:', user.id);
        } else {
          console.warn('⚠️ getUser falhou:', userError?.message || 'user null');
        }
      } catch (authErr) {
        console.warn('⚠️ Erro na autenticação:', authErr);
      }
    }

    // ===== PARSE DO BODY =====
    const body = await req.json();
    const {
      action,           // 'create_pix' | 'create_card' | 'check_status'
      paymentId,        // Para check_status
      photos,           // Array de fotos [{id, title, price}]
      buyer,            // {name, surname, email, phone, cpf}
      cardToken,        // Token do cartão (para create_card)
      cardPaymentMethodId, // visa, master, etc
      cardIssuerId,     // Banco emissor
      installments,     // Número de parcelas
      discount,         // {percentage, amount} opcional (desconto progressivo)
      coupon,           // {coupon_id, code, amount} opcional (cupom)
      deviceId,         // Device Session ID para anti-fraude (obrigatório)
    } = body;

    const allowedCheckoutActions = new Set(['create_pix', 'create_card']);

    console.log('📥 Request:', JSON.stringify({ 
      action, 
      paymentId, 
      photosCount: photos?.length, 
      buyerEmail: buyer?.email, 
      hasDeviceId: !!deviceId,
      hasProgressiveDiscount: !!discount,
      hasCoupon: !!coupon 
    }));

    // ===== AÇÃO: VERIFICAR CREDENCIAIS DO MERCADO PAGO =====
    if (action === 'check_credentials') {
      console.log('🔍 Verificando credenciais do Mercado Pago...');

      // Testar se o Access Token é válido
      const testResponse = await fetch('https://api.mercadopago.com/users/me', {
        headers: { 'Authorization': `Bearer ${mpAccessToken}` },
      });

      const testResult = await testResponse.json();

      if (!testResponse.ok) {
        console.error('❌ Access Token inválido:', testResult);
        return new Response(JSON.stringify({
          success: false,
          error: 'Access Token inválido ou expirado',
          details: testResult
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('✅ Credenciais válidas:', { id: testResult.id, email: testResult.email, site_id: testResult.site_id });

      return new Response(JSON.stringify({
        success: true,
        account: {
          id: testResult.id,
          email: testResult.email,
          site_id: testResult.site_id,
          nickname: testResult.nickname,
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ===== AÇÃO: VERIFICAR STATUS DO PAGAMENTO =====
    // NOTA: Esta ação evita consultas desnecessárias no banco, mas sincroniza estados terminais
    if (action === 'check_status' && paymentId) {
      console.log('🔍 Verificando status do pagamento:', paymentId);

      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { 'Authorization': `Bearer ${mpAccessToken}` },
      });

      const mpResult = await mpResponse.json();

      if (!mpResponse.ok || mpResult.error) {
        const errorMsg = mpResult?.cause?.[0]?.description || mpResult?.message || 'Erro ao verificar status do pagamento';
        console.error('❌ Erro ao consultar Mercado Pago:', { paymentId, errorMsg, raw: mpResult });
        return new Response(JSON.stringify({
          success: false,
          status: 'error',
          statusDetail: mpResult?.status_detail || null,
          error: errorMsg,
        }), {
          status: mpResponse.status >= 500 ? 502 : 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const status = mpResult.status;
      const statusDetail = mpResult.status_detail;
      console.log('📋 Status MP:', status, statusDetail || '');

      // Se aprovado, processar compra (única operação de banco)
      if (status === 'approved') {
        try {
          await processApprovedPayment(supabaseAdmin, mpResult);
        } catch (dbError) {
          console.warn('⚠️ Erro ao processar aprovação no DB (será reconciliado):', dbError);
          // Não falhar - o webhook/reconciliação cuidará disso
        }
      }

      // Se rejeitado/cancelado, sincronizar como failed para evitar pendências infinitas
      const terminalFailureStatuses = ['rejected', 'cancelled', 'refunded', 'charged_back'];
      if (terminalFailureStatuses.includes(status)) {
        const externalRef = mpResult.external_reference?.split('|')[0];
        if (externalRef) {
          try {
            const { data: purchases } = await supabaseAdmin
              .from('purchases')
              .select('id')
              .like('stripe_payment_intent_id', `%${externalRef}%`);

            if (purchases && purchases.length > 0) {
              const purchaseIds = purchases.map((p: any) => p.id);
              await supabaseAdmin
                .from('purchases')
                .update({ status: 'failed' })
                .in('id', purchaseIds);
              console.log('🛑 Purchases marcadas como failed:', purchaseIds.length);
            }
          } catch (syncError) {
            console.warn('⚠️ Falha ao sincronizar status failed (será reconciliado):', syncError);
          }
        }
      }

      return new Response(JSON.stringify({
        success: true,
        status,
        statusDetail,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ===== AÇÃO: COMPRA GRATUITA COM CUPOM =====
    if (action === 'free_purchase') {
      console.log('🎁 Processando compra gratuita com cupom...');

      if (!photos || !Array.isArray(photos) || photos.length === 0) {
        return errorResponse('Nenhuma foto selecionada', 400);
      }

      if (!buyerId) {
        return errorResponse('Sessão expirada. Faça login novamente.', 401);
      }

      if (!coupon?.coupon_id || !coupon?.code) {
        return errorResponse('Cupom obrigatório para compra gratuita', 400);
      }

      // Buscar preços reais das fotos
      const freePhotoIds = photos.map((p: any) => p.id);
      const { data: freeDbPhotos, error: freeDbError } = await supabaseAdmin
        .from('photos')
        .select('id, price, campaign_id, photographer_id')
        .in('id', freePhotoIds);

      if (freeDbError || !freeDbPhotos || freeDbPhotos.length === 0) {
        return errorResponse('Fotos não encontradas', 400);
      }

      const freeSubtotal = freeDbPhotos.reduce((sum: number, p: any) => sum + (Number(p.price) || 0), 0);
      const freePhotoCount = freeDbPhotos.length;

      if (freeSubtotal <= 0) {
        return errorResponse('Valor das fotos inválido', 400);
      }

      // Calcular desconto progressivo server-side
      const freeCampaignIds = [...new Set(freeDbPhotos.map((p: any) => p.campaign_id))];
      const { data: freeCampaigns } = await supabaseAdmin
        .from('campaigns')
        .select('id, progressive_discount_enabled')
        .in('id', freeCampaignIds);

      const freeAllDiscount = freeCampaigns?.every((c: any) => c.progressive_discount_enabled !== false) ?? false;
      let freeProgressivePercent = 0;
      if (freeAllDiscount) {
        if (freePhotoCount >= 5 && freePhotoCount <= 10) freeProgressivePercent = 5;
        else if (freePhotoCount >= 11 && freePhotoCount <= 20) freeProgressivePercent = 10;
        else if (freePhotoCount > 20) freeProgressivePercent = 15;
      }

      const freeProgressiveAmount = Number((freeSubtotal * freeProgressivePercent / 100).toFixed(2));
      const freeSubtotalAfterProg = freeSubtotal - freeProgressiveAmount;

      // Validar cupom server-side
      const { data: freeCouponValidation } = await supabaseAdmin
        .rpc('validate_coupon', {
          p_code: coupon.code,
          p_user_id: buyerId,
          p_purchase_amount: freeSubtotalAfterProg,
        });

      if (!freeCouponValidation || freeCouponValidation.length === 0 || !freeCouponValidation[0].valid) {
        return errorResponse('Cupom inválido ou expirado', 400);
      }

      const freeCouponDiscount = Number(freeCouponValidation[0].discount_amount) || 0;
      const freeCouponId = freeCouponValidation[0].coupon_id;
      const freeFinalTotal = Number((freeSubtotalAfterProg - freeCouponDiscount).toFixed(2));

      // SEGURANÇA: o cupom DEVE cobrir 100% do valor
      if (freeFinalTotal > 0) {
        console.error('🚨 BLOQUEADO: cupom não cobre 100% do valor para compra gratuita', {
          freeSubtotalAfterProg, freeCouponDiscount, freeFinalTotal, buyerId,
        });
        return errorResponse('O cupom não cobre o valor total. Use o checkout normal.', 400);
      }

      console.log('✅ Cupom cobre 100%:', { freeSubtotal, freeProgressiveAmount, freeSubtotalAfterProg, freeCouponDiscount });

      // Criar purchases como completed (service role bypassa RLS)
      const freePurchaseIds: string[] = [];
      const freeExternalRef = `free_coupon_${Date.now().toString(36)}_${buyerId.slice(0, 8)}`;

      for (const freePhoto of freeDbPhotos) {
        const { data: freePurchase, error: freePurchaseError } = await supabaseAdmin
          .from('purchases')
          .insert({
            photo_id: freePhoto.id,
            buyer_id: buyerId,
            photographer_id: freePhoto.photographer_id,
            amount: 0.01, // Mínimo simbólico para triggers funcionarem
            status: 'completed',
            stripe_payment_intent_id: freeExternalRef,
            progressive_discount_percentage: freeProgressivePercent,
            progressive_discount_amount: Number(freePhoto.price) || 0,
          })
          .select()
          .single();

        if (freePurchaseError) {
          console.error('❌ Erro ao criar purchase gratuita:', freePurchaseError);
          continue;
        }

        freePurchaseIds.push(freePurchase.id);
        console.log(`🎁 Purchase gratuita criada: foto ${freePhoto.id}`);
      }

      if (freePurchaseIds.length === 0) {
        return errorResponse('Não foi possível processar as fotos', 500);
      }

      // Registrar uso do cupom
      for (const fpId of freePurchaseIds) {
        await supabaseAdmin
          .from('coupon_uses')
          .insert({
            coupon_id: freeCouponId,
            user_id: buyerId,
            purchase_id: fpId,
            original_amount: freeSubtotal / freePhotoCount,
            discount_amount: freeCouponDiscount / freePhotoCount,
            final_amount: 0,
          });
      }

      // Incrementar uso do cupom
      await supabaseAdmin
        .from('coupons')
        .update({ 
          current_uses: (await supabaseAdmin.from('coupons').select('current_uses').eq('id', freeCouponId).single()).data?.current_uses + 1 || 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', freeCouponId);

      console.log('🎉 Compra gratuita concluída:', { purchaseIds: freePurchaseIds, couponId: freeCouponId });

      return new Response(JSON.stringify({
        success: true,
        purchaseIds: freePurchaseIds,
        purchase_ids: freePurchaseIds,
        status: 'approved',
        free: true,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ===== VALIDAÇÕES COMUNS =====
    if (!photos || !Array.isArray(photos) || photos.length === 0) {
      return errorResponse('Nenhuma foto selecionada', 400);
    }

    if (!buyer || !buyer.email) {
      return errorResponse('Dados do comprador incompletos (email é obrigatório)', 400);
    }

    // Compras precisam estar vinculadas a um usuário autenticado
    if (!buyerId) {
      console.warn('⚠️ Tentativa de checkout sem autenticação válida');
      return errorResponse('Sessão expirada. Faça login novamente para finalizar a compra.', 401);
    }

    if (!allowedCheckoutActions.has(action)) {
      return errorResponse('Ação inválida para checkout', 400);
    }

    // Limpar CPF - obrigatório para pagamentos reais
    const cleanCpf = (buyer?.cpf || '').replace(/\D/g, '');
    // CPF validation happens below after we know if it's a free purchase

    // (buyer lookup already done above)

    // ===== CALCULAR VALORES (VALIDAÇÃO SERVER-SIDE) =====
    // Buscar preços REAIS das fotos no banco (NUNCA confiar no frontend)
    const photoIds = photos.map((p: any) => p.id);
    const { data: dbPhotos, error: dbPhotosError } = await supabaseAdmin
      .from('photos')
      .select('id, price, campaign_id')
      .in('id', photoIds);

    if (dbPhotosError || !dbPhotos || dbPhotos.length === 0) {
      return errorResponse('Fotos não encontradas no banco de dados', 400);
    }

    const dbPhotoMap = new Map(dbPhotos.map((p: any) => [p.id, p]));
    const subtotal = dbPhotos.reduce((sum: number, p: any) => sum + (Number(p.price) || 0), 0);
    const photoCount = dbPhotos.length;

    // 🚨 SEGURANÇA CRÍTICA: subtotal DEVE ser > 0
    if (subtotal <= 0) {
      console.error('🚨 BLOQUEADO: Subtotal zero ou negativo!', { subtotal, photoCount, buyerId });
      return errorResponse('Erro: valor das fotos inválido', 400);
    }

    // Validar desconto progressivo SERVER-SIDE (recalcular, não confiar no frontend)
    const campaignIds = [...new Set(dbPhotos.map((p: any) => p.campaign_id))];
    const { data: campaigns } = await supabaseAdmin
      .from('campaigns')
      .select('id, progressive_discount_enabled')
      .in('id', campaignIds);

    const allCampaignsHaveDiscount = campaigns?.every((c: any) => c.progressive_discount_enabled !== false) ?? false;

    let serverProgressiveDiscountPercent = 0;
    if (allCampaignsHaveDiscount) {
      if (photoCount >= 5 && photoCount <= 10) serverProgressiveDiscountPercent = 5;
      else if (photoCount >= 11 && photoCount <= 20) serverProgressiveDiscountPercent = 10;
      else if (photoCount > 20) serverProgressiveDiscountPercent = 15;
    }

    const serverProgressiveDiscountAmount = Number((subtotal * serverProgressiveDiscountPercent / 100).toFixed(2));
    const subtotalAfterProgressive = subtotal - serverProgressiveDiscountAmount;

    // Validar cupom SERVER-SIDE (chamar função do banco)
    let serverCouponDiscountAmount = 0;
    let validatedCouponId: string | null = null;
    if (coupon?.coupon_id && coupon?.code) {
      const { data: couponValidation } = await supabaseAdmin
        .rpc('validate_coupon', {
          p_code: coupon.code,
          p_user_id: buyerId,
          p_purchase_amount: subtotalAfterProgressive,
        });

      if (couponValidation && couponValidation.length > 0 && couponValidation[0].valid) {
        serverCouponDiscountAmount = Number(couponValidation[0].discount_amount) || 0;
        validatedCouponId = couponValidation[0].coupon_id;
        console.log('✅ Cupom validado server-side:', { id: validatedCouponId, discount: serverCouponDiscountAmount });
      } else {
        console.warn('⚠️ Cupom inválido server-side, ignorando:', coupon.coupon_id);
      }
    }

    const totalDiscount = serverProgressiveDiscountAmount + serverCouponDiscountAmount;
    const rawFinalTotal = Number((subtotal - totalDiscount).toFixed(2));
    const finalTotal = Math.max(rawFinalTotal, 0);

    if (validatedCouponId && serverCouponDiscountAmount >= subtotalAfterProgressive) {
      console.error('🚨 BLOQUEADO: cupom zerando total da compra', {
        subtotal,
        subtotalAfterProgressive,
        serverCouponDiscountAmount,
        validatedCouponId,
        buyerId,
      });
      return errorResponse('Este cupom zera o valor da compra e não é permitido.', 400);
    }

    // 🚨 SEGURANÇA CRÍTICA: bloquear qualquer checkout com total zerado
    // (mesmo com cupom) para evitar liberação gratuita de fotos.
    if (finalTotal <= 0) {
      console.error('🚨 BLOQUEADO: tentativa de checkout com valor zero', {
        subtotal,
        totalDiscount,
        finalTotal,
        buyerId,
        action,
        hasCoupon: !!coupon,
        hasValidatedCoupon: !!validatedCouponId,
      });
      return errorResponse('Não é permitido finalizar compra com valor R$ 0,00.', 400);
    }

    // Segurança extra: evitar cenários de arredondamento que geram fotos com amount = 0
    const minimumTotalForPerPhotoCharge = Number((photoCount * 0.01).toFixed(2));
    if (finalTotal < minimumTotalForPerPhotoCharge) {
      console.error('🚨 BLOQUEADO: total insuficiente para manter valor mínimo por foto', {
        finalTotal,
        photoCount,
        minimumTotalForPerPhotoCharge,
        buyerId,
      });
      return errorResponse('Valor final insuficiente para cobrança mínima por foto.', 400);
    }

    // Para pagamentos reais (não-gratuitos), CPF é obrigatório
    if (finalTotal > 0 && cleanCpf.length !== 11) {
      return errorResponse('CPF deve ter 11 dígitos', 400);
    }

    // 🚨 SEGURANÇA: Garantir valor mínimo de R$ 1,00 para pagamentos reais
    if (finalTotal > 0 && finalTotal < 1) {
      console.error('🚨 BLOQUEADO: Valor final abaixo do mínimo!', { finalTotal, buyerId });
      return errorResponse('Valor mínimo para pagamento: R$ 1,00', 400);
    }

    // 🚨 SEGURANÇA: Comparar desconto enviado pelo frontend com o calculado no servidor
    // Se o frontend enviou um desconto MAIOR que o permitido, bloquear imediatamente
    if (discount) {
      const frontendDiscountPercent = Number(discount.percentage) || 0;
      const frontendDiscountAmount = Number(discount.amount) || 0;

      if (frontendDiscountPercent > serverProgressiveDiscountPercent) {
        console.error('🚨 FRAUDE DETECTADA: desconto progressivo inflado!', {
          frontendDiscountPercent,
          serverProgressiveDiscountPercent,
          frontendDiscountAmount,
          serverProgressiveDiscountAmount,
          buyerId,
          photoCount,
        });
        return errorResponse('Desconto inválido detectado. A compra foi bloqueada por segurança.', 403);
      }

      if (frontendDiscountAmount > serverProgressiveDiscountAmount + 0.02) {
        console.error('🚨 FRAUDE DETECTADA: valor de desconto inflado!', {
          frontendDiscountAmount,
          serverProgressiveDiscountAmount,
          diff: frontendDiscountAmount - serverProgressiveDiscountAmount,
          buyerId,
        });
        return errorResponse('Valor de desconto inválido detectado. A compra foi bloqueada por segurança.', 403);
      }
    }

    console.log('💰 Valores (server-validated, pass 1):', { 
      subtotal, 
      serverProgressiveDiscountPercent,
      serverProgressiveDiscountAmount, 
      serverCouponDiscountAmount,
      totalDiscount,
      finalTotal,
      validatedCouponId
    });

    // ===== SEGUNDA VALIDAÇÃO INDEPENDENTE (Double-Check) =====
    // Re-buscar preços das fotos em uma segunda query para garantir integridade
    const { data: dbPhotosVerify, error: dbPhotosVerifyError } = await supabaseAdmin
      .from('photos')
      .select('id, price, campaign_id')
      .in('id', photoIds);

    if (dbPhotosVerifyError || !dbPhotosVerify || dbPhotosVerify.length !== dbPhotos.length) {
      console.error('🚨 BLOQUEADO: segunda verificação de fotos falhou', {
        originalCount: dbPhotos.length,
        verifyCount: dbPhotosVerify?.length,
        error: dbPhotosVerifyError,
      });
      return errorResponse('Erro na verificação de integridade dos preços. Tente novamente.', 500);
    }

    // Recalcular subtotal independentemente
    const subtotalVerify = dbPhotosVerify.reduce((sum: number, p: any) => sum + (Number(p.price) || 0), 0);
    const photoCountVerify = dbPhotosVerify.length;

    // Recalcular desconto progressivo independentemente
    let verifyDiscountPercent = 0;
    const verifyCampaignIds = [...new Set(dbPhotosVerify.map((p: any) => p.campaign_id))];
    const { data: campaignsVerify } = await supabaseAdmin
      .from('campaigns')
      .select('id, progressive_discount_enabled')
      .in('id', verifyCampaignIds);

    const verifyAllDiscount = campaignsVerify?.every((c: any) => c.progressive_discount_enabled !== false) ?? false;
    if (verifyAllDiscount) {
      if (photoCountVerify >= 5 && photoCountVerify <= 10) verifyDiscountPercent = 5;
      else if (photoCountVerify >= 11 && photoCountVerify <= 20) verifyDiscountPercent = 10;
      else if (photoCountVerify > 20) verifyDiscountPercent = 15;
    }

    const verifyDiscountAmount = Number((subtotalVerify * verifyDiscountPercent / 100).toFixed(2));
    const verifySubtotalAfterProg = subtotalVerify - verifyDiscountAmount;

    // Recalcular cupom
    let verifyCouponDiscount = 0;
    if (validatedCouponId && coupon?.code) {
      const { data: couponVerify } = await supabaseAdmin
        .rpc('validate_coupon', {
          p_code: coupon.code,
          p_user_id: buyerId,
          p_purchase_amount: verifySubtotalAfterProg,
        });
      if (couponVerify && couponVerify.length > 0 && couponVerify[0].valid) {
        verifyCouponDiscount = Number(couponVerify[0].discount_amount) || 0;
      }
    }

    const verifyFinalTotal = Math.max(Number((subtotalVerify - verifyDiscountAmount - verifyCouponDiscount).toFixed(2)), 0);

    // Comparar os dois cálculos — tolerância de R$ 0.02 por arredondamento
    const tolerance = 0.02;
    if (Math.abs(finalTotal - verifyFinalTotal) > tolerance) {
      console.error('🚨 BLOQUEADO: divergência entre cálculos de preço!', {
        pass1: { subtotal, finalTotal, discountPercent: serverProgressiveDiscountPercent },
        pass2: { subtotalVerify, verifyFinalTotal, verifyDiscountPercent },
        diff: Math.abs(finalTotal - verifyFinalTotal),
        buyerId,
      });
      return errorResponse('Erro de integridade nos valores. Tente novamente.', 400);
    }

    console.log('✅ Segunda validação OK (pass 2):', {
      subtotalVerify,
      verifyDiscountPercent,
      verifyDiscountAmount,
      verifyCouponDiscount,
      verifyFinalTotal,
      diffFromPass1: Math.abs(finalTotal - verifyFinalTotal),
    });

    // ===== CRIAR REGISTROS DE PURCHASE =====
    const purchaseIds: string[] = [];
    const allocatedAmountsByPhotoId = allocatePurchaseAmounts(dbPhotos, finalTotal);

    if (!allocatedAmountsByPhotoId) {
      console.error('🚨 BLOQUEADO: não foi possível distribuir valores por foto com mínimo de R$ 0,01');
      return errorResponse('Não foi possível calcular valores individuais das fotos para o checkout.', 400);
    }

    console.log('📊 Distribuição de valores por foto concluída:', {
      photos: dbPhotos.length,
      subtotal,
      finalTotal,
    });

    // Gerar idempotency key ANTES de criar purchases (hash completo para evitar colisões)
    const photoIdsSorted = photos.map((p: any) => p.id).sort().join(',');
    const idempotencyBase = `${action}|${buyerId}|${photoIdsSorted}|${Number(finalTotal).toFixed(2)}`;
    const idempotencyKey = await createIdempotencyKey(idempotencyBase);
    
    console.log('🔑 Idempotency key:', idempotencyKey);

    // ===== VERIFICAR PAGAMENTO DUPLICADO =====
    // Buscar purchases recentes (últimos 2 minutos) do mesmo buyer com as mesmas fotos
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    
    const { data: recentPurchases } = await supabaseAdmin
      .from('purchases')
      .select('id, status, photo_id, stripe_payment_intent_id')
      .eq('buyer_id', buyerId)
      .in('photo_id', photoIds)
      .gte('created_at', twoMinutesAgo)
      .in('status', ['pending', 'completed']);

    if (recentPurchases && recentPurchases.length >= photoIds.length) {
      console.warn('⚠️ Possível pagamento duplicado detectado! Purchases recentes:', recentPurchases.length);

      // Verificar se TODAS as fotos já têm purchase recente
      const existingPhotoIds = new Set(recentPurchases.map(p => p.photo_id));
      const allPhotosHavePurchase = photoIds.every((id: string) => existingPhotoIds.has(id));

      if (allPhotosHavePurchase) {
        const existingIds = recentPurchases.map(p => p.id);
        const existingRef = recentPurchases[0]?.stripe_payment_intent_id;

        // Se já existe pagamento MP associado, tentar reaproveitar o QR em vez de bloquear o cliente
        if (existingRef && existingRef.includes('mp:')) {
          const mpId = existingRef.split('mp:')[1];
          console.log('🔄 Pagamento MP existente detectado:', mpId);

          if (action === 'create_card') {
            return new Response(JSON.stringify({
              success: false,
              error: 'Este pagamento já foi processado. Verifique suas compras.',
              status: 'duplicate',
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          if (action === 'create_pix') {
            try {
              const existingMpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${mpId}`, {
                headers: { 'Authorization': `Bearer ${mpAccessToken}` },
              });
              const existingMpResult = await existingMpResponse.json();

              if (existingMpResponse.ok && !existingMpResult.error) {
                const existingStatus = existingMpResult.status;
                const existingStatusDetail = existingMpResult.status_detail;
                const existingPixInfo = existingMpResult.point_of_interaction?.transaction_data;
                const terminalFailureStatuses = ['rejected', 'cancelled', 'refunded', 'charged_back'];

                if (existingStatus === 'approved') {
                  await supabaseAdmin
                    .from('purchases')
                    .update({ status: 'completed' })
                    .in('id', existingIds);

                  return new Response(JSON.stringify({
                    success: true,
                    status: 'approved',
                    statusDetail: existingStatusDetail,
                    paymentId: Number(mpId),
                    purchaseIds: existingIds,
                    purchase_ids: existingIds,
                    reused: true,
                  }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                  });
                }

                if ((existingStatus === 'pending' || existingStatus === 'in_process') && existingPixInfo?.qr_code) {
                  return new Response(JSON.stringify({
                    success: true,
                    status: existingStatus,
                    statusDetail: existingStatusDetail,
                    paymentId: Number(mpId),
                    purchaseIds: existingIds,
                    purchase_ids: existingIds,
                    reused: true,
                    pix: {
                      qrCode: existingPixInfo.qr_code,
                      qrCodeBase64: existingPixInfo.qr_code_base64,
                      expirationDate: existingMpResult.date_of_expiration,
                    },
                  }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                  });
                }

                if (terminalFailureStatuses.includes(existingStatus)) {
                  console.warn('⚠️ PIX existente em status terminal, gerando novo PIX:', existingStatus);
                  await supabaseAdmin
                    .from('purchases')
                    .update({ status: 'failed' })
                    .in('id', existingIds);
                }
              }
            } catch (existingPixError) {
              console.warn('⚠️ Falha ao reaproveitar PIX existente, tentando gerar novo:', existingPixError);
            }
          }
        }

        // Reusar purchases existentes para nova tentativa (evita duplicidade e destrava o checkout)
        console.log('♻️ Reusando purchases existentes para nova tentativa:', existingIds);

        const externalReference = existingIds.length === 1
          ? existingIds[0]
          : `batch_${existingIds[0].slice(0, 8)}_${existingIds.length}_${Date.now().toString(36)}`;

        await supabaseAdmin
          .from('purchases')
          .update({ stripe_payment_intent_id: externalReference, status: 'pending' })
          .in('id', existingIds);

        // Pular criação de novas purchases e ir direto para o pagamento
        return await processPayment(action, externalReference, existingIds, finalTotal, photos, buyer, cleanCpf, deviceId, mpAccessToken, supabaseUrl, corsHeaders, cardToken, cardPaymentMethodId, cardIssuerId, installments, idempotencyKey);
      }
    }

    for (const photo of photos) {
      const dbPhoto = dbPhotoMap.get(photo.id);
      if (!dbPhoto) {
        console.warn('⚠️ Foto não encontrada no mapa:', photo.id);
        continue;
      }

      const { data: photoData } = await supabaseAdmin
        .from('photos')
        .select('photographer_id')
        .eq('id', photo.id)
        .single();

      if (!photoData) {
        console.warn('⚠️ Foto não encontrada:', photo.id);
        continue;
      }

      // Valor calculado no servidor com distribuição em centavos e mínimo de R$ 0,01 por foto
      const originalPrice = Number(dbPhoto.price) || 0;
      const discountedAmount = allocatedAmountsByPhotoId.get(photo.id) ?? 0;

      if (discountedAmount <= 0) {
        console.error('🚨 BLOQUEADO: tentativa de criar purchase com amount <= 0', {
          photoId: photo.id,
          originalPrice,
          discountedAmount,
        });
        return errorResponse('Erro interno de cálculo do valor da compra.', 500);
      }

      const photoDiscountAmount = Number((originalPrice - discountedAmount).toFixed(2));

      const { data: purchase, error: purchaseError } = await supabaseAdmin
        .from('purchases')
        .insert({
          photo_id: photo.id,
          buyer_id: buyerId,
          photographer_id: photoData.photographer_id,
          amount: discountedAmount,
          status: 'pending',
          progressive_discount_percentage: serverProgressiveDiscountPercent,
          progressive_discount_amount: photoDiscountAmount,
        })
        .select()
        .single();

      if (purchaseError) {
        console.error('❌ Erro ao criar purchase:', purchaseError);
        continue;
      }

      purchaseIds.push(purchase.id);
      console.log(`💰 Purchase criada: foto ${photo.id} | original: R$${originalPrice} → final: R$${discountedAmount} (desconto: R$${photoDiscountAmount})`);
    }

    if (purchaseIds.length === 0) {
      return errorResponse('Não foi possível processar as fotos selecionadas', 500);
    }

    // Criar referência externa
    const externalReference = purchaseIds.length === 1
      ? purchaseIds[0]
      : `batch_${purchaseIds[0].slice(0, 8)}_${purchaseIds.length}_${Date.now().toString(36)}`;

    // Salvar referência nas purchases
    await supabaseAdmin
      .from('purchases')
      .update({ stripe_payment_intent_id: externalReference })
      .in('id', purchaseIds);

    console.log('📋 External Reference:', externalReference);

    return await processPayment(action, externalReference, purchaseIds, finalTotal, photos, buyer, cleanCpf, deviceId, mpAccessToken, supabaseUrl, corsHeaders, cardToken, cardPaymentMethodId, cardIssuerId, installments, idempotencyKey);


  } catch (error) {
    console.error('❌ Erro geral:', error);
    return errorResponse('Erro interno do servidor', 500);
  }
});

// ===== FUNÇÕES AUXILIARES =====

async function createIdempotencyKey(base: string) {
  const bytes = new TextEncoder().encode(base);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hashHex = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

  // Mercado Pago aceita chaves alfanuméricas de tamanho limitado
  return `mp-${hashHex.substring(0, 56)}`;
}

function allocatePurchaseAmounts(dbPhotos: any[], finalTotal: number): Map<string, number> | null {
  const totalCents = Math.round(finalTotal * 100);
  const photoCount = dbPhotos.length;

  if (!photoCount || totalCents < photoCount) {
    return null;
  }

  const prices = dbPhotos.map((photo: any) => Number(photo.price) || 0);
  const subtotal = prices.reduce((sum: number, price: number) => sum + price, 0);

  if (subtotal <= 0) {
    return null;
  }

  // Reserva 1 centavo para cada foto para garantir que nenhuma fique gratuita.
  const baseCents = new Array(photoCount).fill(1);
  let remainingCents = totalCents - photoCount;

  const weightedShares = prices.map((price: number) => (price / subtotal) * remainingCents);
  const extraCents = weightedShares.map((value: number) => Math.floor(value));

  const distributedExtra = extraCents.reduce((sum: number, value: number) => sum + value, 0);
  let leftoverCents = remainingCents - distributedExtra;

  const orderByFraction = weightedShares
    .map((value: number, index: number) => ({ index, fraction: value - extraCents[index] }))
    .sort((a, b) => b.fraction - a.fraction);

  for (let i = 0; i < leftoverCents; i++) {
    const targetIndex = orderByFraction[i % orderByFraction.length].index;
    extraCents[targetIndex] += 1;
  }

  const allocation = new Map<string, number>();
  dbPhotos.forEach((photo: any, index: number) => {
    const cents = baseCents[index] + extraCents[index];
    allocation.set(photo.id, Number((cents / 100).toFixed(2)));
  });

  return allocation;
}

function errorResponse(message: string, status: number) {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-connection-pool, x-supabase-api-version',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Content-Type': 'application/json',
    },
  });
}

async function processPayment(
  action: string, externalReference: string, purchaseIds: string[],
  finalTotal: number, photos: any[], buyer: any, cleanCpf: string,
  deviceId: string, mpAccessToken: string, supabaseUrl: string,
  corsHeaders: Record<string, string>, cardToken?: string,
  cardPaymentMethodId?: string, cardIssuerId?: string,
  installments?: number, idempotencyKey?: string,
) {
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  if (action === 'create_pix') {
    console.log('🔄 Criando pagamento PIX...');
    const pixPayload = {
      transaction_amount: Number(finalTotal.toFixed(2)),
      payment_method_id: 'pix',
      description: photos.length > 1 ? `${photos.length} fotos - STA Fotos` : 'Foto - STA Fotos',
      payer: {
        email: buyer.email.toLowerCase().trim(),
        first_name: (buyer.name || 'Cliente').trim(),
        last_name: (buyer.surname || 'STA').trim(),
        identification: { type: 'CPF', number: cleanCpf },
      },
      external_reference: externalReference,
      notification_url: `${supabaseUrl}/functions/v1/mercadopago-webhook`,
    };

    const mpHeaders: Record<string, string> = {
      'Authorization': `Bearer ${mpAccessToken}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': idempotencyKey || `pix-${externalReference}`,
    };
    if (deviceId) mpHeaders['X-meli-session-id'] = deviceId;

    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST', headers: mpHeaders, body: JSON.stringify(pixPayload),
    });
    const mpResult = await mpResponse.json();

    if (!mpResponse.ok || mpResult.error) {
      await supabaseAdmin.from('purchases').delete().in('id', purchaseIds);

      const mpStatusCode = Number(mpResponse.status || 0);
      const statusDetail = mpResult?.status_detail || null;
      const errorCode = mpResult?.error || null;
      const mpDescription = mpResult?.cause?.[0]?.description
        || mpResult?.message
        || mpResult?.error_description
        || statusDetail;

      const errorMsg = mpDescription || (mpStatusCode >= 500
        ? `Erro temporário no Mercado Pago (${mpStatusCode})`
        : 'Erro ao gerar PIX');

      const retryable = mpStatusCode === 429 || mpStatusCode >= 500;

      console.error('❌ Erro MP PIX:', {
        statusCode: mpStatusCode,
        retryable,
        errorCode,
        statusDetail,
        response: mpResult,
      });

      return new Response(JSON.stringify({
        success: false,
        error: errorMsg,
        status: 'error',
        statusCode: mpStatusCode,
        retryable,
        statusDetail,
        errorCode,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await supabaseAdmin.from('purchases')
      .update({ stripe_payment_intent_id: `${externalReference}|mp:${mpResult.id}` })
      .in('id', purchaseIds);

    const pixInfo = mpResult.point_of_interaction?.transaction_data;
    return new Response(JSON.stringify({
      success: true, paymentId: mpResult.id, purchaseIds,
      pix: pixInfo ? {
        qrCode: pixInfo.qr_code, qrCodeBase64: pixInfo.qr_code_base64,
        expirationDate: mpResult.date_of_expiration,
      } : null,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  if (action === 'create_card') {
    if (!cardToken) return errorResponse('Token do cartão não fornecido', 400);
    console.log('🔄 Processando pagamento com cartão...');

    const cardPayload: any = {
      transaction_amount: Number(finalTotal.toFixed(2)),
      token: cardToken,
      description: photos.length > 1 ? `${photos.length} fotos - STA Fotos` : 'Foto - STA Fotos',
      installments: Number(installments) || 1,
      payment_method_id: cardPaymentMethodId,
      payer: {
        email: buyer.email.toLowerCase().trim(),
        first_name: (buyer.name || 'Cliente').trim(),
        last_name: (buyer.surname || 'STA').trim(),
        identification: { type: 'CPF', number: cleanCpf },
      },
      external_reference: externalReference,
      notification_url: `${supabaseUrl}/functions/v1/mercadopago-webhook`,
    };
    if (cardIssuerId) cardPayload.issuer_id = Number(cardIssuerId);

    const mpCardHeaders: Record<string, string> = {
      'Authorization': `Bearer ${mpAccessToken}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': idempotencyKey || `card-${externalReference}`,
    };
    if (deviceId) mpCardHeaders['X-meli-session-id'] = deviceId;

    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST', headers: mpCardHeaders, body: JSON.stringify(cardPayload),
    });
    const mpResult = await mpResponse.json();
    console.log('📦 Resposta MP Cartão:', mpResult.status, mpResult.status_detail);

    if (!mpResponse.ok || mpResult.error) {
      await supabaseAdmin.from('purchases').delete().in('id', purchaseIds);
      const errorMsg = mpResult.cause?.[0]?.description || mpResult.message || 'Erro ao processar cartão';
      return new Response(JSON.stringify({ 
        success: false, error: errorMsg, status: 'error',
        statusDetail: mpResult.status_detail || 'gateway_error'
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    await supabaseAdmin.from('purchases')
      .update({ stripe_payment_intent_id: `${externalReference}|mp:${mpResult.id}` })
      .in('id', purchaseIds);

    if (mpResult.status === 'approved') {
      await supabaseAdmin.from('purchases')
        .update({ status: 'completed' })
        .in('id', purchaseIds);
    }

    return new Response(JSON.stringify({
      success: mpResult.status === 'approved',
      status: mpResult.status, statusDetail: mpResult.status_detail,
      paymentId: mpResult.id, purchaseIds,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  return errorResponse('Ação não reconhecida', 400);
}

async function processApprovedPayment(supabase: any, mpResult: any) {
  const externalRef = mpResult.external_reference;
  if (!externalRef) return;
  console.log('✅ Processando pagamento aprovado:', externalRef);

  const { data: purchases } = await supabase
    .from('purchases').select('id')
    .like('stripe_payment_intent_id', `%${externalRef.split('|')[0]}%`);

  if (!purchases || purchases.length === 0) return;

  const purchaseIds = purchases.map((p: any) => p.id);
  await supabase.from('purchases').update({ status: 'completed' }).in('id', purchaseIds);
}
