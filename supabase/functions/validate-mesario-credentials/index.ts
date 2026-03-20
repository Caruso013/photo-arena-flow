// @ts-nocheck - Deno Edge Function
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { username, password } = await req.json();

    if (!username || !password) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Usuário e senha são obrigatórios' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate credentials using the database function
    const { data, error } = await supabase.rpc('validate_mesario_credentials', {
      p_username: username,
      p_password: password
    });

    if (error) {
      console.error('RPC error:', error);
      return new Response(
        JSON.stringify({ valid: false, error: 'Erro ao validar credenciais' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!data || data.length === 0) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Usuário ou senha incorretos' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const mesario = data[0];

    // Get organization info
    let organization = null;
    if (mesario.org_id) {
      const { data: orgData } = await supabase
        .from('organizations')
        .select('id, name, logo_url')
        .eq('id', mesario.org_id)
        .single();
      organization = orgData;
    }

    return new Response(
      JSON.stringify({
        valid: true,
        mesario: {
          id: mesario.mesario_id,
          full_name: mesario.mesario_name,
          organization_id: mesario.org_id,
          organization
        }
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
