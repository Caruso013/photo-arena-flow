// 📢 Email de Notificação de Candidatura - STA Fotos
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from 'resend';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface NotificationRequest {
  to: string;
  photographerName: string;
  campaignTitle: string;
  status: 'approved' | 'rejected';
  eventDate?: string;
  location?: string;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    const { to, photographerName, campaignTitle, status, eventDate, location }: NotificationRequest = await req.json();

    console.log('Sending application notification:', { to, photographerName, campaignTitle, status });

    const isApproved = status === 'approved';
    const subject = isApproved 
      ? `🎉 Candidatura Aprovada - ${campaignTitle} - STA Fotos` 
      : `Candidatura - ${campaignTitle} - STA Fotos`;

    let html = '';

    if (isApproved) {
      html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 0; background: #f5f5f5;">
            <div style="background: #0d0d0d; padding: 30px 20px; text-align: center;">
              <img src="https://www.stafotos.com/lovable-uploads/6fdfc5d2-230c-4142-bf7c-3a326e5e45a8.png" alt="STA Fotos" style="height: 50px; margin-bottom: 15px;">
              <h1 style="color: #e6b800; margin: 0; font-size: 28px; font-weight: bold;">Candidatura Aprovada! 🎉</h1>
            </div>
            
            <div style="padding: 30px 20px; background: #ffffff;">
              <p style="font-size: 16px; margin-bottom: 20px;">
                Olá <strong style="color: #e6b800;">${photographerName}</strong>,
              </p>
              
              <div style="background: #d4edda; border-left: 4px solid #28a745; padding: 15px; border-radius: 4px; margin-bottom: 25px;">
                <p style="margin: 0; font-weight: bold; color: #155724;">✓ Candidatura Aprovada</p>
              </div>
              
              <p style="font-size: 16px; margin-bottom: 25px;">
                Temos uma ótima notícia! Sua candidatura para fotografar o evento foi <strong>aprovada</strong>!
              </p>

              <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #e6b800;">
                <h2 style="color: #0d0d0d; margin-top: 0; font-size: 20px; font-weight: bold;">📸 Detalhes do Evento</h2>
                <p style="margin: 8px 0;"><strong>Evento:</strong> <span style="color: #e6b800; font-size: 18px;">${campaignTitle}</span></p>
                ${eventDate ? `<p style="margin: 8px 0;"><strong>Data:</strong> ${formatDate(eventDate)}</p>` : ''}
                ${location ? `<p style="margin: 8px 0;"><strong>Local:</strong> ${location}</p>` : ''}
              </div>

              <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; border-radius: 4px; margin-bottom: 25px;">
                <p style="margin: 0 0 8px 0; font-weight: bold;">📋 O que fazer agora:</p>
                <ul style="margin: 0; padding-left: 20px; font-size: 14px;">
                  <li style="margin: 5px 0;">Acesse seu painel de fotógrafo</li>
                  <li style="margin: 5px 0;">Prepare seu equipamento</li>
                  <li style="margin: 5px 0;">Após o evento, faça o upload das fotos na plataforma</li>
                  <li style="margin: 5px 0;">Acompanhe suas vendas e comissões</li>
                </ul>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="https://www.stafotos.com/dashboard" 
                   style="display: inline-block; padding: 15px 40px; background: #e6b800; color: #0d0d0d; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                  Acessar Meu Painel
                </a>
              </div>

              <p style="font-size: 16px; text-align: center;">Estamos ansiosos para ver seu trabalho! 📸</p>
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
    } else {
      html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 0; background: #f5f5f5;">
            <div style="background: #0d0d0d; padding: 30px 20px; text-align: center;">
              <img src="https://www.stafotos.com/lovable-uploads/6fdfc5d2-230c-4142-bf7c-3a326e5e45a8.png" alt="STA Fotos" style="height: 50px; margin-bottom: 15px;">
              <h1 style="color: #e6b800; margin: 0; font-size: 28px; font-weight: bold;">Candidatura - ${campaignTitle}</h1>
            </div>
            
            <div style="padding: 30px 20px; background: #ffffff;">
              <p style="font-size: 16px; margin-bottom: 20px;">
                Olá <strong style="color: #e6b800;">${photographerName}</strong>,
              </p>
              
              <p style="font-size: 16px; margin-bottom: 20px;">
                Agradecemos seu interesse em fotografar o evento <strong>${campaignTitle}</strong>.
              </p>
              
              <p style="font-size: 16px; margin-bottom: 20px;">
                Infelizmente, desta vez não poderemos contar com você para este evento específico. No entanto, valorizamos seu interesse e encorajamos você a se candidatar para outros eventos disponíveis na plataforma.
              </p>

              <div style="background: #e7f3ff; border-left: 4px solid #2196f3; padding: 15px; border-radius: 4px; margin-bottom: 25px;">
                <p style="margin: 0; font-size: 14px;">
                  💡 <strong>Dica:</strong> Continue acompanhando novos eventos e oportunidades no seu painel.
                </p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="https://www.stafotos.com/events" 
                   style="display: inline-block; padding: 15px 40px; background: #e6b800; color: #0d0d0d; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                  Ver Outros Eventos
                </a>
              </div>

              <p style="font-size: 16px; text-align: center;">Não desista! Novas oportunidades surgem todos os dias. 🌟</p>
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
    }

    await resend.emails.send({
      from: 'STA Fotos <noreply@stafotos.com>',
      to: [to],
      subject: subject,
      html,
    });

    console.log('Email sent successfully');

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in send-application-notification function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
