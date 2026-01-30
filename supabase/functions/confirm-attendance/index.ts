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

    const { photographer_id, campaign_id, mesario_session_id } = await req.json();

    if (!photographer_id || !campaign_id || !mesario_session_id) {
      return new Response(
        JSON.stringify({ error: 'photographer_id, campaign_id e mesario_session_id são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se sessão do mesário é válida
    const { data: mesarioSession } = await supabase
      .from('mesario_sessions')
      .select('id, campaign_id, expires_at, is_active, mesario_name')
      .eq('id', mesario_session_id)
      .single();

    if (!mesarioSession || !mesarioSession.is_active || new Date(mesarioSession.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Sessão de mesário inválida ou expirada' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (mesarioSession.campaign_id !== campaign_id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Esta sessão não é válida para este evento' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar aprovação por múltiplas fontes
    let isApproved = false;

    // 1. Verificar se é o criador do evento
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('photographer_id')
      .eq('id', campaign_id)
      .single();

    if (campaign?.photographer_id === photographer_id) {
      isApproved = true;
    }

    // 2. Verificar se está atribuído via campaign_photographers
    if (!isApproved) {
      const { data: assignment } = await supabase
        .from('campaign_photographers')
        .select('id')
        .eq('campaign_id', campaign_id)
        .eq('photographer_id', photographer_id)
        .eq('is_active', true)
        .single();

      if (assignment) {
        isApproved = true;
      }
    }

    // 3. Verificar candidatura aprovada (mantém compatibilidade)
    if (!isApproved) {
      const { data: application } = await supabase
        .from('event_applications')
        .select('id, status')
        .eq('campaign_id', campaign_id)
        .eq('photographer_id', photographer_id)
        .eq('status', 'approved')
        .single();
        
      if (application) {
        isApproved = true;
      }
    }

    if (!isApproved) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Fotógrafo não está aprovado para este evento' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se já tem presença confirmada
    const { data: existingAttendance } = await supabase
      .from('event_attendance')
      .select('id, confirmed_at')
      .eq('campaign_id', campaign_id)
      .eq('photographer_id', photographer_id)
      .single();

    if (existingAttendance) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Presença já foi confirmada anteriormente',
          confirmed_at: existingAttendance.confirmed_at
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Registrar presença
    const { data: attendance, error: attendanceError } = await supabase
      .from('event_attendance')
      .insert({
        campaign_id,
        photographer_id,
        confirmed_by: mesario_session_id,
        confirmed_at: new Date().toISOString()
      })
      .select(`
        id,
        confirmed_at,
        photographer:profiles!event_attendance_photographer_id_fkey(
          id,
          full_name,
          avatar_url
        )
      `)
      .single();

    if (attendanceError) {
      console.error('Erro ao registrar presença:', attendanceError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erro ao registrar presença' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Presença confirmada com sucesso!',
        attendance: {
          id: attendance.id,
          confirmed_at: attendance.confirmed_at,
          confirmed_by_mesario: mesarioSession.mesario_name,
          photographer: attendance.photographer
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
