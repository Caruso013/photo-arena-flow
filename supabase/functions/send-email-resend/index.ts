import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY não configurada');
    }

    const { to, subject, html, purchaseId, photos, totalAmount } = await req.json();

    if (!to || !subject || !html) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Campos obrigatórios: to, subject, html' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Template HTML personalizado para confirmação de compra
    const emailTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Confirmação de Compra - Photo Arena</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #e0e0e0; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; color: #666; }
            .photo-item { border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px; margin: 10px 0; display: flex; align-items: center; }
            .photo-thumbnail { width: 80px; height: 80px; object-fit: cover; border-radius: 6px; margin-right: 15px; }
            .amount { font-size: 24px; font-weight: bold; color: #28a745; text-align: center; margin: 20px 0; }
            .button { background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎉 Compra Confirmada!</h1>
                <p>Obrigado por comprar no Photo Arena</p>
            </div>
            
            <div class="content">
                <h2>Detalhes da Compra</h2>
                <p><strong>ID da Compra:</strong> ${purchaseId}</p>
                
                <h3>Fotos Adquiridas:</h3>
                ${photos?.map((photo: any) => `
                    <div class="photo-item">
                        <img src="${photo.thumbnail_url || photo.watermarked_url}" alt="${photo.title}" class="photo-thumbnail">
                        <div>
                            <h4>${photo.title || 'Sem título'}</h4>
                            <p>R$ ${Number(photo.price).toFixed(2)}</p>
                        </div>
                    </div>
                `).join('') || '<p>Informações das fotos não disponíveis</p>'}
                
                <div class="amount">
                    Total Pago: R$ ${Number(totalAmount).toFixed(2)}
                </div>
                
                <p>Suas fotos já estão disponíveis no seu dashboard e podem ser baixadas a qualquer momento.</p>
                
                <div style="text-align: center;">
                    <a href="${Deno.env.get('VITE_SUPABASE_URL')?.replace('supabase.co', 'lovableproject.com') || 'http://localhost:8080'}/dashboard" class="button">
                        Acessar Minhas Fotos
                    </a>
                </div>
            </div>
            
            <div class="footer">
                <p>© 2025 Photo Arena - Seus momentos capturados com qualidade</p>
                <p>Precisa de ajuda? Responda este email ou visite nossa central de ajuda.</p>
            </div>
        </div>
    </body>
    </html>
    `;

    // Usar template personalizado se os dados da compra estiverem disponíveis
    const finalHtml = purchaseId && photos ? emailTemplate : html;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Photo Arena <noreply@photoarena.com>',
        to: [to],
        subject,
        html: finalHtml,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Erro do Resend:', data);
      throw new Error(data.message || 'Erro ao enviar email');
    }

    console.log('Email enviado com sucesso:', data);

    return new Response(JSON.stringify({ 
      success: true, 
      emailId: data.id,
      message: 'Email enviado com sucesso'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro na função de email:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});