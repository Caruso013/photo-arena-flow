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

    // Verificar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
    
    if (claimsError || !claimsData.user) {
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.user.id;

    // Verificar se é admin ou organização
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (!profile || !['admin', 'organization'].includes(profile.role)) {
      return new Response(
        JSON.stringify({ error: 'Apenas admins e organizações podem criar sessões de mesário' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { campaign_id, mesario_name, organization_id } = await req.json();

    if (!campaign_id || !mesario_name) {
      return new Response(
        JSON.stringify({ error: 'campaign_id e mesario_name são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Gerar código de acesso único
    const { data: codeData, error: codeError } = await supabase
      .rpc('generate_mesario_access_code');

    if (codeError) {
      console.error('Erro ao gerar código:', codeError);
      return new Response(
        JSON.stringify({ error: 'Erro ao gerar código de acesso' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accessCode = codeData;

    // Calcular expiração (24 horas)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Criar sessão de mesário
    const { data: session, error: sessionError } = await supabase
      .from('mesario_sessions')
      .insert({
        campaign_id,
        organization_id,
        mesario_name,
        access_code: accessCode,
        created_by: userId,
        expires_at: expiresAt.toISOString(),
        is_active: true
      })
      .select(`
        *,
        campaign:campaigns(id, title, event_date, location)
      `)
      .single();

    if (sessionError) {
      console.error('Erro ao criar sessão:', sessionError);
      return new Response(
        JSON.stringify({ error: 'Erro ao criar sessão de mesário' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        session: {
          id: session.id,
          access_code: accessCode,
          mesario_name: session.mesario_name,
          expires_at: session.expires_at,
          campaign: session.campaign
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
