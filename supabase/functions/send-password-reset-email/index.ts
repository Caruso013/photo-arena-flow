// 🔐 Email de Recuperação de Senha - STA Fotos
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from 'npm:resend@2.0.0';

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
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
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
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 0; background: #f5f5f5;">
          <div style="background: #0d0d0d; padding: 30px 20px; text-align: center;">
            <img src="https://www.stafotos.com/lovable-uploads/6fdfc5d2-230c-4142-bf7c-3a326e5e45a8.png" alt="STA Fotos" style="height: 50px; margin-bottom: 15px;">
            <h1 style="color: #e6b800; margin: 0; font-size: 28px; font-weight: bold;">Recuperação de Senha 🔐</h1>
          </div>
          
          <div style="padding: 30px 20px; background: #ffffff;">
            <p style="font-size: 16px; margin-bottom: 20px;">
              Olá <strong style="color: #e6b800;">${userName || 'usuário(a)'}</strong>,
            </p>
            
            <p style="font-size: 16px; margin-bottom: 25px;">
              Recebemos uma solicitação para redefinir a senha da sua conta na <strong>STA Fotos</strong>.
            </p>

            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; border-radius: 4px; margin-bottom: 25px;">
              <p style="margin: 0 0 10px 0; font-weight: bold;">⚠️ Importante:</p>
              <p style="margin: 0; font-size: 14px;">Se você não solicitou esta alteração, ignore este email. Sua senha permanecerá a mesma.</p>
              <p style="margin: 10px 0 0 0; font-size: 14px;">Este link expira em <strong>1 hora</strong>.</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" 
                 style="display: inline-block; padding: 15px 40px; background: #e6b800; color: #0d0d0d; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                Redefinir Minha Senha
              </a>
            </div>

            <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
              Ou copie e cole este link no seu navegador:<br>
              <span style="word-break: break-all; color: #e6b800;">${resetLink}</span>
            </p>
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
      to: [userEmail],
      subject: '🔐 Recuperação de Senha - STA Fotos',
      html,
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
