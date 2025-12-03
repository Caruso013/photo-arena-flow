import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';
import { buyerInfoSchema } from './validation.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Função para calcular o desconto progressivo (deve ser igual ao frontend)
function calculateProgressiveDiscount(quantity: number): number {
  if (quantity >= 10) {
    return 20; // 20% para 10+ fotos
  } else if (quantity >= 5) {
    return 10; // 10% para 5-9 fotos
  } else if (quantity >= 2) {
    return 5; // 5% para 2-4 fotos
  }
  return 0;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { photos, buyerInfo, campaignId, progressiveDiscount } = await req.json();

    // Validação básica - aceita múltiplas fotos
    if (!photos || !Array.isArray(photos) || photos.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'Nenhuma foto fornecida' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validar buyerInfo
    const validation = buyerInfoSchema.safeParse(buyerInfo);
    if (!validation.success) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Dados do comprador inválidos',
        details: validation.error.errors 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Obter user_id do comprador pelo email
    const { data: userData } = await supabase.auth.admin.listUsers();
    const buyer = userData.users.find(u => u.email === buyerInfo.email);
    
    if (!buyer) {
      return new Response(JSON.stringify({ success: false, error: 'Usuário não encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Buscar informações de todas as fotos COM PREÇOS REAIS do banco
    const photoIds = photos.map(p => p.id);
    const { data: photosData, error: photosError } = await supabase
      .from('photos')
      .select('id, photographer_id, campaign_id, price')
      .in('id', photoIds);

    if (photosError || !photosData || photosData.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'Fotos não encontradas' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // CALCULAR PREÇO TOTAL DO BANCO (subtotal sem desconto)
    const realSubtotal = photosData.reduce((sum, p) => sum + Number(p.price), 0);
    const quantity = photosData.length;
    
    // Calcular desconto progressivo esperado (verificar no servidor)
    const expectedDiscountPercentage = calculateProgressiveDiscount(quantity);
    const expectedDiscountAmount = realSubtotal * (expectedDiscountPercentage / 100);
    const expectedTotal = realSubtotal - expectedDiscountAmount;

    // Se o cliente enviou desconto progressivo, validar
    let finalTotal = realSubtotal;
    let appliedDiscountPercentage = 0;
    let appliedDiscountAmount = 0;
    
    if (progressiveDiscount && progressiveDiscount.enabled) {
      // Verificar se o desconto está correto
      if (Math.abs(progressiveDiscount.percentage - expectedDiscountPercentage) > 0.01) {
        console.error('⚠️ Desconto progressivo inválido:', {
          clientPercentage: progressiveDiscount.percentage,
          expectedPercentage: expectedDiscountPercentage
        });
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Desconto inválido. Recarregue a página e tente novamente.' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      appliedDiscountPercentage = expectedDiscountPercentage;
      appliedDiscountAmount = expectedDiscountAmount;
      finalTotal = expectedTotal;
      
      console.log('✅ Desconto progressivo aplicado:', {
        quantity,
        subtotal: realSubtotal,
        discountPercentage: appliedDiscountPercentage,
        discountAmount: appliedDiscountAmount,
        finalTotal
      });
    }

    // Criar purchases no banco com informações do desconto
    const purchasesToInsert = photosData.map(photoData => {
      const photoPrice = photoData.price;
      // Calcular preço proporcional após desconto para cada foto
      const proportionalDiscount = appliedDiscountAmount > 0 
        ? (photoPrice / realSubtotal) * appliedDiscountAmount 
        : 0;
      const finalPhotoPrice = photoPrice - proportionalDiscount;
      
      return {
        photo_id: photoData.id,
        buyer_id: buyer.id,
        photographer_id: photoData.photographer_id,
        amount: Number(finalPhotoPrice.toFixed(2)), // Preço final com desconto proporcional
        status: 'pending',
        progressive_discount_percentage: appliedDiscountPercentage,
        progressive_discount_amount: Number(proportionalDiscount.toFixed(2)),
      };
    });

    const { data: purchases, error: purchasesInsertError } = await supabase
      .from('purchases')
      .insert(purchasesToInsert)
      .select();

    if (purchasesInsertError || !purchases || purchases.length !== photosData.length) {
      console.error('Erro ao criar purchases:', purchasesInsertError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Erro ao criar compras. Nenhum valor foi cobrado.' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const accessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
    
    if (!accessToken) {
      return new Response(JSON.stringify({ success: false, error: 'Token do Mercado Pago não configurado' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Preparar itens para Mercado Pago com preço já com desconto aplicado
    let items;
    
    if (appliedDiscountPercentage > 0) {
      // Se há desconto, criar um único item com o total
      items = [{
        id: 'fotos-com-desconto',
        title: `${quantity} Fotos (${appliedDiscountPercentage}% de desconto)`,
        quantity: 1,
        unit_price: Number(finalTotal.toFixed(2)),
        currency_id: 'BRL',
      }];
    } else {
      // Sem desconto, manter items individuais
      items = photosData.map((photoData, index) => ({
        id: photoData.id,
        title: photos[index]?.title || 'Foto',
        quantity: 1,
        unit_price: Number(photoData.price),
        currency_id: 'BRL',
      }));
    }

    // Usar IDs de todas as purchases separados por vírgula
    const purchaseIds = purchases.map(p => p.id).join(',');

    const baseAppUrl = 'https://www.stafotos.com';

    const preferenceData = {
      items,
      payer: {
        name: buyerInfo.name,
        surname: buyerInfo.surname,
        email: buyerInfo.email,
        phone: {
          area_code: buyerInfo.phone.substring(0, 2),
          number: buyerInfo.phone.substring(2),
        },
        identification: {
          type: 'CPF',
          number: buyerInfo.document,
        },
      },
      back_urls: {
        success: `${baseAppUrl}/#/checkout/processando?ref=${purchaseIds}`,
        failure: `${baseAppUrl}/#/checkout/processando?ref=${purchaseIds}`,
        pending: `${baseAppUrl}/#/checkout/processando?ref=${purchaseIds}`,
      },
      auto_return: 'approved',
      external_reference: purchaseIds,
      notification_url: `${supabaseUrl}/functions/v1/mercadopago-webhook`,
      statement_descriptor: 'STA FOTOS',
    };

    console.log('Creating Mercado Pago preference:', JSON.stringify(preferenceData, null, 2));

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preferenceData),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Mercado Pago API error:', data);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Erro ao criar preferência de pagamento',
        details: data
      }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Mercado Pago preference created:', data.id);

    return new Response(JSON.stringify({
      success: true,
      preference_id: data.id,
      init_point: data.init_point,
      sandbox_init_point: data.sandbox_init_point,
      purchase_ids: purchaseIds,
      applied_discount: appliedDiscountPercentage > 0 ? {
        percentage: appliedDiscountPercentage,
        amount: appliedDiscountAmount,
        subtotal: realSubtotal,
        total: finalTotal
      } : null
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
