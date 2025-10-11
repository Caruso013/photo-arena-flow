import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from 'npm:resend@2.0.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { purchaseIds } = await req.json();
    console.log('Sending confirmation for purchases:', purchaseIds);

    if (!purchaseIds || purchaseIds.length === 0) {
      throw new Error('No purchase IDs provided');
    }

    // Buscar informações das compras
    const { data: purchases, error: purchasesError } = await supabase
      .from('purchases')
      .select(`
        *,
        photo:photos(
          title,
          watermarked_url,
          original_url,
          campaign:campaigns(
            title,
            event_date
          )
        ),
        buyer:profiles!purchases_buyer_id_fkey(
          email,
          full_name
        ),
        photographer:profiles!purchases_photographer_id_fkey(
          full_name
        )
      `)
      .in('id', purchaseIds);

    if (purchasesError) {
      console.error('Error fetching purchases:', purchasesError);
      throw purchasesError;
    }

    if (!purchases || purchases.length === 0) {
      throw new Error('No purchases found');
    }

    // Agrupar por comprador
    const buyerPurchases = new Map();
    for (const purchase of purchases) {
      const buyerEmail = purchase.buyer.email;
      if (!buyerPurchases.has(buyerEmail)) {
        buyerPurchases.set(buyerEmail, {
          buyerName: purchase.buyer.full_name || 'Cliente',
          purchases: []
        });
      }
      buyerPurchases.get(buyerEmail).purchases.push(purchase);
    }

    // Enviar email para cada comprador
    for (const [email, data] of buyerPurchases) {
      const totalAmount = data.purchases.reduce((sum, p) => sum + Number(p.amount), 0);
      
      const photosHtml = data.purchases.map(p => `
        <div style="margin-bottom: 20px; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h3 style="margin: 0 0 10px 0; color: #0d0d0d; font-size: 16px;">${p.photo.title || 'Foto'}</h3>
          <p style="margin: 5px 0; color: #666; font-size: 14px;">
            <strong style="color: #e6b800;">Evento:</strong> ${p.photo.campaign.title}<br>
            <strong style="color: #e6b800;">Valor:</strong> R$ ${Number(p.amount).toFixed(2)}
          </p>
          <img src="${p.photo.watermarked_url}" alt="${p.photo.title}" style="max-width: 100%; height: auto; border-radius: 4px; margin-top: 10px; border: 2px solid #e6b800;">
        </div>
      `).join('');

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
              <h1 style="color: #e6b800; margin: 0; font-size: 28px; font-weight: bold;">Compra Confirmada! 🎉</h1>
            </div>
            
            <!-- Corpo do Email -->
            <div style="padding: 30px 20px; background: #ffffff;">
              <p style="font-size: 16px; margin-bottom: 20px; color: #333;">
                Olá <strong style="color: #e6b800;">${data.buyerName}</strong>,
              </p>
              
              <p style="font-size: 16px; margin-bottom: 25px; color: #333;">
                Sua compra foi confirmada com sucesso! Você já pode fazer o download das suas fotos em alta resolução na área "Minhas Compras" do dashboard.
              </p>

              <!-- Detalhes da Compra -->
              <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #e6b800;">
                <h2 style="color: #0d0d0d; margin-top: 0; font-size: 20px; font-weight: bold;">Detalhes da Compra</h2>
                ${photosHtml}
                
                <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #e6b800;">
                  <p style="font-size: 18px; margin: 0; color: #0d0d0d;">
                    <strong>Total:</strong> <span style="color: #e6b800; font-weight: bold;">R$ ${totalAmount.toFixed(2)}</span>
                  </p>
                </div>
              </div>

              <!-- Botão de Ação -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://www.stafotos.com/#/dashboard/purchases" 
                   style="display: inline-block; padding: 15px 40px; background: #e6b800; color: #0d0d0d; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                  Acessar Minhas Compras
                </a>
              </div>

              <!-- Informação Importante -->
              <div style="background: #fff8dc; border-left: 4px solid #e6b800; padding: 15px; margin-top: 25px; border-radius: 4px;">
                <p style="font-size: 14px; color: #333; margin: 0;">
                  <strong style="color: #e6b800;">💡 Importante:</strong> As fotos ficam disponíveis para download na sua área de "Minhas Compras". Você pode baixá-las a qualquer momento.
                </p>
              </div>
            </div>

            <!-- Footer Preto STA -->
            <div style="padding: 25px 20px; background: #0d0d0d; color: #fafafa; text-align: center;">
              <p style="margin: 0 0 10px 0; font-size: 14px;">
                Obrigado por sua compra!
              </p>
              <p style="margin: 0; font-size: 12px; color: #999;">
                © 2025 STA Fotos - Todos os direitos reservados
              </p>
              <p style="margin: 10px 0 0 0; font-size: 12px;">
                <a href="https://www.stafotos.com/#/" style="color: #e6b800; text-decoration: none;">www.stafotos.com</a>
              </p>
            </div>
          </body>
        </html>
      `;

      console.log(`Sending email to ${email}`);
      
      const emailResponse = await resend.emails.send({
        from: 'STA Fotos <noreply@stafotos.com>',
        to: [email],
        subject: `✅ Compra Confirmada - ${data.purchases.length} ${data.purchases.length === 1 ? 'foto' : 'fotos'}`,
        html,
      });

      console.log('Email sent successfully:', emailResponse);
    }

    return new Response(
      JSON.stringify({ success: true, emailsSent: buyerPurchases.size }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error sending emails:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
