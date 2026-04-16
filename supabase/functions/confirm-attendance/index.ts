// @ts-nocheck - Deno Edge Function
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

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
    // Primeiro tenta mesario_sessions (fluxo legado com código de acesso)
    let mesarioName: string | null = null;
    const { data: mesarioSession } = await supabase
      .from('mesario_sessions')
      .select('id, campaign_id, expires_at, is_active, mesario_name')
      .eq('id', mesario_session_id)
      .single();

    if (mesarioSession) {
      // Validar sessão legada
      if (!mesarioSession.is_active || new Date(mesarioSession.expires_at) < new Date()) {
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
      mesarioName = mesarioSession.mesario_name;
    } else {
      // Fallback 1: verificar mesario_accounts (fluxo com login por usuário/senha)
      const { data: mesarioAccount } = await supabase
        .from('mesario_accounts')
        .select('id, full_name, is_active')
        .eq('id', mesario_session_id)
        .maybeSingle();

      let hasValidMesarioIdentity = !!(mesarioAccount && mesarioAccount.is_active);
      if (mesarioAccount?.full_name) {
        mesarioName = mesarioAccount.full_name;
      }

      // Fallback 2: compatibilidade com sessões antigas que armazenam profile.id
      if (!hasValidMesarioIdentity) {
        const { data: profileIdentity } = await supabase
          .from('profiles')
          .select('id, role, full_name')
          .eq('id', mesario_session_id)
          .maybeSingle();

        if (profileIdentity?.full_name) {
          mesarioName = profileIdentity.full_name;
        }

        if (profileIdentity?.role === 'admin') {
          hasValidMesarioIdentity = true;
        } else if (profileIdentity?.role === 'organization') {
          const { data: campaignOrg } = await supabase
            .from('campaigns')
            .select('organization_id')
            .eq('id', campaign_id)
            .maybeSingle();

          if (campaignOrg?.organization_id) {
            const { data: membership } = await supabase
              .from('organization_members')
              .select('id')
              .eq('organization_id', campaignOrg.organization_id)
              .eq('user_id', mesario_session_id)
              .eq('is_active', true)
              .in('role', ['owner', 'admin'])
              .limit(1);

            hasValidMesarioIdentity = !!(membership && membership.length > 0);
          }
        }
      }

      if (!hasValidMesarioIdentity) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Sessão de mesário inválida ou expirada' 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
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
    // Compatibilidade: considerar NULL como ativo em dados legados.
    if (!isApproved) {
      const { data: assignment } = await supabase
        .from('campaign_photographers')
        .select('id, is_active')
        .eq('campaign_id', campaign_id)
        .eq('photographer_id', photographer_id)
        .or('is_active.is.null,is_active.eq.true')
        .limit(1);

      if (assignment && assignment.length > 0) {
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
      .order('confirmed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

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
          confirmed_by_mesario: mesarioName,
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
