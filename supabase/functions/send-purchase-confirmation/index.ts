import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Flag para desabilitar envio de email temporariamente (Resend excedeu limite)
const EMAIL_ENABLED = false;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { purchaseIds } = await req.json();
    console.log('📧 Confirmação de compra para purchases:', purchaseIds);

    if (!purchaseIds || purchaseIds.length === 0) {
      console.warn('⚠️ Nenhum purchase ID fornecido');
      return new Response(
        JSON.stringify({ success: true, emailsSent: 0, reason: 'No purchase IDs' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Se email está desabilitado, retornar sucesso sem enviar
    if (!EMAIL_ENABLED) {
      console.log('📧 Email desabilitado temporariamente - compra processada sem email');
      return new Response(
        JSON.stringify({ 
          success: true, 
          emailsSent: 0, 
          reason: 'Email temporarily disabled - Resend limit exceeded',
          purchaseIds 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se Resend API key está configurada
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.warn('⚠️ RESEND_API_KEY não configurada');
      return new Response(
        JSON.stringify({ success: true, emailsSent: 0, reason: 'Resend not configured' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Import dinâmico do Resend apenas se necessário
    const { Resend } = await import('npm:resend@2.0.0');
    const resend = new Resend(resendApiKey);

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
      console.error('❌ Erro ao buscar purchases:', purchasesError);
      // Retornar sucesso mesmo com erro - não bloquear o fluxo
      return new Response(
        JSON.stringify({ success: true, emailsSent: 0, reason: 'Database error', error: purchasesError.message }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!purchases || purchases.length === 0) {
      console.warn('⚠️ Nenhuma compra encontrada');
      return new Response(
        JSON.stringify({ success: true, emailsSent: 0, reason: 'No purchases found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Agrupar por comprador
    const buyerPurchases = new Map();
    for (const purchase of purchases) {
      if (!purchase.buyer?.email) continue;
      const buyerEmail = purchase.buyer.email;
      if (!buyerPurchases.has(buyerEmail)) {
        buyerPurchases.set(buyerEmail, {
          buyerName: purchase.buyer.full_name || 'Cliente',
          purchases: []
        });
      }
      buyerPurchases.get(buyerEmail).purchases.push(purchase);
    }

    let emailsSent = 0;
    const errors: string[] = [];

    // Enviar email para cada comprador (com try-catch individual)
    for (const [email, data] of buyerPurchases) {
      try {
        const totalAmount = data.purchases.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
        
        const photosHtml = data.purchases.map((p: any) => `
          <div style="margin-bottom: 20px; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h3 style="margin: 0 0 10px 0; color: #0d0d0d; font-size: 16px;">${p.photo?.title || 'Foto'}</h3>
            <p style="margin: 5px 0; color: #666; font-size: 14px;">
              <strong style="color: #e6b800;">Evento:</strong> ${p.photo?.campaign?.title || 'Evento'}<br>
              <strong style="color: #e6b800;">Valor:</strong> R$ ${Number(p.amount).toFixed(2)}
            </p>
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
              <div style="background: #0d0d0d; padding: 30px 20px; text-align: center;">
                <img src="https://www.stafotos.com/lovable-uploads/6fdfc5d2-230c-4142-bf7c-3a326e5e45a8.png" alt="STA Fotos" style="height: 50px; margin-bottom: 15px;">
                <h1 style="color: #e6b800; margin: 0; font-size: 28px; font-weight: bold;">Compra Confirmada! 🎉</h1>
              </div>
              
              <div style="padding: 30px 20px; background: #ffffff;">
                <p style="font-size: 16px; margin-bottom: 20px; color: #333;">
                  Olá <strong style="color: #e6b800;">${data.buyerName}</strong>,
                </p>
                
                <p style="font-size: 16px; margin-bottom: 25px; color: #333;">
                  Sua compra foi confirmada com sucesso! Você já pode fazer o download das suas fotos em alta resolução na área "Minhas Compras" do dashboard.
                </p>

                <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #e6b800;">
                  <h2 style="color: #0d0d0d; margin-top: 0; font-size: 20px; font-weight: bold;">Detalhes da Compra</h2>
                  ${photosHtml}
                  
                  <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #e6b800;">
                    <p style="font-size: 18px; margin: 0; color: #0d0d0d;">
                      <strong>Total:</strong> <span style="color: #e6b800; font-weight: bold;">R$ ${totalAmount.toFixed(2)}</span>
                    </p>
                  </div>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://www.stafotos.com/#/dashboard/purchases" 
                     style="display: inline-block; padding: 15px 40px; background: #e6b800; color: #0d0d0d; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                    Acessar Minhas Compras
                  </a>
                </div>

                <div style="background: #fff8dc; border-left: 4px solid #e6b800; padding: 15px; margin-top: 25px; border-radius: 4px;">
                  <p style="font-size: 14px; color: #333; margin: 0;">
                    <strong style="color: #e6b800;">💡 Importante:</strong> As fotos ficam disponíveis para download na sua área de "Minhas Compras". Você pode baixá-las a qualquer momento.
                  </p>
                </div>
              </div>

              <div style="padding: 25px 20px; background: #0d0d0d; color: #fafafa; text-align: center;">
                <p style="margin: 0 0 10px 0; font-size: 14px;">
                  Obrigado por sua compra!
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

        console.log(`📧 Enviando email para ${email}`);
        
        const emailResponse = await resend.emails.send({
          from: 'STA Fotos <noreply@stafotos.com>',
          to: [email],
          subject: `✅ Compra Confirmada - ${data.purchases.length} ${data.purchases.length === 1 ? 'foto' : 'fotos'}`,
          html,
        });

        console.log('✅ Email enviado:', emailResponse);
        emailsSent++;
      } catch (emailError: any) {
        console.error(`❌ Erro ao enviar email para ${email}:`, emailError);
        errors.push(`${email}: ${emailError.message}`);
        // Continuar para próximo comprador - não bloquear
      }
    }

    console.log(`📧 Resumo: ${emailsSent}/${buyerPurchases.size} emails enviados`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailsSent, 
        totalBuyers: buyerPurchases.size,
        errors: errors.length > 0 ? errors : undefined 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Erro geral:', error);
    // SEMPRE retornar sucesso - email não pode bloquear pagamento
    return new Response(
      JSON.stringify({ success: true, emailsSent: 0, reason: 'General error', error: error.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
