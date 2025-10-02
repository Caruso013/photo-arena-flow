// Email templates for STA Fotos / Photo Arena
// All templates use the brand colors and styling

export interface EmailTemplateOptions {
  logoUrl?: string;
  baseUrl?: string;
}

const DEFAULT_OPTIONS: EmailTemplateOptions = {
  logoUrl: 'https://gtpqppvyjrnnuhlsbpqd.supabase.co/storage/v1/object/public/campaign-covers/lovable-uploads/6fdfc5d2-230c-4142-bf7c-3a326e5e45a8.png',
  baseUrl: 'https://stafotos.com.br'
};

export const getEmailHeader = (options: EmailTemplateOptions = {}) => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  return `
    <div style="
      background: linear-gradient(135deg, #D4AF37 0%, #F4D03F 100%);
      padding: 30px 20px;
      text-align: center;
      border-radius: 10px 10px 0 0;
    ">
      <img 
        src="${opts.logoUrl}" 
        alt="STA Fotos Logo" 
        style="
          height: 60px;
          width: auto;
          margin-bottom: 15px;
        "
      />
      <h1 style="
        color: #000;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        font-size: 28px;
        font-weight: bold;
        margin: 0;
        text-shadow: 0 2px 4px rgba(0,0,0,0.1);
      ">STA Fotos</h1>
      <p style="
        color: #000;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        font-size: 16px;
        margin: 5px 0 0 0;
        opacity: 0.8;
      ">Plataforma de Fotografia Esportiva</p>
    </div>
  `;
};

export const getEmailFooter = (options: EmailTemplateOptions = {}) => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  return `
    <div style="
      background: #262626;
      color: #fff;
      padding: 30px 20px;
      text-align: center;
      border-radius: 0 0 10px 10px;
      margin-top: 20px;
    ">
      <div style="
        display: flex;
        justify-content: space-around;
        align-items: flex-start;
        max-width: 600px;
        margin: 0 auto;
        flex-wrap: wrap;
        gap: 20px;
      ">
        <!-- Contato -->
        <div style="flex: 1; min-width: 200px; text-align: left;">
          <h3 style="
            color: #D4AF37;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 16px;
            font-weight: bold;
            margin: 0 0 10px 0;
          ">Contato</h3>
          <p style="
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 14px;
            margin: 5px 0;
            color: #ccc;
          ">📧 contato@stafotos.com.br</p>
          <p style="
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 14px;
            margin: 5px 0;
            color: #ccc;
          ">📱 (11) 95771-9467</p>
        </div>

        <!-- Links Úteis -->
        <div style="flex: 1; min-width: 200px; text-align: left;">
          <h3 style="
            color: #D4AF37;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 16px;
            font-weight: bold;
            margin: 0 0 10px 0;
          ">Links Úteis</h3>
          <p style="margin: 5px 0;">
            <a href="${opts.baseUrl}" style="
              color: #D4AF37;
              text-decoration: none;
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              font-size: 14px;
            ">🏠 Página Inicial</a>
          </p>
          <p style="margin: 5px 0;">
            <a href="${opts.baseUrl}/events" style="
              color: #D4AF37;
              text-decoration: none;
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              font-size: 14px;
            ">📅 Eventos</a>
          </p>
          <p style="margin: 5px 0;">
            <a href="${opts.baseUrl}/auth" style="
              color: #D4AF37;
              text-decoration: none;
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              font-size: 14px;
            ">👤 Minha Conta</a>
          </p>
        </div>
      </div>

      <!-- Divisor -->
      <div style="
        height: 1px;
        background: #444;
        margin: 25px 0;
      "></div>

      <!-- Copyright -->
      <div style="text-align: center;">
        <p style="
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          font-size: 14px;
          color: #999;
          margin: 10px 0;
        ">© ${new Date().getFullYear()} STA Fotos. Todos os direitos reservados.</p>
        
        <div style="
          display: inline-flex;
          align-items: center;
          gap: 10px;
          margin-top: 15px;
        ">
          <span style="
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 14px;
            color: #999;
          ">Pagamentos seguros via</span>
          <div style="
            background: #D4AF37;
            color: #000;
            padding: 5px 10px;
            border-radius: 4px;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 12px;
            font-weight: bold;
          ">MERCADO PAGO</div>
        </div>
      </div>
    </div>
  `;
};

export const getEmailBaseStyles = () => `
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
    }
    .email-container {
      max-width: 600px;
      margin: 20px auto;
      background: #fff;
      border-radius: 10px;
      box-shadow: 0 10px 30px -10px rgba(212, 175, 55, 0.3);
      overflow: hidden;
    }
    .content-section {
      padding: 30px;
      background: #fff;
    }
    .button-primary {
      background: linear-gradient(135deg, #D4AF37 0%, #F4D03F 100%);
      color: #000;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      display: inline-block;
      font-weight: bold;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      box-shadow: 0 4px 8px rgba(212, 175, 55, 0.3);
      transition: all 0.3s ease;
    }
    .button-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 12px rgba(212, 175, 55, 0.4);
    }
    .highlight-box {
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      border: 2px solid #D4AF37;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .photo-preview {
      text-align: center;
      margin: 20px 0;
    }
    .photo-preview img {
      max-width: 300px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      border: 3px solid #D4AF37;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      margin: 10px 0;
      padding: 8px 0;
      border-bottom: 1px solid #eee;
    }
    .detail-row:last-child {
      border-bottom: none;
    }
    @media (max-width: 600px) {
      .email-container {
        margin: 10px;
        border-radius: 0;
      }
      .content-section {
        padding: 20px;
      }
      .detail-row {
        flex-direction: column;
        gap: 5px;
      }
    }
  </style>
`;

export const createPurchaseConfirmationEmail = (
  userName: string,
  purchaseDetails: {
    photoTitle: string;
    photoUrl: string;
    campaignTitle: string;
    amount: number;
    purchaseDate: string;
  },
  options: EmailTemplateOptions = {}
) => {
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Compra Confirmada - STA Fotos</title>
      ${getEmailBaseStyles()}
    </head>
    <body>
      <div class="email-container">
        ${getEmailHeader(options)}
        
        <div class="content-section">
          <h2 style="
            color: #333;
            font-size: 24px;
            margin: 0 0 15px 0;
            text-align: center;
          ">🎉 Compra Confirmada!</h2>
          
          <p style="
            font-size: 16px;
            color: #555;
            text-align: center;
            margin-bottom: 25px;
          ">Olá, <strong>${userName}</strong>!</p>
          
          <p style="
            font-size: 16px;
            color: #555;
            line-height: 1.8;
            margin-bottom: 25px;
          ">Parabéns! Sua compra foi processada com sucesso. Sua foto exclusiva já está disponível para download em <strong>alta qualidade</strong>, sem marca d'água.</p>
          
          <div class="photo-preview">
            <img src="${purchaseDetails.photoUrl}" alt="${purchaseDetails.photoTitle}" />
          </div>
          
          <div class="highlight-box">
            <h3 style="
              color: #D4AF37;
              font-size: 18px;
              margin: 0 0 15px 0;
              text-align: center;
            ">📋 Detalhes da Compra</h3>
            
            <div class="detail-row">
              <span><strong>📸 Foto:</strong></span>
              <span>${purchaseDetails.photoTitle}</span>
            </div>
            <div class="detail-row">
              <span><strong>🏆 Evento:</strong></span>
              <span>${purchaseDetails.campaignTitle}</span>
            </div>
            <div class="detail-row">
              <span><strong>💰 Valor:</strong></span>
              <span>R$ ${purchaseDetails.amount.toFixed(2)}</span>
            </div>
            <div class="detail-row">
              <span><strong>📅 Data da Compra:</strong></span>
              <span>${new Date(purchaseDetails.purchaseDate).toLocaleDateString('pt-BR')}</span>
            </div>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${purchaseDetails.photoUrl}" class="button-primary" download>
              📥 Baixar Foto Original
            </a>
          </div>
          
          <div style="
            background: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            margin: 25px 0;
          ">
            <h4 style="
              color: #D4AF37;
              font-size: 16px;
              margin: 0 0 10px 0;
            ">💡 Como baixar sua foto:</h4>
            <ol style="
              color: #555;
              font-size: 14px;
              margin: 0;
              padding-left: 20px;
            ">
              <li>Clique no botão "Baixar Foto Original" acima</li>
              <li>Ou acesse sua conta no STA Fotos e vá em "Minhas Fotos Compradas"</li>
              <li>A foto será baixada em alta resolução, sem marca d'água</li>
            </ol>
          </div>
          
          <div style="
            background: linear-gradient(135deg, #D4AF37 0%, #F4D03F 100%);
            color: #000;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
            margin: 25px 0;
          ">
            <p style="
              margin: 0;
              font-weight: bold;
              font-size: 14px;
            ">💾 <strong>Dica importante:</strong> Salve essa foto em um local seguro no seu dispositivo. Você também pode acessá-la a qualquer momento através do seu painel no site!</p>
          </div>
        </div>
        
        ${getEmailFooter(options)}
      </div>
    </body>
    </html>
  `;
};

export const createBulkPurchaseEmail = (
  userName: string,
  purchases: Array<{
    photoTitle: string;
    photoUrl: string;
    campaignTitle: string;
    amount: number;
  }>,
  totalAmount: number,
  options: EmailTemplateOptions = {}
) => {
  const photosHtml = purchases.map(purchase => `
    <div style="
      border: 2px solid #D4AF37;
      border-radius: 8px;
      padding: 15px;
      margin: 15px 0;
      background: #f8f9fa;
    ">
      <div style="text-align: center; margin-bottom: 15px;">
        <img src="${purchase.photoUrl}" alt="${purchase.photoTitle}" style="
          max-width: 200px;
          border-radius: 4px;
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        " />
      </div>
      <h4 style="
        color: #333;
        font-size: 16px;
        margin: 0 0 10px 0;
        text-align: center;
      ">${purchase.photoTitle}</h4>
      <p style="
        color: #666;
        font-size: 14px;
        margin: 5px 0;
        text-align: center;
      "><strong>🏆 Evento:</strong> ${purchase.campaignTitle}</p>
      <p style="
        color: #D4AF37;
        font-size: 14px;
        font-weight: bold;
        margin: 5px 0;
        text-align: center;
      "><strong>💰 Valor:</strong> R$ ${purchase.amount.toFixed(2)}</p>
      <div style="text-align: center; margin-top: 15px;">
        <a href="${purchase.photoUrl}" download style="
          background: #D4AF37;
          color: #000;
          padding: 8px 16px;
          text-decoration: none;
          border-radius: 4px;
          display: inline-block;
          font-weight: bold;
          font-size: 14px;
        ">📥 Baixar Foto</a>
      </div>
    </div>
  `).join('');

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Compras Confirmadas - STA Fotos</title>
      ${getEmailBaseStyles()}
    </head>
    <body>
      <div class="email-container">
        ${getEmailHeader(options)}
        
        <div class="content-section">
          <h2 style="
            color: #333;
            font-size: 24px;
            margin: 0 0 15px 0;
            text-align: center;
          ">🎉 Compras Confirmadas!</h2>
          
          <p style="
            font-size: 16px;
            color: #555;
            text-align: center;
            margin-bottom: 25px;
          ">Olá, <strong>${userName}</strong>!</p>
          
          <p style="
            font-size: 16px;
            color: #555;
            line-height: 1.8;
            margin-bottom: 25px;
          ">Suas compras foram processadas com sucesso! Todas as suas <strong>${purchases.length} fotos exclusivas</strong> já estão disponíveis para download em alta qualidade, sem marca d'água.</p>
          
          <div class="highlight-box">
            <h3 style="
              color: #D4AF37;
              font-size: 18px;
              margin: 0 0 15px 0;
              text-align: center;
            ">📋 Resumo da Compra</h3>
            
            <div class="detail-row">
              <span><strong>📸 Total de fotos:</strong></span>
              <span>${purchases.length}</span>
            </div>
            <div class="detail-row">
              <span><strong>💰 Valor total:</strong></span>
              <span style="color: #D4AF37; font-weight: bold;">R$ ${totalAmount.toFixed(2)}</span>
            </div>
          </div>
          
          <h3 style="
            color: #333;
            font-size: 20px;
            margin: 30px 0 20px 0;
            text-align: center;
          ">🖼️ Suas Fotos:</h3>
          
          ${photosHtml}
          
          <div style="
            background: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            margin: 25px 0;
          ">
            <h4 style="
              color: #D4AF37;
              font-size: 16px;
              margin: 0 0 10px 0;
            ">💡 Como acessar suas fotos:</h4>
            <ol style="
              color: #555;
              font-size: 14px;
              margin: 0;
              padding-left: 20px;
            ">
              <li>Clique nos botões "Baixar Foto" acima para cada foto</li>
              <li>Ou acesse sua conta no Photo Arena e vá em "Minhas Fotos Compradas"</li>
              <li>Todas as fotos serão baixadas em alta resolução, sem marca d'água</li>
            </ol>
          </div>
        </div>
        
        ${getEmailFooter(options)}
      </div>
    </body>
    </html>
  `;
};

export const createWelcomeEmail = (
  userName: string,
  userRole: 'user' | 'photographer' | 'organization' = 'user',
  options: EmailTemplateOptions = {}
) => {
  const roleMessages = {
    user: {
      title: 'Bem-vindo ao STA Fotos!',
      content: 'Agora você pode navegar pelos eventos esportivos e encontrar suas melhores fotos. Explore nossos eventos em destaque e encontre momentos únicos capturados pelos melhores fotógrafos esportivos.',
      cta: 'Explorar Eventos',
      ctaUrl: `${options.baseUrl || DEFAULT_OPTIONS.baseUrl}/events`
    },
    photographer: {
      title: 'Bem-vindo, Fotógrafo!',
      content: 'Sua conta de fotógrafo foi criada com sucesso! Agora você pode criar eventos, fazer upload de fotos e começar a monetizar seu trabalho através da nossa plataforma.',
      cta: 'Acessar Dashboard',
      ctaUrl: `${options.baseUrl || DEFAULT_OPTIONS.baseUrl}/dashboard`
    },
    organization: {
      title: 'Bem-vindo, Organizador!',
      content: 'Sua conta de organização foi criada! Agora você pode gerenciar eventos, colaborar com fotógrafos e oferecer a melhor experiência para os participantes dos seus eventos.',
      cta: 'Gerenciar Eventos',
      ctaUrl: `${options.baseUrl || DEFAULT_OPTIONS.baseUrl}/dashboard`
    }
  };

  const message = roleMessages[userRole];

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${message.title} - STA Fotos</title>
      ${getEmailBaseStyles()}
    </head>
    <body>
      <div class="email-container">
        ${getEmailHeader(options)}
        
        <div class="content-section">
          <h2 style="
            color: #333;
            font-size: 24px;
            margin: 0 0 15px 0;
            text-align: center;
          ">${message.title}</h2>
          
          <p style="
            font-size: 16px;
            color: #555;
            text-align: center;
            margin-bottom: 25px;
          ">Olá, <strong>${userName}</strong>!</p>
          
          <p style="
            font-size: 16px;
            color: #555;
            line-height: 1.8;
            margin-bottom: 25px;
          ">${message.content}</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${message.ctaUrl}" class="button-primary">
              ${message.cta}
            </a>
          </div>
          
          <div style="
            background: linear-gradient(135deg, #D4AF37 0%, #F4D03F 100%);
            color: #000;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            margin: 25px 0;
          ">
            <h3 style="margin: 0 0 10px 0; font-size: 18px;">🏆 Por que escolher o STA Fotos?</h3>
            <div style="
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
              gap: 15px;
              margin-top: 15px;
            ">
              <div>
                <div style="font-size: 24px; margin-bottom: 5px;">📸</div>
                <div style="font-size: 14px; font-weight: bold;">Qualidade Profissional</div>
              </div>
              <div>
                <div style="font-size: 24px; margin-bottom: 5px;">🔒</div>
                <div style="font-size: 14px; font-weight: bold;">Pagamentos Seguros</div>
              </div>
              <div>
                <div style="font-size: 24px; margin-bottom: 5px;">⚡</div>
                <div style="font-size: 14px; font-weight: bold;">Download Instantâneo</div>
              </div>
            </div>
          </div>
        </div>
        
        ${getEmailFooter(options)}
      </div>
    </body>
    </html>
  `;
};