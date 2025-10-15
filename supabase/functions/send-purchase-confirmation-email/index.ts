// ✅ Email de Confirmação de Compra - STA Fotos
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
      buyerEmail, 
      buyerName,
      photoTitle,
      campaignTitle,
      amount,
      downloadLink,
      photographerName,
    } = await req.json();

    if (!buyerEmail) {
      throw new Error('Email do comprador é obrigatório');
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
            <h1 style="color: #e6b800; margin: 0; font-size: 32px; font-weight: bold; text-shadow: 0 2px 4px rgba(230, 184, 0, 0.3);">Compra Confirmada! ✅</h1>
            <p style="color: #a3a3a3; margin: 10px 0 0 0; font-size: 14px;">Sua foto já está disponível</p>
          </div>
          
          <div style="padding: 40px 30px; background: #1a1a1a;">
            <p style="font-size: 16px; margin-bottom: 20px; color: #e5e5e5;">
              Olá <strong style="color: #e6b800;">${buyerName || 'Cliente'}</strong>,
            </p>
            
            <p style="font-size: 16px; margin-bottom: 25px; color: #d4d4d4;">
              Sua compra foi confirmada com sucesso! Sua foto em alta resolução já está disponível para download.
            </p>

            <div style="background: #2d2d2d; padding: 25px; border-radius: 12px; margin-bottom: 30px; border: 1px solid #404040; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);">
              <h2 style="color: #e6b800; margin-top: 0; font-size: 20px; font-weight: bold;">📸 Detalhes da Compra:</h2>
              <p style="margin: 8px 0; color: #d4d4d4;"><strong style="color: #fbbf24;">Foto:</strong> ${photoTitle || 'Sem título'}</p>
              <p style="margin: 8px 0; color: #d4d4d4;"><strong style="color: #fbbf24;">Evento:</strong> ${campaignTitle}</p>
              <p style="margin: 8px 0; color: #d4d4d4;"><strong style="color: #fbbf24;">Fotógrafo:</strong> ${photographerName}</p>
              <p style="margin: 8px 0; color: #d4d4d4;"><strong style="color: #fbbf24;">Valor pago:</strong> <span style="color: #e6b800; font-size: 18px; font-weight: bold;">${formatCurrency(amount)}</span></p>
            </div>

            ${downloadLink ? `
            <div style="text-align: center; margin: 40px 0;">
              <a href="${downloadLink}" 
                 style="display: inline-block; padding: 16px 48px; background: linear-gradient(135deg, #e6b800 0%, #d4a700 100%); color: #0d0d0d; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 12px rgba(230, 184, 0, 0.4);">
                📥 Baixar Foto Original
              </a>
            </div>
            ` : `
            <div style="text-align: center; margin: 40px 0;">
              <a href="https://www.stafotos.com/dashboard?tab=purchases" 
                 style="display: inline-block; padding: 16px 48px; background: linear-gradient(135deg, #e6b800 0%, #d4a700 100%); color: #0d0d0d; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 12px rgba(230, 184, 0, 0.4);">
                Ver Minhas Compras
              </a>
            </div>
            `}

            <div style="background: #1d3a1d; border-left: 4px solid #4caf50; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
              <p style="margin: 0 0 8px 0; font-weight: bold; color: #4caf50;">✨ Sua foto está sem marca d'água!</p>
              <p style="margin: 0; font-size: 14px; color: #d4d4d4;">Você pode fazer o download quantas vezes quiser através do seu dashboard.</p>
              <p style="margin: 8px 0 0 0; font-size: 14px; color: #d4d4d4;">A foto estará sempre disponível na sua biblioteca de compras.</p>
            </div>

            <p style="font-size: 16px; text-align: center; color: #e5e5e5;">Obrigado por usar a STA Fotos! 💜</p>
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
      to: [buyerEmail],
      subject: '✅ Compra Confirmada - STA Fotos',
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
