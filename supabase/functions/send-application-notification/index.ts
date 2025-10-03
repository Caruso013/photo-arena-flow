import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  to: string;
  photographerName: string;
  campaignTitle: string;
  status: 'approved' | 'rejected';
  eventDate?: string;
  location?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, photographerName, campaignTitle, status, eventDate, location }: NotificationRequest = await req.json();

    console.log('Sending application notification:', { to, photographerName, campaignTitle, status });

    const isApproved = status === 'approved';
    const subject = isApproved 
      ? `🎉 Parabéns! Sua candidatura foi aprovada` 
      : `Candidatura - ${campaignTitle}`;

    let htmlContent = '';

    if (isApproved) {
      htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
              .success-badge { background: #10b981; color: white; padding: 10px 20px; border-radius: 20px; display: inline-block; margin: 20px 0; }
              .event-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
              .button { background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 20px 0; }
              .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎉 Candidatura Aprovada!</h1>
              </div>
              <div class="content">
                <p>Olá <strong>${photographerName}</strong>,</p>
                
                <div class="success-badge">✓ Candidatura Aprovada</div>
                
                <p>Temos uma ótima notícia! Sua candidatura para fotografar o evento foi <strong>aprovada</strong>!</p>
                
                <div class="event-details">
                  <h3 style="margin-top: 0; color: #667eea;">📸 Detalhes do Evento</h3>
                  <p><strong>Evento:</strong> ${campaignTitle}</p>
                  ${eventDate ? `<p><strong>Data:</strong> ${new Date(eventDate).toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>` : ''}
                  ${location ? `<p><strong>Local:</strong> ${location}</p>` : ''}
                </div>
                
                <p>O que fazer agora:</p>
                <ul>
                  <li>Acesse seu painel de fotógrafo</li>
                  <li>Prepare seu equipamento</li>
                  <li>Após o evento, faça o upload das fotos na plataforma</li>
                  <li>Acompanhe suas vendas e comissões</li>
                </ul>
                
                <p style="margin-top: 30px;">Estamos ansiosos para ver seu trabalho!</p>
                
                <p>Atenciosamente,<br><strong>Equipe STA Photography</strong></p>
              </div>
              <div class="footer">
                <p>© 2024 STA Photography Platform. Todos os direitos reservados.</p>
              </div>
            </div>
          </body>
        </html>
      `;
    } else {
      htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
              .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Candidatura - ${campaignTitle}</h1>
              </div>
              <div class="content">
                <p>Olá <strong>${photographerName}</strong>,</p>
                
                <p>Agradecemos seu interesse em fotografar o evento <strong>${campaignTitle}</strong>.</p>
                
                <p>Infelizmente, desta vez não poderemos contar com você para este evento específico. No entanto, valorizamos seu interesse e encorajamos você a se candidatar para outros eventos disponíveis na plataforma.</p>
                
                <p>Continue acompanhando novos eventos e oportunidades no seu painel.</p>
                
                <p>Atenciosamente,<br><strong>Equipe STA Photography</strong></p>
              </div>
              <div class="footer">
                <p>© 2024 STA Photography Platform. Todos os direitos reservados.</p>
              </div>
            </div>
          </body>
        </html>
      `;
    }

    const emailResponse = await resend.emails.send({
      from: "STA Photography <onboarding@resend.dev>",
      to: [to],
      subject: subject,
      html: htmlContent,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-application-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
