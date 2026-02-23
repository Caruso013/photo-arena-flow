// 📧 Email de Notificação de Solicitação de Saque - STA Fotos
// Envia email para o admin quando um fotógrafo solicita saque
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'npm:resend@4.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface PayoutNotificationRequest {
  photographerName: string;
  photographerEmail: string;
  amount: number;
  pixKey: string;
  recipientName: string;
  institution: string | null;
  requestedAt: string;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: PayoutNotificationRequest = await req.json();
    const { photographerName, photographerEmail, amount, pixKey, recipientName, institution, requestedAt } = body;

    console.log('Sending payout request notification to admin:', { photographerName, amount });

    // Buscar emails dos admins
    const { data: admins } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('role', 'admin');

    if (!admins || admins.length === 0) {
      console.warn('No admin emails found');
      return new Response(
        JSON.stringify({ success: false, error: 'Nenhum admin encontrado' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const adminEmails = admins.map(a => a.email);

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
            <h1 style="color: #e6b800; margin: 0; font-size: 28px; font-weight: bold;">Nova Solicitação de Saque 💰</h1>
          </div>
          
          <div style="padding: 30px 20px; background: #ffffff;">
            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; border-radius: 4px; margin-bottom: 25px;">
              <p style="margin: 0; font-weight: bold; color: #856404;">⚠️ Ação necessária: Aprovar ou rejeitar solicitação de saque</p>
            </div>

            <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #e6b800;">
              <h2 style="color: #0d0d0d; margin-top: 0; font-size: 20px; font-weight: bold;">📸 Dados do Fotógrafo</h2>
              <p style="margin: 8px 0;"><strong>Nome:</strong> ${photographerName}</p>
              <p style="margin: 8px 0;"><strong>Email:</strong> ${photographerEmail}</p>
            </div>

            <div style="background: #d4edda; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #28a745;">
              <h2 style="color: #155724; margin-top: 0; font-size: 20px; font-weight: bold;">💰 Detalhes do Saque</h2>
              <p style="margin: 8px 0; font-size: 24px; font-weight: bold; color: #155724;">${formatCurrency(amount)}</p>
              <p style="margin: 8px 0;"><strong>Solicitado em:</strong> ${formatDate(requestedAt)}</p>
            </div>

            <div style="background: #e7f3ff; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #2196f3;">
              <h2 style="color: #0d47a1; margin-top: 0; font-size: 20px; font-weight: bold;">🔑 Dados do PIX</h2>
              <p style="margin: 8px 0;"><strong>Chave PIX:</strong> ${pixKey}</p>
              <p style="margin: 8px 0;"><strong>Beneficiário:</strong> ${recipientName}</p>
              ${institution ? `<p style="margin: 8px 0;"><strong>Instituição:</strong> ${institution}</p>` : ''}
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="https://www.stafotos.com/dashboard/admin/financial" 
                 style="display: inline-block; padding: 15px 40px; background: #e6b800; color: #0d0d0d; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                Gerenciar Saques
              </a>
            </div>
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
      to: adminEmails,
      subject: `💰 Nova Solicitação de Saque - ${photographerName} - ${formatCurrency(amount)}`,
      html,
    });

    console.log('Payout request email sent to admins:', adminEmails);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in send-payout-request-email:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
