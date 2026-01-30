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

    const { access_code } = await req.json();

    if (!access_code) {
      return new Response(
        JSON.stringify({ error: 'Código de acesso é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar sessão pelo código
    const { data: session, error: sessionError } = await supabase
      .from('mesario_sessions')
      .select(`
        *,
        campaign:campaigns(
          id, 
          title, 
          event_date, 
          location,
          cover_image_url
        ),
        organization:organizations(
          id,
          name,
          logo_url
        )
      `)
      .eq('access_code', access_code.toUpperCase().trim())
      .eq('is_active', true)
      .single();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Código inválido ou não encontrado' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se expirou
    if (new Date(session.expires_at) < new Date()) {
      // Marcar como inativo
      await supabase
        .from('mesario_sessions')
        .update({ is_active: false })
        .eq('id', session.id);

      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Código expirado. Solicite um novo código à organização.' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar fotógrafos aprovados para o evento
    const { data: approvedPhotographers } = await supabase
      .from('event_applications')
      .select(`
        photographer_id,
        photographer:profiles!event_applications_photographer_id_fkey(
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('campaign_id', session.campaign_id)
      .eq('status', 'approved');

    // Buscar presenças já confirmadas
    const { data: attendances } = await supabase
      .from('event_attendance')
      .select('photographer_id, confirmed_at')
      .eq('campaign_id', session.campaign_id);

    return new Response(
      JSON.stringify({
        valid: true,
        session: {
          id: session.id,
          mesario_name: session.mesario_name,
          expires_at: session.expires_at,
          campaign: session.campaign,
          organization: session.organization
        },
        approved_photographers: approvedPhotographers || [],
        confirmed_attendances: attendances || []
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
