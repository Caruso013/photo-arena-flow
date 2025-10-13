// 🎯 Email de Nova Campanha para Admin - STA Fotos
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from 'npm:resend@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    const { 
      adminEmail,
      campaignTitle,
      campaignDescription,
      photographerName,
      photographerEmail,
      eventDate,
      location,
      campaignId,
    } = await req.json();

    const targetEmail = adminEmail || Deno.env.get('ADMIN_EMAIL') || 'admin@stafotos.com';

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
            <h1 style="color: #e6b800; margin: 0; font-size: 28px; font-weight: bold;">Novo Evento Criado! 🎉</h1>
          </div>
          
          <div style="padding: 30px 20px; background: #ffffff;">
            <p style="font-size: 16px; margin-bottom: 20px;">
              Olá <strong>Admin</strong>,
            </p>
            
            <p style="font-size: 16px; margin-bottom: 25px;">
              Um novo evento foi criado na plataforma <strong style="color: #e6b800;">STA Fotos</strong> e está aguardando revisão.
            </p>

            <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #e6b800;">
              <h2 style="color: #0d0d0d; margin-top: 0; font-size: 20px; font-weight: bold;">📋 Detalhes do Evento:</h2>
              <p style="margin: 8px 0;"><strong>Título:</strong> <span style="color: #e6b800; font-size: 18px;">${campaignTitle}</span></p>
              ${campaignDescription ? `<p style="margin: 8px 0;"><strong>Descrição:</strong> ${campaignDescription}</p>` : ''}
              <p style="margin: 8px 0;"><strong>Fotógrafo:</strong> ${photographerName} (<a href="mailto:${photographerEmail}" style="color: #e6b800; text-decoration: none;">${photographerEmail}</a>)</p>
              ${eventDate ? `<p style="margin: 8px 0;"><strong>Data do evento:</strong> ${formatDate(eventDate)}</p>` : ''}
              ${location ? `<p style="margin: 8px 0;"><strong>Local:</strong> ${location}</p>` : ''}
            </div>

            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; border-radius: 4px; margin-bottom: 25px;">
              <p style="margin: 0 0 8px 0; font-weight: bold;">⚠️ Ação Necessária:</p>
              <p style="margin: 0; font-size: 14px;">Revise o evento e aprove ou solicite alterações conforme necessário.</p>
              <p style="margin: 8px 0 0 0; font-size: 14px;">O fotógrafo receberá uma notificação assim que você processar a solicitação.</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="https://www.stafotos.com/admin/dashboard?view=campaigns${campaignId ? `&id=${campaignId}` : ''}" 
                 style="display: inline-block; padding: 15px 40px; background: #e6b800; color: #0d0d0d; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                Revisar Evento
              </a>
            </div>

            ${campaignId ? `<p style="font-size: 14px; text-align: center; color: #666; margin-top: 25px;">ID do Evento: <code style="background: #f0f0f0; padding: 2px 6px; border-radius: 3px;">${campaignId}</code></p>` : ''}
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
      to: [targetEmail],
      subject: '🎉 Novo Evento Criado - STA Fotos',
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
