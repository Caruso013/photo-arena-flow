import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from 'npm:resend@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  try {
    console.log('🚀 Edge Function send-welcome-email chamada');
    
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    
    const { email, fullName } = await req.json();
    console.log('📧 Enviando email de boas-vindas para:', email);

    if (!email) {
      throw new Error('Email é obrigatório');
    }

    const userName = fullName || 'Usuário';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #e5e5e5; max-width: 600px; margin: 0 auto; padding: 0; background: #0a0a0a;">
          <!-- Header com Logo e Gradiente Dourado -->
          <div style="background: linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%); padding: 40px 20px; text-align: center; border-bottom: 2px solid #e6b800;">
            <img src="https://www.stafotos.com/lovable-uploads/6fdfc5d2-230c-4142-bf7c-3a326e5e45a8.png" alt="STA Fotos" style="height: 60px; margin-bottom: 20px;">
            <h1 style="color: #e6b800; margin: 0; font-size: 32px; font-weight: bold; text-shadow: 0 2px 4px rgba(230, 184, 0, 0.3);">Bem-vindo ao STA Fotos! 🎉</h1>
            <p style="color: #a3a3a3; margin: 10px 0 0 0; font-size: 14px;">Sua plataforma de fotografia esportiva</p>
          </div>
          
          <!-- Corpo do Email -->
          <div style="padding: 40px 30px; background: #1a1a1a;">
            <p style="font-size: 16px; margin-bottom: 20px; color: #e5e5e5;">
              Olá <strong style="color: #e6b800;">${userName}</strong>,
            </p>
            
            <p style="font-size: 16px; margin-bottom: 30px; color: #d4d4d4;">
              É com grande prazer que damos as boas-vindas à plataforma <strong style="color: #e6b800;">STA Fotos</strong> - a melhor plataforma de fotografia esportiva do Brasil!
            </p>

            <div style="background: #2d2d2d; padding: 25px; border-radius: 12px; margin-bottom: 30px; border: 1px solid #404040; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);">
              <h2 style="color: #e6b800; margin-top: 0; font-size: 20px; font-weight: bold;">O que você pode fazer agora:</h2>
              
              <ul style="color: #d4d4d4; font-size: 15px; line-height: 2; padding-left: 20px; margin: 15px 0 0 0;">
                <li style="margin-bottom: 10px;"><strong style="color: #fbbf24;">📸 Explore eventos</strong> - Navegue pelos campeonatos e encontre suas melhores fotos</li>
                <li style="margin-bottom: 10px;"><strong style="color: #fbbf24;">🛒 Compre fotos</strong> - Adquira fotos em alta qualidade sem marca d'água</li>
                <li style="margin-bottom: 10px;"><strong style="color: #fbbf24;">💾 Baixe suas fotos</strong> - Acesse suas compras a qualquer momento no dashboard</li>
                <li><strong style="color: #fbbf24;">🎨 Reviva momentos</strong> - Guarde para sempre seus melhores momentos esportivos</li>
              </ul>
            </div>

            <!-- Botão de Ação -->
            <div style="text-align: center; margin: 40px 0;">
              <a href="https://www.stafotos.com/events" 
                 style="display: inline-block; padding: 16px 48px; background: linear-gradient(135deg, #e6b800 0%, #d4a700 100%); color: #0d0d0d; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 12px rgba(230, 184, 0, 0.4); transition: all 0.3s;">
                Explorar Eventos
              </a>
            </div>

            <!-- Informação Importante -->
            <div style="background: #2d2d0d; border-left: 4px solid #e6b800; padding: 20px; margin-top: 30px; border-radius: 8px;">
              <p style="font-size: 14px; color: #e5e5e5; margin: 0;">
                <strong style="color: #fbbf24;">💡 Dica:</strong> Confirme seu email para ter acesso completo a todas as funcionalidades da plataforma!
              </p>
            </div>
          </div>

          <!-- Footer Escuro -->
          <div style="padding: 30px 20px; background: #0d0d0d; color: #a3a3a3; text-align: center; border-top: 1px solid #262626;">
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #d4d4d4;">
              Obrigado por se juntar a nós!
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

    const emailResponse = await resend.emails.send({
      from: 'STA Fotos <noreply@stafotos.com>',
      to: [email],
      subject: '🎉 Bem-vindo ao STA Fotos!',
      html,
    });

    console.log('Email de boas-vindas enviado com sucesso:', emailResponse);

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Erro ao enviar email de boas-vindas:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
