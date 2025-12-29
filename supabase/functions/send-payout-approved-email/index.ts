// 💸 Email de Repasse Aprovado - STA Fotos
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // ========== VALIDAÇÃO DE ROLE (ADMIN ONLY) ==========
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      console.warn('Tentativa de envio de email de repasse sem autenticação');
      return new Response(
        JSON.stringify({ error: 'Token de autenticação não fornecido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      console.warn('Token inválido ou expirado para envio de email de repasse');
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se é admin
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      console.warn(`Tentativa não autorizada de enviar email de repasse por usuário ${user.id} com role ${profile?.role}`);
      return new Response(
        JSON.stringify({ error: 'Apenas administradores podem enviar emails de aprovação de repasse' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Admin autorizado para enviar email de repasse:', user.id);
    // ========== FIM DA VALIDAÇÃO DE ROLE ==========

    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    const { 
      photographerEmail, 
      photographerName,
      amount,
      requestedAt,
      approvedAt,
      paymentMethod,
      estimatedDate,
    } = await req.json();

    if (!photographerEmail) {
      throw new Error('Email do fotógrafo é obrigatório');
    }

    console.log('Enviando email de repasse aprovado para:', photographerEmail);

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 0; background: #f5f5f5;">
          <div style="background: #0d0d0d; padding: 30px 20px; text-align: center;">
            <img src="https://www.stafotos.com/lovable-uploads/6fdfc5d2-230c-4142-bf7c-3a326e5e45a8.png" alt="STA Fotos" style="height: 50px; margin-bottom: 15px;">
            <h1 style="color: #e6b800; margin: 0; font-size: 28px; font-weight: bold;">Repasse Aprovado! 💰</h1>
          </div>
          
          <div style="padding: 30px 20px; background: #ffffff;">
            <p style="font-size: 16px; margin-bottom: 20px;">
              Olá <strong style="color: #e6b800;">${photographerName}</strong>,
            </p>
            
            <p style="font-size: 16px; margin-bottom: 25px;">
              Ótimas notícias! Seu pedido de repasse foi <strong>aprovado</strong> e o pagamento está sendo processado.
            </p>

            <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #e6b800;">
              <h2 style="color: #0d0d0d; margin-top: 0; font-size: 20px; font-weight: bold;">💵 Detalhes do Repasse:</h2>
              <p style="margin: 8px 0;"><strong>Valor:</strong> <span style="color: #28a745; font-size: 24px; font-weight: bold;">${formatCurrency(amount)}</span></p>
              <p style="margin: 8px 0;"><strong>Solicitado em:</strong> ${formatDate(requestedAt)}</p>
              <p style="margin: 8px 0;"><strong>Aprovado em:</strong> ${formatDate(approvedAt || new Date().toISOString())}</p>
              ${paymentMethod ? `<p style="margin: 8px 0;"><strong>Forma de pagamento:</strong> ${paymentMethod}</p>` : ''}
              ${estimatedDate ? `<p style="margin: 8px 0;"><strong>Previsão de recebimento:</strong> ${formatDate(estimatedDate)}</p>` : ''}
            </div>

            <div style="background: #d4edda; border-left: 4px solid #28a745; padding: 15px; border-radius: 4px; margin-bottom: 25px;">
              <p style="margin: 0 0 8px 0; font-weight: bold;">✅ Próximos passos:</p>
              <p style="margin: 0; font-size: 14px;">O pagamento será processado em até <strong>2 dias úteis</strong>.</p>
              <p style="margin: 8px 0 0 0; font-size: 14px;">Você receberá o valor diretamente na conta cadastrada.</p>
              <p style="margin: 8px 0 0 0; font-size: 14px;">Acompanhe o status no seu dashboard.</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="https://www.stafotos.com/dashboard?tab=payouts" 
                 style="display: inline-block; padding: 15px 40px; background: #e6b800; color: #0d0d0d; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                Ver Meus Repasses
              </a>
            </div>

            <p style="font-size: 16px; text-align: center;">Continue vendendo suas fotos incríveis! 📸</p>
          </div>

          <div style="padding: 25px 20px; background: #0d0d0d; color: #fafafa; text-align: center;">
            <p style="margin: 0; font-size: 12px; color: #999;">
              © 2025 STA Fotos - Todos os direitos reservados
            </p>
            <p style="margin: 10px 0 0 0; font-size: 12px;">
              <a href="https://www.stafotos.com" style="color: #e6b800; text-decoration: none;">www.stafotos.com</a>
            </p>
          </div>
        </body>
      </html>
    `;

    await resend.emails.send({
      from: 'STA Fotos <noreply@stafotos.com>',
      to: [photographerEmail],
      subject: '💰 Repasse Aprovado - STA Fotos',
      html,
    });

    console.log('Email de repasse aprovado enviado com sucesso para:', photographerEmail);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erro ao enviar email de repasse:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
