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
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #e5e5e5; max-width: 600px; margin: 0 auto; padding: 0; background: #0a0a0a;">
          <div style="background: linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%); padding: 40px 20px; text-align: center; border-bottom: 2px solid #e6b800;">
            <img src="https://www.stafotos.com/lovable-uploads/6fdfc5d2-230c-4142-bf7c-3a326e5e45a8.png" alt="STA Fotos" style="height: 60px; margin-bottom: 20px;">
            <h1 style="color: #e6b800; margin: 0; font-size: 32px; font-weight: bold; text-shadow: 0 2px 4px rgba(230, 184, 0, 0.3);">Você vendeu uma foto! 🎉</h1>
            <p style="color: #a3a3a3; margin: 10px 0 0 0; font-size: 14px;">Parabéns pela venda!</p>
          </div>
          
          <div style="padding: 40px 30px; background: #1a1a1a;">
            <p style="font-size: 16px; margin-bottom: 20px; color: #e5e5e5;">
              Olá <strong style="color: #e6b800;">${photographerName}</strong>,
            </p>
            
            <p style="font-size: 16px; margin-bottom: 25px; color: #d4d4d4;">
              Temos uma ótima notícia! Uma das suas fotos foi comprada na plataforma STA Fotos.
            </p>

            <div style="background: #2d2d2d; padding: 25px; border-radius: 12px; margin-bottom: 30px; border: 1px solid #404040; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);">
              <h2 style="color: #e6b800; margin-top: 0; font-size: 20px; font-weight: bold;">📊 Detalhes da Venda:</h2>
              <p style="margin: 8px 0; color: #d4d4d4;"><strong style="color: #fbbf24;">Foto:</strong> ${photoTitle || 'Sem título'}</p>
              <p style="margin: 8px 0; color: #d4d4d4;"><strong style="color: #fbbf24;">Evento:</strong> ${campaignTitle}</p>
              <p style="margin: 8px 0; color: #d4d4d4;"><strong style="color: #fbbf24;">Comprador:</strong> ${buyerName || 'Cliente'}</p>
              <p style="margin: 8px 0; color: #d4d4d4;"><strong style="color: #fbbf24;">Valor total:</strong> <span style="color: #e6b800; font-size: 18px; font-weight: bold;">${formatCurrency(saleAmount)}</span></p>
              <p style="margin: 8px 0; color: #d4d4d4;"><strong style="color: #fbbf24;">Seu repasse:</strong> <span style="color: #4caf50; font-size: 18px; font-weight: bold;">${formatCurrency(photographerAmount)}</span></p>
            </div>

            <div style="background: #2d2d0d; border-left: 4px solid #fbbf24; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
              <p style="margin: 0 0 8px 0; font-weight: bold; color: #fbbf24;">ℹ️ Sobre o repasse:</p>
              <p style="margin: 0; font-size: 14px; color: #d4d4d4;">O valor estará disponível para saque após <strong style="color: #fbbf24;">12 horas</strong> da confirmação da compra.</p>
              <p style="margin: 8px 0 0 0; font-size: 14px; color: #d4d4d4;">Você pode solicitar o repasse diretamente no seu dashboard.</p>
            </div>

            <div style="text-align: center; margin: 40px 0;">
              <a href="https://www.stafotos.com/dashboard" 
                 style="display: inline-block; padding: 16px 48px; background: linear-gradient(135deg, #e6b800 0%, #d4a700 100%); color: #0d0d0d; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 12px rgba(230, 184, 0, 0.4);">
                Ver no Dashboard
              </a>
            </div>

            <p style="font-size: 16px; text-align: center; color: #e5e5e5;">Continue capturando momentos incríveis! 📸</p>
          </div>

          <div style="padding: 30px 20px; background: #0d0d0d; color: #a3a3a3; text-align: center; border-top: 1px solid #262626;">
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
