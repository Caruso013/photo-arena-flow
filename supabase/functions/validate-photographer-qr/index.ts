// @ts-nocheck - Deno Edge Function
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// Função para verificar HMAC
async function verifyHMAC(data: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );
  
  const signatureBytes = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
  const dataBytes = encoder.encode(data);
  
  return crypto.subtle.verify('HMAC', key, signatureBytes, dataBytes);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { qr_token, campaign_id, mesario_session_id } = await req.json();

    if (!qr_token || !campaign_id || !mesario_session_id) {
      return new Response(
        JSON.stringify({ error: 'qr_token, campaign_id e mesario_session_id são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se sessão do mesário é válida
    // Primeiro tenta mesario_sessions (fluxo legado com código de acesso)
    const { data: mesarioSession, error: mesarioSessionError } = await supabase
      .from('mesario_sessions')
      .select('id, campaign_id, expires_at, is_active')
      .eq('id', mesario_session_id)
      .maybeSingle();

    if (mesarioSessionError) {
      console.error('Erro ao consultar mesario_sessions:', mesarioSessionError);
      return new Response(
        JSON.stringify({ valid: false, error: 'Erro ao validar sessão do mesário' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (mesarioSession) {
      // Validar sessão legada
      if (!mesarioSession.is_active || new Date(mesarioSession.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ 
            valid: false, 
            error: 'Sessão de mesário inválida ou expirada' 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (mesarioSession.campaign_id !== campaign_id) {
        return new Response(
          JSON.stringify({ 
            valid: false, 
            error: 'Esta sessão não é válida para este evento' 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Fallback 1: verificar mesario_accounts (fluxo com login por usuário/senha)
      const { data: mesarioAccount } = await supabase
        .from('mesario_accounts')
        .select('id, is_active')
        .eq('id', mesario_session_id)
        .maybeSingle();

      let hasValidMesarioIdentity = !!(mesarioAccount && mesarioAccount.is_active);

      // Fallback 2: compatibilidade com sessões antigas que armazenam profile.id
      if (!hasValidMesarioIdentity) {
        const { data: profileIdentity } = await supabase
          .from('profiles')
          .select('id, role')
          .eq('id', mesario_session_id)
          .maybeSingle();

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
            valid: false, 
            error: 'Sessão de mesário inválida ou expirada' 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Extrair token do formato STA-PHOTO:xxx e normalizar espaços/quebras de linha
    const normalizedQr = String(qr_token || '').trim();
    const tokenData = normalizedQr.startsWith('STA-PHOTO:')
      ? normalizedQr.replace('STA-PHOTO:', '').trim()
      : normalizedQr;

    // Buscar token no banco (formato principal)
    let { data: qrToken } = await supabase
      .from('photographer_qr_tokens')
      .select(`
        id,
        photographer_id,
        token,
        photographer:profiles!photographer_qr_tokens_photographer_id_fkey(
          id,
          full_name,
          avatar_url,
          email,
          role
        )
      `)
      .eq('token', tokenData)
      .maybeSingle();

    // Compatibilidade: aceitar QR de fallback com UUID do fotógrafo
    if (!qrToken && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(tokenData)) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email, role')
        .eq('id', tokenData)
        .maybeSingle();

      if (profile) {
        qrToken = {
          id: null,
          photographer_id: profile.id,
          token: tokenData,
          photographer: profile,
        };
      }
    }

    if (!qrToken) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'QR Code inválido ou não reconhecido',
          approved: false
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se é realmente fotógrafo
    if (qrToken.photographer?.role !== 'photographer') {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Este usuário não é um fotógrafo',
          approved: false
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar aprovação por múltiplas fontes
    let isApproved = false;
    let approvalSource: string | null = null;
    let application: { applied_at: string; processed_at: string | null } | null = null;

    // 1. Verificar se é o criador do evento
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('photographer_id')
      .eq('id', campaign_id)
      .single();

    if (campaign?.photographer_id === qrToken.photographer_id) {
      isApproved = true;
      approvalSource = 'event_creator';
    }

    // 2. Verificar se está atribuído via campaign_photographers
    // Compatibilidade: considerar NULL como ativo em dados legados.
    if (!isApproved) {
      const { data: assignment } = await supabase
        .from('campaign_photographers')
        .select('id, assigned_at, is_active')
        .eq('campaign_id', campaign_id)
        .eq('photographer_id', qrToken.photographer_id)
        .or('is_active.is.null,is_active.eq.true')
        .limit(1);

      if (assignment && assignment.length > 0) {
        isApproved = true;
        approvalSource = 'assigned';
      }
    }

    // 3. Verificar candidatura aprovada (mantém compatibilidade)
    if (!isApproved) {
      const { data: appData } = await supabase
        .from('event_applications')
        .select('id, status, applied_at, processed_at')
        .eq('campaign_id', campaign_id)
        .eq('photographer_id', qrToken.photographer_id)
        .eq('status', 'approved')
        .single();
        
      if (appData) {
        isApproved = true;
        approvalSource = 'application';
        application = appData;
      }
    }

    // Verificar se já confirmou presença
    const { data: existingAttendance } = await supabase
      .from('event_attendance')
      .select('id, confirmed_at')
      .eq('campaign_id', campaign_id)
      .eq('photographer_id', qrToken.photographer_id)
      .order('confirmed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return new Response(
      JSON.stringify({
        valid: true,
        approved: isApproved,
        approval_source: approvalSource,
        already_confirmed: !!existingAttendance,
        confirmed_at: existingAttendance?.confirmed_at || null,
        photographer: {
          id: qrToken.photographer_id,
          full_name: qrToken.photographer?.full_name,
          avatar_url: qrToken.photographer?.avatar_url
        },
        application: application ? {
          applied_at: application.applied_at,
          processed_at: application.processed_at
        } : null
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
