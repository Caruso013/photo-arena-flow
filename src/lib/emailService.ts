import { supabase } from '@/integrations/supabase/client';

export interface EmailData {
  to: string;
  subject: string;
  html?: string;
  purchaseId?: string;
  photos?: Array<{
    id: string;
    title: string;
    price: number;
    thumbnail_url?: string;
    watermarked_url?: string;
  }>;
  totalAmount?: number;
}

export interface WelcomeEmailData {
  to: string;
  name: string;
  role?: 'user' | 'photographer' | 'organization';
}

class EmailService {
  
  /**
   * Envia email de confirmação de compra
   */
  async sendPurchaseConfirmation(data: EmailData) {
    try {
      const { data: result, error } = await supabase.functions.invoke('send-email-resend', {
        body: {
          to: data.to,
          subject: 'Confirmação de Compra - Photo Arena',
          purchaseId: data.purchaseId,
          photos: data.photos,
          totalAmount: data.totalAmount,
        }
      });

      if (error) {
        console.error('Erro ao enviar email de confirmação:', error);
        throw error;
      }

      console.log('Email de confirmação enviado:', result);
      return result;

    } catch (error) {
      console.error('Erro no serviço de email:', error);
      throw error;
    }
  }

  /**
   * Envia email de boas-vindas
   */
  async sendWelcomeEmail(data: WelcomeEmailData) {
    try {
      const roleMessages = {
        user: 'Explore nossa galeria e encontre as fotos perfeitas!',
        photographer: 'Comece a compartilhar seu trabalho e ganhe dinheiro com suas fotos!',
        organization: 'Gerencie eventos e colabore com fotógrafos talentosos!'
      };

      const welcomeHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: white; padding: 30px; border: 1px solid #e0e0e0; }
                .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; color: #666; }
                .button { background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎉 Bem-vindo ao Photo Arena!</h1>
                    <p>Sua jornada fotográfica começa aqui</p>
                </div>
                
                <div class="content">
                    <h2>Olá, ${data.name}!</h2>
                    <p>É um prazer ter você no Photo Arena. Nossa plataforma conecta fotógrafos talentosos com pessoas que valorizam boas fotos.</p>
                    
                    <p>${roleMessages[data.role || 'user']}</p>
                    
                    <div style="text-align: center;">
                        <a href="${window.location.origin}/dashboard" class="button">
                            Acessar Dashboard
                        </a>
                    </div>
                    
                    <h3>O que você pode fazer:</h3>
                    <ul>
                        <li>📸 Navegar por fotos de alta qualidade</li>
                        <li>💳 Comprar fotos facilmente</li>
                        <li>📱 Acessar de qualquer dispositivo</li>
                        <li>🔒 Downloads seguros e rápidos</li>
                    </ul>
                </div>
                
                <div class="footer">
                    <p>© 2025 Photo Arena - Seus momentos capturados com qualidade</p>
                    <p>Precisa de ajuda? Responda este email.</p>
                </div>
            </div>
        </body>
        </html>
      `;

      const { data: result, error } = await supabase.functions.invoke('send-email-resend', {
        body: {
          to: data.to,
          subject: 'Bem-vindo ao Photo Arena! 🎉',
          html: welcomeHtml,
        }
      });

      if (error) {
        console.error('Erro ao enviar email de boas-vindas:', error);
        throw error;
      }

      console.log('Email de boas-vindas enviado:', result);
      return result;

    } catch (error) {
      console.error('Erro no serviço de email:', error);
      throw error;
    }
  }

  /**
   * Envia email personalizado
   */
  async sendCustomEmail(data: EmailData) {
    try {
      const { data: result, error } = await supabase.functions.invoke('send-email-resend', {
        body: data
      });

      if (error) {
        console.error('Erro ao enviar email:', error);
        throw error;
      }

      console.log('Email enviado:', result);
      return result;

    } catch (error) {
      console.error('Erro no serviço de email:', error);
      throw error;
    }
  }
}

export const emailService = new EmailService();
export default emailService;