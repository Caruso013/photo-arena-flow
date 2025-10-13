// 💰 Email de Notificação de Venda - STA Fotos
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from 'npm:resend@2.0.0';

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    const { 
      photographerEmail, 
      photographerName,
      photoTitle,
      campaignTitle,
      saleAmount,
      photographerAmount,
      buyerName,
    } = await req.json();

    if (!photographerEmail) {
      throw new Error('Email do fotógrafo é obrigatório');
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
            <h1 style="color: #e6b800; margin: 0; font-size: 28px; font-weight: bold;">Você vendeu uma foto! 🎉</h1>
          </div>
          
          <div style="padding: 30px 20px; background: #ffffff;">
            <p style="font-size: 16px; margin-bottom: 20px;">
              Olá <strong style="color: #e6b800;">${photographerName}</strong>,
            </p>
            
            <p style="font-size: 16px; margin-bottom: 25px;">
              Temos uma ótima notícia! Uma das suas fotos foi comprada na plataforma STA Fotos.
            </p>

            <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #e6b800;">
              <h2 style="color: #0d0d0d; margin-top: 0; font-size: 20px; font-weight: bold;">📊 Detalhes da Venda:</h2>
              <p style="margin: 8px 0;"><strong>Foto:</strong> ${photoTitle || 'Sem título'}</p>
              <p style="margin: 8px 0;"><strong>Evento:</strong> ${campaignTitle}</p>
              <p style="margin: 8px 0;"><strong>Comprador:</strong> ${buyerName || 'Cliente'}</p>
              <p style="margin: 8px 0;"><strong>Valor total:</strong> <span style="color: #e6b800; font-size: 18px; font-weight: bold;">${formatCurrency(saleAmount)}</span></p>
              <p style="margin: 8px 0;"><strong>Seu repasse:</strong> <span style="color: #28a745; font-size: 18px; font-weight: bold;">${formatCurrency(photographerAmount)}</span></p>
            </div>

            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; border-radius: 4px; margin-bottom: 25px;">
              <p style="margin: 0 0 8px 0; font-weight: bold;">ℹ️ Sobre o repasse:</p>
              <p style="margin: 0; font-size: 14px;">O valor estará disponível para saque após <strong>12 horas</strong> da confirmação da compra.</p>
              <p style="margin: 8px 0 0 0; font-size: 14px;">Você pode solicitar o repasse diretamente no seu dashboard.</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="https://www.stafotos.com/dashboard" 
                 style="display: inline-block; padding: 15px 40px; background: #e6b800; color: #0d0d0d; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                Ver no Dashboard
              </a>
            </div>

            <p style="font-size: 16px; text-align: center;">Continue capturando momentos incríveis! 📸</p>
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
      subject: '🎉 Você vendeu uma foto! - STA Fotos',
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
