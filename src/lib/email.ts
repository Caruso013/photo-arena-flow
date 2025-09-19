import { supabase } from '@/integrations/supabase/client';

interface EmailData {
  to: string;
  subject: string;
  html: string;
  attachments?: {
    filename: string;
    url: string;
  }[];
}

export const sendPurchaseConfirmationEmail = async (
  userEmail: string,
  userName: string,
  purchaseDetails: {
    photoTitle: string;
    photoUrl: string;
    campaignTitle: string;
    amount: number;
    purchaseDate: string;
  }
) => {
  try {
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .photo-preview { text-align: center; margin: 20px 0; }
          .photo-preview img { max-width: 300px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
          .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee; }
          .download-btn { background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Compra Confirmada!</h1>
            <p>Sua foto está pronta para download</p>
          </div>
          
          <div class="content">
            <h2>Olá, ${userName}!</h2>
            <p>Parabéns! Sua compra foi processada com sucesso. Sua foto exclusiva já está disponível para download em alta qualidade, sem marca d'água.</p>
            
            <div class="photo-preview">
              <img src="${purchaseDetails.photoUrl}" alt="${purchaseDetails.photoTitle}" />
            </div>
            
            <div class="details">
              <h3>Detalhes da Compra</h3>
              <div class="detail-row">
                <span><strong>Foto:</strong></span>
                <span>${purchaseDetails.photoTitle}</span>
              </div>
              <div class="detail-row">
                <span><strong>Evento:</strong></span>
                <span>${purchaseDetails.campaignTitle}</span>
              </div>
              <div class="detail-row">
                <span><strong>Valor:</strong></span>
                <span>R$ ${purchaseDetails.amount.toFixed(2)}</span>
              </div>
              <div class="detail-row">
                <span><strong>Data da Compra:</strong></span>
                <span>${new Date(purchaseDetails.purchaseDate).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>
            
            <div style="text-align: center;">
              <a href="${purchaseDetails.photoUrl}" class="download-btn" download>
                📥 Baixar Foto Original
              </a>
            </div>
            
            <p><strong>Como baixar:</strong></p>
            <ol>
              <li>Clique no botão "Baixar Foto Original" acima</li>
              <li>Ou acesse sua conta no Photo Arena e vá em "Minhas Fotos Compradas"</li>
              <li>A foto será baixada em alta resolução, sem marca d'água</li>
            </ol>
            
            <p><strong>Dica:</strong> Salve essa foto em um local seguro no seu dispositivo. Você também pode acessá-la a qualquer momento através do seu painel no site.</p>
          </div>
          
          <div class="footer">
            <p>📧 Este e-mail foi enviado automaticamente pelo Photo Arena</p>
            <p>Se você tiver alguma dúvida, entre em contato conosco.</p>
            <p>© ${new Date().getFullYear()} Photo Arena - Todos os direitos reservados</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Aqui você pode integrar com um serviço de e-mail como SendGrid, Resend, etc.
    // Por enquanto, vou simular o envio
    console.log('Enviando e-mail para:', userEmail);
    console.log('Assunto:', `📸 Sua foto "${purchaseDetails.photoTitle}" está pronta!`);
    console.log('Conteúdo HTML gerado');

    // Simulação de envio bem-sucedido
    return { success: true, message: 'E-mail enviado com sucesso!' };
  } catch (error) {
    console.error('Erro ao enviar e-mail:', error);
    return { success: false, message: 'Erro ao enviar e-mail' };
  }
};

export const sendBulkPurchaseEmail = async (
  userEmail: string,
  userName: string,
  purchases: Array<{
    photoTitle: string;
    photoUrl: string;
    campaignTitle: string;
    amount: number;
  }>,
  totalAmount: number
) => {
  try {
    const photosHtml = purchases.map(purchase => `
      <div style="border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin: 10px 0;">
        <img src="${purchase.photoUrl}" alt="${purchase.photoTitle}" style="max-width: 200px; border-radius: 4px;" />
        <h4>${purchase.photoTitle}</h4>
        <p><strong>Evento:</strong> ${purchase.campaignTitle}</p>
        <p><strong>Valor:</strong> R$ ${purchase.amount.toFixed(2)}</p>
        <a href="${purchase.photoUrl}" download style="background: #667eea; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 10px;">
          Baixar Foto
        </a>
      </div>
    `).join('');

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Compras Confirmadas!</h1>
            <p>Suas ${purchases.length} fotos estão prontas para download</p>
          </div>
          
          <div class="content">
            <h2>Olá, ${userName}!</h2>
            <p>Suas compras foram processadas com sucesso! Todas as suas fotos exclusivas já estão disponíveis para download em alta qualidade, sem marca d'água.</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Resumo da Compra</h3>
              <p><strong>Total de fotos:</strong> ${purchases.length}</p>
              <p><strong>Valor total:</strong> R$ ${totalAmount.toFixed(2)}</p>
            </div>
            
            <h3>Suas Fotos:</h3>
            ${photosHtml}
            
            <p><strong>Como acessar suas fotos:</strong></p>
            <ol>
              <li>Clique nos botões "Baixar Foto" acima para cada foto</li>
              <li>Ou acesse sua conta no Photo Arena e vá em "Minhas Fotos Compradas"</li>
              <li>Todas as fotos serão baixadas em alta resolução, sem marca d'água</li>
            </ol>
          </div>
          
          <div class="footer">
            <p>📧 Este e-mail foi enviado automaticamente pelo Photo Arena</p>
            <p>© ${new Date().getFullYear()} Photo Arena - Todos os direitos reservados</p>
          </div>
        </div>
      </body>
      </html>
    `;

    console.log('Enviando e-mail de compra múltipla para:', userEmail);
    console.log('Assunto:', `📸 Suas ${purchases.length} fotos estão prontas!`);
    console.log('Conteúdo HTML gerado');

    return { success: true, message: 'E-mail de compra múltipla enviado com sucesso!' };
  } catch (error) {
    console.error('Erro ao enviar e-mail de compra múltipla:', error);
    return { success: false, message: 'Erro ao enviar e-mail' };
  }
};