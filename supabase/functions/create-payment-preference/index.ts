import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';
import { buyerInfoSchema } from './validation.ts';

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

    const { photos, buyerInfo, campaignId } = await req.json();

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

    // Buscar informações de todas as fotos
    const photoIds = photos.map(p => p.id);
    const { data: photosData, error: photosError } = await supabase
      .from('photos')
      .select('id, photographer_id, campaign_id')
      .in('id', photoIds);

    if (photosError || !photosData || photosData.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'Fotos não encontradas' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calcular preço total
    const totalAmount = photos.reduce((sum, p) => sum + Number(p.price), 0);

    // Criar purchases no banco para cada foto
    const purchases = [];
    for (const photo of photos) {
      const photoData = photosData.find(p => p.id === photo.id);
      if (!photoData) continue;

      const { data: purchase, error: purchaseError } = await supabase
        .from('purchases')
        .insert({
          photo_id: photo.id,
          buyer_id: buyer.id,
          photographer_id: photoData.photographer_id,
          amount: photo.price,
          status: 'pending',
        })
        .select()
        .single();

      if (!purchaseError && purchase) {
        purchases.push(purchase);
      }
    }

    if (purchases.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'Erro ao criar compras' }), {
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

    // Preparar itens para Mercado Pago
    const items = photos.map((photo) => ({
      id: photo.id,
      title: photo.title || 'Foto',
      quantity: 1,
      unit_price: Number(photo.price),
      currency_id: 'BRL',
    }));

    // Usar IDs de todas as purchases separados por vírgula
    const purchaseIds = purchases.map(p => p.id).join(',');

    const baseAppUrl = supabaseUrl.replace('.supabase.co', '.lovableproject.com');

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
        success: `${baseAppUrl}/#/checkout/sucesso`,
        failure: `${baseAppUrl}/#/checkout/falha`,
        pending: `${baseAppUrl}/#/checkout/pendente`,
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
