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
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 0; background: #f5f5f5;">
          <div style="background: #0d0d0d; padding: 30px 20px; text-align: center;">
            <img src="https://www.stafotos.com/lovable-uploads/6fdfc5d2-230c-4142-bf7c-3a326e5e45a8.png" alt="STA Fotos" style="height: 50px; margin-bottom: 15px;">
            <h1 style="color: #e6b800; margin: 0; font-size: 28px; font-weight: bold;">Compra Confirmada! ✅</h1>
          </div>
          
          <div style="padding: 30px 20px; background: #ffffff;">
            <p style="font-size: 16px; margin-bottom: 20px;">
              Olá <strong style="color: #e6b800;">${buyerName || 'Cliente'}</strong>,
            </p>
            
            <p style="font-size: 16px; margin-bottom: 25px;">
              Sua compra foi confirmada com sucesso! Sua foto em alta resolução já está disponível para download.
            </p>

            <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #e6b800;">
              <h2 style="color: #0d0d0d; margin-top: 0; font-size: 20px; font-weight: bold;">📸 Detalhes da Compra:</h2>
              <p style="margin: 8px 0;"><strong>Foto:</strong> ${photoTitle || 'Sem título'}</p>
              <p style="margin: 8px 0;"><strong>Evento:</strong> ${campaignTitle}</p>
              <p style="margin: 8px 0;"><strong>Fotógrafo:</strong> ${photographerName}</p>
              <p style="margin: 8px 0;"><strong>Valor pago:</strong> <span style="color: #e6b800; font-size: 18px; font-weight: bold;">${formatCurrency(amount)}</span></p>
            </div>

            ${downloadLink ? `
            <div style="text-align: center; margin: 30px 0;">
              <a href="${downloadLink}" 
                 style="display: inline-block; padding: 15px 40px; background: #e6b800; color: #0d0d0d; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                📥 Baixar Foto Original
              </a>
            </div>
            ` : `
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://www.stafotos.com/dashboard?tab=purchases" 
                 style="display: inline-block; padding: 15px 40px; background: #e6b800; color: #0d0d0d; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                Ver Minhas Compras
              </a>
            </div>
            `}

            <div style="background: #d4edda; border-left: 4px solid #28a745; padding: 15px; border-radius: 4px; margin-bottom: 25px;">
              <p style="margin: 0 0 8px 0; font-weight: bold;">✨ Sua foto está sem marca d'água!</p>
              <p style="margin: 0; font-size: 14px;">Você pode fazer o download quantas vezes quiser através do seu dashboard.</p>
              <p style="margin: 8px 0 0 0; font-size: 14px;">A foto estará sempre disponível na sua biblioteca de compras.</p>
            </div>

            <p style="font-size: 16px; text-align: center;">Obrigado por usar a STA Fotos! 💜</p>
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
