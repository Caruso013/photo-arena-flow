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
        <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h3 style="margin: 0 0 10px 0; color: #333;">${p.photo.title || 'Foto'}</h3>
          <p style="margin: 5px 0; color: #666;">
            <strong>Evento:</strong> ${p.photo.campaign.title}<br>
            <strong>Valor:</strong> R$ ${Number(p.amount).toFixed(2)}
          </p>
          <img src="${p.photo.watermarked_url}" alt="${p.photo.title}" style="max-width: 100%; height: auto; border-radius: 4px; margin-top: 10px;">
        </div>
      `).join('');

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0;">Compra Confirmada! 🎉</h1>
            </div>
            
            <div style="padding: 30px; background: #f9f9f9;">
              <p style="font-size: 16px; margin-bottom: 20px;">
                Olá <strong>${data.buyerName}</strong>,
              </p>
              
              <p style="font-size: 16px; margin-bottom: 20px;">
                Sua compra foi confirmada com sucesso! Você já pode fazer o download das suas fotos em alta resolução na área "Minhas Compras" do dashboard.
              </p>

              <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h2 style="color: #667eea; margin-top: 0;">Detalhes da Compra</h2>
                ${photosHtml}
                
                <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #667eea;">
                  <p style="font-size: 18px; margin: 0;">
                    <strong>Total:</strong> <span style="color: #667eea;">R$ ${totalAmount.toFixed(2)}</span>
                  </p>
                </div>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="https://gtpqppvyjrnnuhlsbpqd.supabase.co" 
                   style="display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 25px; font-weight: bold;">
                  Acessar Minhas Compras
                </a>
              </div>

              <p style="font-size: 14px; color: #666; margin-top: 30px;">
                <strong>Importante:</strong> As fotos ficam disponíveis para download na sua área de "Minhas Compras". Você pode baixá-las a qualquer momento.
              </p>
            </div>

            <div style="padding: 20px; background: #333; color: white; text-align: center; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; font-size: 14px;">
                Obrigado por sua compra!<br>
                © 2025 STA Fotos
              </p>
            </div>
          </body>
        </html>
      `;

      console.log(`Sending email to ${email}`);
      
      const emailResponse = await resend.emails.send({
        from: 'STA Fotos <onboarding@resend.dev>',
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
