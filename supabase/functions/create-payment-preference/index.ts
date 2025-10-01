import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { photoId, photoTitle, price, buyerInfo, campaignId } = await req.json();

    // Validate input data
    if (!photoId || !photoTitle || !price || !buyerInfo || !campaignId) {
      throw new Error('Missing required fields');
    }

    if (typeof price !== 'number' || price <= 0 || price > 100000) {
      throw new Error('Invalid price value');
    }

    if (!buyerInfo.email || !buyerInfo.name || !buyerInfo.surname) {
      throw new Error('Invalid buyer information');
    }

    // Get Mercado Pago access token from secrets
    const accessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
    if (!accessToken) {
      throw new Error('MERCADO_PAGO_ACCESS_TOKEN not configured');
    }

    const currentUrl = req.headers.get('origin') || 'https://gtpqppvyjrnnuhlsbpqd.supabase.co';

    // Create preference data
    const preferenceData = {
      items: [
        {
          id: photoId,
          title: photoTitle,
          quantity: 1,
          unit_price: price,
          currency_id: 'BRL',
        },
      ],
      payer: {
        name: buyerInfo.name,
        surname: buyerInfo.surname,
        email: buyerInfo.email,
        phone: buyerInfo.phone,
        identification: buyerInfo.identification,
      },
      back_urls: {
        success: `${currentUrl}/campaign/${campaignId}?payment=success&photo=${photoId}`,
        failure: `${currentUrl}/campaign/${campaignId}?payment=failure&photo=${photoId}`,
        pending: `${currentUrl}/campaign/${campaignId}?payment=pending&photo=${photoId}`,
      },
      auto_return: 'approved',
      external_reference: `photo_${photoId}_${Date.now()}`,
      statement_descriptor: 'PHOTO ARENA',
      binary_mode: false,
      payment_methods: {
        excluded_payment_methods: [],
        excluded_payment_types: [],
        installments: 1,
      },
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    // Call Mercado Pago API
    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preferenceData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Mercado Pago API error: ${response.status}`);
    }

    const result = await response.json();

    return new Response(
      JSON.stringify({
        success: true,
        preference_id: result.id,
        init_point: result.init_point,
        sandbox_init_point: result.sandbox_init_point,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
