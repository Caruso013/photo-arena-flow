// @ts-nocheck - Deno Edge Function
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Gerar token seguro com HMAC
async function generateSecureToken(photographerId: string, secret: string): Promise<string> {
  const timestamp = Date.now();
  const data = `${photographerId}:${timestamp}`;
  
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
  
  // Combinar dados em um token base64
  const tokenData = JSON.stringify({
    id: photographerId,
    ts: timestamp,
    sig: signatureB64.substring(0, 16) // Usar apenas parte da assinatura
  });
  
  return btoa(tokenData);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verificar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = userData.user.id;

    // Verificar se é fotógrafo
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role, full_name')
      .eq('id', userId)
      .single();

    if (!profile || profile.role !== 'photographer') {
      return new Response(
        JSON.stringify({ error: 'Apenas fotógrafos podem gerar QR Code' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se já tem token
    const { data: existingToken } = await supabase
      .from('photographer_qr_tokens')
      .select('id, token, created_at')
      .eq('photographer_id', userId)
      .single();

    if (existingToken) {
      return new Response(
        JSON.stringify({
          success: true,
          token: existingToken.token,
          qr_value: `STA-PHOTO:${existingToken.token}`,
          created_at: existingToken.created_at,
          is_new: false
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Gerar novo token
    const newToken = await generateSecureToken(userId, supabaseServiceKey);

    // Salvar token
    const { data: savedToken, error: saveError } = await supabase
      .from('photographer_qr_tokens')
      .insert({
        photographer_id: userId,
        token: newToken
      })
      .select('id, token, created_at')
      .single();

    if (saveError) {
      console.error('Erro ao salvar token:', saveError);
      return new Response(
        JSON.stringify({ error: 'Erro ao gerar QR Code' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        token: savedToken.token,
        qr_value: `STA-PHOTO:${savedToken.token}`,
        created_at: savedToken.created_at,
        is_new: true
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro interno:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
