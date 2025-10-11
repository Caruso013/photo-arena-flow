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
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 0; background: #f5f5f5;">
          <!-- Header com Logo e Preto STA -->
          <div style="background: #0d0d0d; padding: 30px 20px; text-align: center;">
            <img src="https://www.stafotos.com/lovable-uploads/6fdfc5d2-230c-4142-bf7c-3a326e5e45a8.png" alt="STA Fotos" style="height: 50px; margin-bottom: 15px;">
            <h1 style="color: #e6b800; margin: 0; font-size: 28px; font-weight: bold;">Bem-vindo ao STA Fotos! 🎉</h1>
          </div>
          
          <!-- Corpo do Email -->
          <div style="padding: 30px 20px; background: #ffffff;">
            <p style="font-size: 16px; margin-bottom: 20px; color: #333;">
              Olá <strong style="color: #e6b800;">${userName}</strong>,
            </p>
            
            <p style="font-size: 16px; margin-bottom: 25px; color: #333;">
              É com grande prazer que damos as boas-vindas à plataforma STA Fotos - a melhor plataforma de fotografia esportiva do Brasil!
            </p>

            <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #e6b800;">
              <h2 style="color: #0d0d0d; margin-top: 0; font-size: 20px; font-weight: bold;">O que você pode fazer agora:</h2>
              
              <ul style="color: #333; font-size: 15px; line-height: 1.8;">
                <li><strong>📸 Explore eventos</strong> - Navegue pelos campeonatos e encontre suas melhores fotos</li>
                <li><strong>🛒 Compre fotos</strong> - Adquira fotos em alta qualidade sem marca d'água</li>
                <li><strong>💾 Baixe suas fotos</strong> - Acesse suas compras a qualquer momento no dashboard</li>
                <li><strong>🎨 Reviva momentos</strong> - Guarde para sempre seus melhores momentos esportivos</li>
              </ul>
            </div>

            <!-- Botão de Ação -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://www.stafotos.com/events" 
                 style="display: inline-block; padding: 15px 40px; background: #e6b800; color: #0d0d0d; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                Explorar Eventos
              </a>
            </div>

            <!-- Informação Importante -->
            <div style="background: #fff8dc; border-left: 4px solid #e6b800; padding: 15px; margin-top: 25px; border-radius: 4px;">
              <p style="font-size: 14px; color: #333; margin: 0;">
                <strong style="color: #e6b800;">💡 Dica:</strong> Confirme seu email para ter acesso completo a todas as funcionalidades da plataforma!
              </p>
            </div>
          </div>

          <!-- Footer Preto STA -->
          <div style="padding: 25px 20px; background: #0d0d0d; color: #fafafa; text-align: center;">
            <p style="margin: 0 0 10px 0; font-size: 14px;">
              Obrigado por se juntar a nós!
            </p>
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
