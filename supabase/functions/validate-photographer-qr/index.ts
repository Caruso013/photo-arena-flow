// @ts-nocheck - Deno Edge Function
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    const { data: mesarioSession } = await supabase
      .from('mesario_sessions')
      .select('id, campaign_id, expires_at, is_active')
      .eq('id', mesario_session_id)
      .single();

    if (!mesarioSession || !mesarioSession.is_active || new Date(mesarioSession.expires_at) < new Date()) {
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

    // Extrair token do formato STA-PHOTO:xxx
    let tokenData: string;
    if (qr_token.startsWith('STA-PHOTO:')) {
      tokenData = qr_token.replace('STA-PHOTO:', '');
    } else {
      tokenData = qr_token;
    }

    // Buscar token no banco
    const { data: qrToken, error: tokenError } = await supabase
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
      .single();

    if (tokenError || !qrToken) {
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
    if (!isApproved) {
      const { data: assignment } = await supabase
        .from('campaign_photographers')
        .select('id, assigned_at')
        .eq('campaign_id', campaign_id)
        .eq('photographer_id', qrToken.photographer_id)
        .eq('is_active', true)
        .single();

      if (assignment) {
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
      .single();

    return new Response(
      JSON.stringify({
        valid: true,
        approved: isApproved,
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
