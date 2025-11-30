// 🔐 Email de Recuperação de Senha - STA Fotos
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { sendEmail } from '../_shared/resend.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { userEmail, userName, resetLink } = await req.json();

    if (!userEmail || !resetLink) {
      throw new Error('Email e link de reset são obrigatórios');
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #e5e5e5; max-width: 600px; margin: 0 auto; padding: 0; background: #0a0a0a;">
          <div style="background: linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%); padding: 40px 20px; text-align: center; border-bottom: 2px solid #e6b800;">
            <img src="https://www.stafotos.com/lovable-uploads/6fdfc5d2-230c-4142-bf7c-3a326e5e45a8.png" alt="STA Fotos" style="height: 60px; margin-bottom: 20px;">
            <h1 style="color: #e6b800; margin: 0; font-size: 32px; font-weight: bold; text-shadow: 0 2px 4px rgba(230, 184, 0, 0.3);">Recuperação de Senha 🔐</h1>
            <p style="color: #a3a3a3; margin: 10px 0 0 0; font-size: 14px;">Redefina sua senha com segurança</p>
          </div>
          
          <div style="padding: 40px 30px; background: #1a1a1a;">
            <p style="font-size: 16px; margin-bottom: 20px; color: #e5e5e5;">
              Olá <strong style="color: #e6b800;">${userName || 'usuário(a)'}</strong>,
            </p>
            
            <p style="font-size: 16px; margin-bottom: 25px; color: #d4d4d4;">
              Recebemos uma solicitação para redefinir a senha da sua conta na <strong style="color: #e6b800;">STA Fotos</strong>.
            </p>

            <div style="background: #2d2d0d; border-left: 4px solid #fbbf24; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
              <p style="margin: 0 0 10px 0; font-weight: bold; color: #fbbf24;">⚠️ Importante:</p>
              <p style="margin: 0; font-size: 14px; color: #d4d4d4;">Se você não solicitou esta alteração, ignore este email. Sua senha permanecerá a mesma.</p>
              <p style="margin: 10px 0 0 0; font-size: 14px; color: #d4d4d4;">Este link expira em <strong style="color: #fbbf24;">1 hora</strong>.</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" 
                 style="display: inline-block; padding: 16px 48px; background: linear-gradient(135deg, #e6b800 0%, #d4a700 100%); color: #0d0d0d; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 12px rgba(230, 184, 0, 0.4);">
                Redefinir Minha Senha
              </a>
            </div>

            <p style="color: #a3a3a3; font-size: 14px; margin-top: 20px;">
              Ou copie e cole este link no seu navegador:<br>
              <span style="word-break: break-all; color: #e6b800;">${resetLink}</span>
            </p>
          </div>

          <div style="padding: 30px 20px; background: #0d0d0d; color: #a3a3a3; text-align: center; border-top: 1px solid #262626;">
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #d4d4d4;">
              Sua segurança é nossa prioridade!
            </p>
            <p style="margin: 0; font-size: 12px; color: #737373;">
              © 2025 STA Fotos - Todos os direitos reservados
            </p>
            <p style="margin: 15px 0 0 0; font-size: 12px;">
              <a href="https://www.stafotos.com" style="color: #e6b800; text-decoration: none; font-weight: 500;">www.stafotos.com</a>
            </p>
          </div>
        </body>
      </html>
    `;

    await sendEmail({
      to: userEmail,
      subject: '🔐 Recuperação de Senha - STA Fotos',
      html,
      from: 'STA Fotos <noreply@stafotos.com>'
    });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
