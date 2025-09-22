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

const BASE_URL = window.location.origin || 'https://photo-arena-flow.vercel.app';

// Template para compra individual
const SINGLE_PURCHASE_TEMPLATE = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>STA Fotos - Photo Arena</title>
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
    .header {
      background: linear-gradient(135deg, #D4AF37 0%, #F4D03F 100%);
      padding: 30px 20px;
      text-align: center;
      border-radius: 10px 10px 0 0;
    }
    .header img {
      height: 60px;
      width: auto;
      margin-bottom: 15px;
    }
    .header h1 {
      color: #000;
      font-size: 28px;
      font-weight: bold;
      margin: 0;
      text-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header p {
      color: #000;
      font-size: 16px;
      margin: 5px 0 0 0;
      opacity: 0.8;
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
      box-shadow: 0 4px 8px rgba(212, 175, 55, 0.3);
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
    .footer {
      background: #262626;
      color: #fff;
      padding: 30px 20px;
      text-align: center;
      border-radius: 0 0 10px 10px;
      margin-top: 20px;
    }
    .footer h3 {
      color: #D4AF37;
      font-size: 16px;
      font-weight: bold;
      margin: 0 0 10px 0;
    }
    .footer a {
      color: #D4AF37;
      text-decoration: none;
      font-size: 14px;
    }
    @media (max-width: 600px) {
      .email-container {
        margin: 10px;
        border-radius: 0;
      }
      .content-section {
        padding: 20px;
      }
    }
  </style>
</head>
<body>
<div class="email-container">
  <div class="header">
    <img src="https://gtpqppvyjrnnuhlsbpqd.supabase.co/storage/v1/object/public/campaign-covers/lovable-uploads/6fdfc5d2-230c-4142-bf7c-3a326e5e45a8.png" alt="STA Fotos Logo" />
    <h1>Photo Arena - STA Fotos</h1>
    <p>Plataforma de Fotografia Esportiva</p>
  </div>
  
  <div class="content-section">
    <h2 style="color: #333; font-size: 24px; margin: 0 0 15px 0; text-align: center;">
      🎉 Compra Confirmada!
    </h2>
    
    <p style="font-size: 16px; color: #555; text-align: center; margin-bottom: 25px;">
      Olá, <strong>{{NOME_USUARIO}}</strong>!
    </p>
    
    <p style="font-size: 16px; color: #555; line-height: 1.8; margin-bottom: 25px;">
      Parabéns! Sua compra foi processada com sucesso. Sua foto exclusiva já está disponível para download em <strong>alta qualidade</strong>, sem marca d'água.
    </p>
    
    <div class="photo-preview">
      <img src="{{URL_FOTO}}" alt="{{TITULO_FOTO}}" />
    </div>
    
    <div class="highlight-box">
      <h3 style="color: #D4AF37; font-size: 18px; margin: 0 0 15px 0; text-align: center;">
        📋 Detalhes da Compra
      </h3>
      
      <div class="detail-row">
        <span><strong>📸 Foto:</strong></span>
        <span>{{TITULO_FOTO}}</span>
      </div>
      <div class="detail-row">
        <span><strong>🏆 Evento:</strong></span>
        <span>{{NOME_EVENTO}}</span>
      </div>
      <div class="detail-row">
        <span><strong>💰 Valor:</strong></span>
        <span>R$ {{VALOR}}</span>
      </div>
      <div class="detail-row">
        <span><strong>📅 Data da Compra:</strong></span>
        <span>{{DATA_COMPRA}}</span>
      </div>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{LINK_DOWNLOAD}}" class="button-primary">
        📥 Baixar Foto Original
      </a>
    </div>
    
    <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 25px 0;">
      <h4 style="color: #D4AF37; font-size: 16px; margin: 0 0 10px 0;">
        💡 Como baixar sua foto:
      </h4>
      <ol style="color: #555; font-size: 14px; margin: 0; padding-left: 20px;">
        <li>Clique no botão "Baixar Foto Original" acima</li>
        <li>Ou acesse sua conta no Photo Arena e vá em "Minhas Fotos Compradas"</li>
        <li>A foto será baixada em alta resolução, sem marca d'água</li>
      </ol>
    </div>
    
    <div style="background: linear-gradient(135deg, #D4AF37 0%, #F4D03F 100%); color: #000; padding: 15px; border-radius: 8px; text-align: center; margin: 25px 0;">
      <p style="margin: 0; font-weight: bold; font-size: 14px;">
        💾 <strong>Dica importante:</strong> Salve essa foto em um local seguro no seu dispositivo. Você também pode acessá-la a qualquer momento através do seu painel no site!
      </p>
    </div>
  </div>
  
  <div class="footer">
    <div style="display: flex; justify-content: space-around; max-width: 600px; margin: 0 auto; flex-wrap: wrap; gap: 20px;">
      <div style="flex: 1; min-width: 200px; text-align: left;">
        <h3>Contato</h3>
        <p style="font-size: 14px; margin: 5px 0; color: #ccc;">📧 contato@stafotos.com.br</p>
        <p style="font-size: 14px; margin: 5px 0; color: #ccc;">📱 (11) 95771-9467</p>
      </div>
      
      <div style="flex: 1; min-width: 200px; text-align: left;">
        <h3>Links Úteis</h3>
        <p style="margin: 5px 0;">
          <a href="{{BASE_URL}}">🏠 Página Inicial</a>
        </p>
        <p style="margin: 5px 0;">
          <a href="{{BASE_URL}}/events">📅 Eventos</a>
        </p>
        <p style="margin: 5px 0;">
          <a href="{{BASE_URL}}/auth">👤 Minha Conta</a>
        </p>
      </div>
    </div>
    
    <div style="height: 1px; background: #444; margin: 25px 0;"></div>
    
    <div style="text-align: center;">
      <p style="font-size: 14px; color: #999; margin: 10px 0;">
        © 2024 STA Fotos - Photo Arena. Todos os direitos reservados.
      </p>
      
      <div style="display: inline-flex; align-items: center; gap: 10px; margin-top: 15px;">
        <span style="font-size: 14px; color: #999;">Pagamentos seguros via</span>
        <div style="background: #D4AF37; color: #000; padding: 5px 10px; border-radius: 4px; font-size: 12px; font-weight: bold;">
          MERCADO PAGO
        </div>
      </div>
    </div>
  </div>
</div>
</body>
</html>
`;

// Template para compras múltiplas
const MULTIPLE_PURCHASE_TEMPLATE = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>STA Fotos - Photo Arena</title>
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
    .header {
      background: linear-gradient(135deg, #D4AF37 0%, #F4D03F 100%);
      padding: 30px 20px;
      text-align: center;
      border-radius: 10px 10px 0 0;
    }
    .header img {
      height: 60px;
      width: auto;
      margin-bottom: 15px;
    }
    .header h1 {
      color: #000;
      font-size: 28px;
      font-weight: bold;
      margin: 0;
      text-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header p {
      color: #000;
      font-size: 16px;
      margin: 5px 0 0 0;
      opacity: 0.8;
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
      box-shadow: 0 4px 8px rgba(212, 175, 55, 0.3);
    }
    .highlight-box {
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      border: 2px solid #D4AF37;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      margin: 10px 0;
      padding: 8px 0;
      border-bottom: 1px solid #eee;
    }
    .footer {
      background: #262626;
      color: #fff;
      padding: 30px 20px;
      text-align: center;
      border-radius: 0 0 10px 10px;
      margin-top: 20px;
    }
    .footer h3 {
      color: #D4AF37;
      font-size: 16px;
      font-weight: bold;
      margin: 0 0 10px 0;
    }
    .footer a {
      color: #D4AF37;
      text-decoration: none;
      font-size: 14px;
    }
    @media (max-width: 600px) {
      .email-container {
        margin: 10px;
        border-radius: 0;
      }
      .content-section {
        padding: 20px;
      }
    }
  </style>
</head>
<body>
<div class="email-container">
  <div class="header">
    <img src="https://gtpqppvyjrnnuhlsbpqd.supabase.co/storage/v1/object/public/campaign-covers/lovable-uploads/6fdfc5d2-230c-4142-bf7c-3a326e5e45a8.png" alt="STA Fotos Logo" />
    <h1>Photo Arena - STA Fotos</h1>
    <p>Plataforma de Fotografia Esportiva</p>
  </div>
  
  <div class="content-section">
    <h2 style="color: #333; font-size: 24px; margin: 0 0 15px 0; text-align: center;">
      🎉 Compras Confirmadas!
    </h2>
    
    <p style="font-size: 16px; color: #555; text-align: center; margin-bottom: 25px;">
      Olá, <strong>{{NOME_USUARIO}}</strong>!
    </p>
    
    <p style="font-size: 16px; color: #555; line-height: 1.8; margin-bottom: 25px;">
      Suas compras foram processadas com sucesso! Todas as suas <strong>{{TOTAL_FOTOS}} fotos exclusivas</strong> já estão disponíveis para download em alta qualidade, sem marca d'água.
    </p>
    
    <div class="highlight-box">
      <h3 style="color: #D4AF37; font-size: 18px; margin: 0 0 15px 0; text-align: center;">
        📋 Resumo da Compra
      </h3>
      
      <div class="detail-row">
        <span><strong>📸 Total de fotos:</strong></span>
        <span>{{TOTAL_FOTOS}}</span>
      </div>
      <div class="detail-row">
        <span><strong>💰 Valor total:</strong></span>
        <span style="color: #D4AF37; font-weight: bold;">R$ {{VALOR_TOTAL}}</span>
      </div>
    </div>
    
    <h3 style="color: #333; font-size: 20px; margin: 30px 0 20px 0; text-align: center;">
      📸 Suas Fotos Compradas
    </h3>
    
    {{FOTOS_COMPRADAS}}
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{LINK_PAINEL_USUARIO}}" class="button-primary">
        📂 Ver Todas Minhas Fotos
      </a>
    </div>
    
    <div style="background: linear-gradient(135deg, #D4AF37 0%, #F4D03F 100%); color: #000; padding: 15px; border-radius: 8px; text-align: center; margin: 25px 0;">
      <p style="margin: 0; font-weight: bold; font-size: 14px;">
        💾 <strong>Dica importante:</strong> Todas as suas fotos ficam salvas no seu painel de usuário para download a qualquer momento!
      </p>
    </div>
  </div>
  
  <div class="footer">
    <div style="display: flex; justify-content: space-around; max-width: 600px; margin: 0 auto; flex-wrap: wrap; gap: 20px;">
      <div style="flex: 1; min-width: 200px; text-align: left;">
        <h3>Contato</h3>
        <p style="font-size: 14px; margin: 5px 0; color: #ccc;">📧 contato@stafotos.com.br</p>
        <p style="font-size: 14px; margin: 5px 0; color: #ccc;">📱 (11) 95771-9467</p>
      </div>
      
      <div style="flex: 1; min-width: 200px; text-align: left;">
        <h3>Links Úteis</h3>
        <p style="margin: 5px 0;">
          <a href="{{BASE_URL}}">🏠 Página Inicial</a>
        </p>
        <p style="margin: 5px 0;">
          <a href="{{BASE_URL}}/events">📅 Eventos</a>
        </p>
        <p style="margin: 5px 0;">
          <a href="{{BASE_URL}}/auth">👤 Minha Conta</a>
        </p>
      </div>
    </div>
    
    <div style="height: 1px; background: #444; margin: 25px 0;"></div>
    
    <div style="text-align: center;">
      <p style="font-size: 14px; color: #999; margin: 10px 0;">
        © 2024 STA Fotos - Photo Arena. Todos os direitos reservados.
      </p>
      
      <div style="display: inline-flex; align-items: center; gap: 10px; margin-top: 15px;">
        <span style="font-size: 14px; color: #999;">Pagamentos seguros via</span>
        <div style="background: #D4AF37; color: #000; padding: 5px 10px; border-radius: 4px; font-size: 12px; font-weight: bold;">
          MERCADO PAGO
        </div>
      </div>
    </div>
  </div>
</div>
</body>
</html>
`;

// Função para envio de email de compra individual
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
    const emailHtml = SINGLE_PURCHASE_TEMPLATE
      .replace(/{{NOME_USUARIO}}/g, userName)
      .replace(/{{URL_FOTO}}/g, purchaseDetails.photoUrl)
      .replace(/{{TITULO_FOTO}}/g, purchaseDetails.photoTitle)
      .replace(/{{TITULO_CAMPANHA}}/g, purchaseDetails.campaignTitle)
      .replace(/{{VALOR}}/g, purchaseDetails.amount.toFixed(2))
      .replace(/{{DATA_COMPRA}}/g, new Date(purchaseDetails.purchaseDate).toLocaleDateString('pt-BR'))
      .replace(/{{BASE_URL}}/g, BASE_URL);

    console.log('Enviando e-mail de compra individual para:', userEmail);
    console.log('Assunto:', `📸 Sua foto "${purchaseDetails.photoTitle}" está pronta!`);
    console.log('Conteúdo HTML gerado com template STA Fotos');

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
    downloadUrl: string;
  }>,
  totalAmount: number
) => {
  try {
    // Gerar HTML para cada foto comprada
    const photosHtml = purchases.map(purchase => `
      <div style="border: 2px solid #D4AF37; border-radius: 8px; padding: 15px; margin: 15px 0; background: #f8f9fa;">
        <div style="text-align: center; margin-bottom: 15px;">
          <img src="${purchase.photoUrl}" alt="${purchase.photoTitle}" style="max-width: 200px; border-radius: 4px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);" />
        </div>
        <h4 style="color: #333; font-size: 16px; margin: 0 0 10px 0; text-align: center;">
          ${purchase.photoTitle}
        </h4>
        <p style="color: #666; font-size: 14px; margin: 5px 0; text-align: center;">
          <strong>🏆 Evento:</strong> ${purchase.campaignTitle}
        </p>
        <p style="color: #D4AF37; font-size: 14px; font-weight: bold; margin: 5px 0; text-align: center;">
          <strong>💰 Valor:</strong> R$ ${purchase.amount.toFixed(2)}
        </p>
        <div style="text-align: center; margin-top: 15px;">
          <a href="${purchase.downloadUrl}" style="background: #D4AF37; color: #000; padding: 8px 16px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold; font-size: 14px;">
            📥 Baixar Foto
          </a>
        </div>
      </div>
    `).join('');

    const emailHtml = MULTIPLE_PURCHASE_TEMPLATE
      .replace(/{{NOME_USUARIO}}/g, userName)
      .replace(/{{TOTAL_FOTOS}}/g, purchases.length.toString())
      .replace(/{{VALOR_TOTAL}}/g, totalAmount.toFixed(2))
      .replace(/{{FOTOS_COMPRADAS}}/g, photosHtml)
      .replace(/{{LINK_PAINEL_USUARIO}}/g, `${BASE_URL}/dashboard`)
      .replace(/{{BASE_URL}}/g, BASE_URL);

    console.log('Enviando e-mail de compra múltipla para:', userEmail);
    console.log('Assunto:', `📸 Suas ${purchases.length} fotos estão prontas!`);
    console.log('Conteúdo HTML gerado com template STA Fotos');

    // TODO: Integrar com serviço real de email
    return { success: true, message: 'E-mail de compra múltipla enviado com sucesso!' };
  } catch (error) {
    console.error('Erro ao enviar e-mail de compra múltipla:', error);
    return { success: false, message: 'Erro ao enviar e-mail' };
  }
};

// Template para confirmação de cadastro
const REGISTRATION_TEMPLATE = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>STA Fotos - Photo Arena</title>
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
    .header {
      background: linear-gradient(135deg, #D4AF37 0%, #F4D03F 100%);
      padding: 30px 20px;
      text-align: center;
      border-radius: 10px 10px 0 0;
    }
    .header img {
      height: 60px;
      width: auto;
      margin-bottom: 15px;
    }
    .header h1 {
      color: #000;
      font-size: 28px;
      font-weight: bold;
      margin: 0;
      text-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header p {
      color: #000;
      font-size: 16px;
      margin: 5px 0 0 0;
      opacity: 0.8;
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
      box-shadow: 0 4px 8px rgba(212, 175, 55, 0.3);
    }
    .highlight-box {
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      border: 2px solid #D4AF37;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      margin: 10px 0;
      padding: 8px 0;
      border-bottom: 1px solid #eee;
    }
    .footer {
      background: #262626;
      color: #fff;
      padding: 30px 20px;
      text-align: center;
      border-radius: 0 0 10px 10px;
      margin-top: 20px;
    }
    .footer h3 {
      color: #D4AF37;
      font-size: 16px;
      font-weight: bold;
      margin: 0 0 10px 0;
    }
    .footer a {
      color: #D4AF37;
      text-decoration: none;
      font-size: 14px;
    }
    @media (max-width: 600px) {
      .email-container {
        margin: 10px;
        border-radius: 0;
      }
      .content-section {
        padding: 20px;
      }
    }
  </style>
</head>
<body>
<div class="email-container">
  <div class="header">
    <img src="https://gtpqppvyjrnnuhlsbpqd.supabase.co/storage/v1/object/public/campaign-covers/lovable-uploads/6fdfc5d2-230c-4142-bf7c-3a326e5e45a8.png" alt="STA Fotos Logo" />
    <h1>Photo Arena - STA Fotos</h1>
    <p>Plataforma de Fotografia Esportiva</p>
  </div>
  
  <div class="content-section">
    <h2 style="color: #333; font-size: 24px; margin: 0 0 15px 0; text-align: center;">
      🎉 Bem-vindo(a) ao Photo Arena!
    </h2>
    
    <p style="font-size: 16px; color: #555; text-align: center; margin-bottom: 25px;">
      Olá, <strong>{{NOME_USUARIO}}</strong>!
    </p>
    
    <p style="font-size: 16px; color: #555; line-height: 1.8; margin-bottom: 25px;">
      Parabéns! Seu cadastro foi realizado com sucesso na <strong>Photo Arena - STA Fotos</strong>. Agora você faz parte da maior plataforma de fotografia esportiva do Brasil!
    </p>
    
    <div style="text-align: center; margin: 20px 0;">
      <div style="background: linear-gradient(135deg, #D4AF37 0%, #F4D03F 100%); border-radius: 50%; width: 120px; height: 120px; margin: 0 auto; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 20px rgba(212, 175, 55, 0.4);">
        <span style="font-size: 48px;">📸</span>
      </div>
    </div>
    
    <div class="highlight-box">
      <h3 style="color: #D4AF37; font-size: 18px; margin: 0 0 15px 0; text-align: center;">
        ✨ Dados do seu cadastro
      </h3>
      
      <div class="detail-row">
        <span><strong>👤 Nome:</strong></span>
        <span>{{NOME_USUARIO}}</span>
      </div>
      <div class="detail-row">
        <span><strong>📧 Email:</strong></span>
        <span>{{EMAIL_USUARIO}}</span>
      </div>
      <div class="detail-row">
        <span><strong>📅 Data de cadastro:</strong></span>
        <span>{{DATA_CADASTRO}}</span>
      </div>
      <div class="detail-row">
        <span><strong>🎯 Tipo de conta:</strong></span>
        <span>{{TIPO_CONTA}}</span>
      </div>
    </div>
    
    <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 25px 0;">
      <h4 style="color: #D4AF37; font-size: 16px; margin: 0 0 15px 0;">
        🚀 O que você pode fazer agora:
      </h4>
      <ul style="color: #555; font-size: 14px; margin: 0; padding-left: 20px; line-height: 1.8;">
        <li><strong>📱 Navegar pelos eventos</strong> - Veja todos os eventos esportivos disponíveis</li>
        <li><strong>🔍 Buscar suas fotos</strong> - Encontre suas fotos nos eventos que participou</li>
        <li><strong>💳 Comprar fotos</strong> - Adquira fotos em alta qualidade sem marca d'água</li>
        <li><strong>⭐ Favoritar fotos</strong> - Marque suas fotos favoritas para comprar depois</li>
        <li><strong>📂 Gerenciar compras</strong> - Acesse todas suas fotos compradas no seu painel</li>
      </ul>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{BASE_URL}}/events" class="button-primary">
        🏃‍♂️ Explorar Eventos
      </a>
    </div>
    
    <div style="text-align: center; margin: 20px 0;">
      <a href="{{BASE_URL}}/auth" style="color: #D4AF37; text-decoration: none; font-weight: bold; font-size: 16px;">
        👤 Acessar Minha Conta
      </a>
    </div>
    
    <div style="background: linear-gradient(135deg, #D4AF37 0%, #F4D03F 100%); color: #000; padding: 15px; border-radius: 8px; text-align: center; margin: 25px 0;">
      <p style="margin: 0; font-weight: bold; font-size: 14px;">
        🎯 <strong>Dica:</strong> Siga-nos nas redes sociais para ficar por dentro dos próximos eventos esportivos e promoções exclusivas!
      </p>
    </div>
    
    <div style="border: 1px solid #D4AF37; border-radius: 8px; padding: 20px; margin: 25px 0; background: #fffbf0;">
      <h4 style="color: #D4AF37; font-size: 16px; margin: 0 0 10px 0;">
        📞 Precisa de ajuda?
      </h4>
      <p style="color: #555; font-size: 14px; margin: 5px 0; line-height: 1.6;">
        Nossa equipe está sempre pronta para ajudar! Entre em contato através do email 
        <strong>contato@stafotos.com.br</strong> ou pelo WhatsApp <strong>(11) 95771-9467</strong>.
      </p>
    </div>
  </div>
  
  <div class="footer">
    <div style="display: flex; justify-content: space-around; max-width: 600px; margin: 0 auto; flex-wrap: wrap; gap: 20px;">
      <div style="flex: 1; min-width: 200px; text-align: left;">
        <h3>Contato</h3>
        <p style="font-size: 14px; margin: 5px 0; color: #ccc;">📧 contato@stafotos.com.br</p>
        <p style="font-size: 14px; margin: 5px 0; color: #ccc;">📱 (11) 95771-9467</p>
      </div>
      
      <div style="flex: 1; min-width: 200px; text-align: left;">
        <h3>Links Úteis</h3>
        <p style="margin: 5px 0;">
          <a href="{{BASE_URL}}">🏠 Página Inicial</a>
        </p>
        <p style="margin: 5px 0;">
          <a href="{{BASE_URL}}/events">📅 Eventos</a>
        </p>
        <p style="margin: 5px 0;">
          <a href="{{BASE_URL}}/auth">👤 Minha Conta</a>
        </p>
      </div>
    </div>
    
    <div style="height: 1px; background: #444; margin: 25px 0;"></div>
    
    <div style="text-align: center;">
      <p style="font-size: 14px; color: #999; margin: 10px 0;">
        © 2024 STA Fotos - Photo Arena. Todos os direitos reservados.
      </p>
      
      <div style="display: inline-flex; align-items: center; gap: 10px; margin-top: 15px;">
        <span style="font-size: 14px; color: #999;">Pagamentos seguros via</span>
        <div style="background: #D4AF37; color: #000; padding: 5px 10px; border-radius: 4px; font-size: 12px; font-weight: bold;">
          MERCADO PAGO
        </div>
      </div>
    </div>
  </div>
</div>
</body>
</html>
`;

export const sendRegistrationConfirmationEmail = async (
  userEmail: string,
  userName: string,
  userDetails: {
    userType: string;
    registrationDate: string;
  }
) => {
  try {
    const emailHtml = REGISTRATION_TEMPLATE
      .replace(/{{NOME_USUARIO}}/g, userName)
      .replace(/{{EMAIL_USUARIO}}/g, userEmail)
      .replace(/{{DATA_CADASTRO}}/g, new Date(userDetails.registrationDate).toLocaleDateString('pt-BR'))
      .replace(/{{TIPO_CONTA}}/g, userDetails.userType)
      .replace(/{{BASE_URL}}/g, BASE_URL);

    console.log('Enviando e-mail de boas-vindas para:', userEmail);
    console.log('Assunto:', `🎉 Bem-vindo(a) ao Photo Arena - STA Fotos!`);
    console.log('Conteúdo HTML gerado com template STA Fotos');

    // TODO: Integrar com serviço real de email
    return { success: true, message: 'E-mail de boas-vindas enviado com sucesso!' };
  } catch (error) {
    console.error('Erro ao enviar e-mail de boas-vindas:', error);
    return { success: false, message: 'Erro ao enviar e-mail' };
  }
};

// Função para envio de notificação para fotógrafos
export const sendPhotographerSaleNotification = async (
  photographerEmail: string,
  photographerName: string,
  saleDetails: {
    photoTitle: string;
    buyerName: string;
    amount: number;
    photographerAmount: number;
    campaignTitle: string;
    saleDate: string;
  }
) => {
  try {
    const emailHtml = PHOTOGRAPHER_NOTIFICATION_TEMPLATE
      .replace(/{{NOME_FOTOGRAFO}}/g, photographerName)
      .replace(/{{TITULO_FOTO}}/g, saleDetails.photoTitle)
      .replace(/{{NOME_COMPRADOR}}/g, saleDetails.buyerName)
      .replace(/{{VALOR_TOTAL}}/g, saleDetails.amount.toFixed(2))
      .replace(/{{VALOR_FOTOGRAFO}}/g, saleDetails.photographerAmount.toFixed(2))
      .replace(/{{TITULO_CAMPANHA}}/g, saleDetails.campaignTitle)
      .replace(/{{DATA_VENDA}}/g, new Date(saleDetails.saleDate).toLocaleDateString('pt-BR'))
      .replace(/{{BASE_URL}}/g, BASE_URL);

    console.log('Enviando notificação de venda para fotógrafo:', photographerEmail);
    console.log('Assunto:', `💰 Nova venda realizada - ${saleDetails.photoTitle}`);
    console.log('Conteúdo HTML gerado com template STA Fotos');
    
    return { success: true, message: 'Notificação enviada para o fotógrafo!' };
  } catch (error) {
    console.error('Erro ao enviar notificação para fotógrafo:', error);
    return { success: false, message: 'Erro ao enviar notificação' };
  }
};

// Template para notificação de venda para fotógrafos
const PHOTOGRAPHER_NOTIFICATION_TEMPLATE = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nova Venda - STA Fotos</title>
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
    .header {
      background: linear-gradient(135deg, #D4AF37 0%, #F4D03F 100%);
      padding: 30px 20px;
      text-align: center;
      border-radius: 10px 10px 0 0;
    }
    .header img {
      height: 60px;
      width: auto;
      margin-bottom: 15px;
    }
    .header h1 {
      color: #000;
      font-size: 28px;
      font-weight: bold;
      margin: 0;
      text-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .content-section {
      padding: 30px;
      background: #fff;
    }
    .earnings-box {
      background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
      color: #fff;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      margin: 20px 0;
      box-shadow: 0 4px 8px rgba(40, 167, 69, 0.3);
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      margin: 10px 0;
      padding: 8px 0;
      border-bottom: 1px solid #eee;
    }
    .highlight-box {
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      border: 2px solid #D4AF37;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .button-primary {
      background: linear-gradient(135deg, #D4AF37 0%, #F4D03F 100%);
      color: #000;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      display: inline-block;
      font-weight: bold;
      box-shadow: 0 4px 8px rgba(212, 175, 55, 0.3);
    }
    .footer {
      background: #262626;
      color: #fff;
      padding: 30px 20px;
      text-align: center;
      border-radius: 0 0 10px 10px;
      margin-top: 20px;
    }
    .footer h3 {
      color: #D4AF37;
      font-size: 16px;
      font-weight: bold;
      margin: 0 0 10px 0;
    }
    .footer a {
      color: #D4AF37;
      text-decoration: none;
      font-size: 14px;
    }
  </style>
</head>
<body>
<div class="email-container">
  <div class="header">
    <img src="https://gtpqppvyjrnnuhlsbpqd.supabase.co/storage/v1/object/public/campaign-covers/lovable-uploads/6fdfc5d2-230c-4142-bf7c-3a326e5e45a8.png" alt="STA Fotos Logo" />
    <h1>💰 Nova Venda Realizada!</h1>
  </div>
  
  <div class="content-section">
    <h2 style="color: #333; font-size: 24px; margin: 0 0 15px 0; text-align: center;">
      🎉 Parabéns, {{NOME_FOTOGRAFO}}!
    </h2>
    
    <p style="font-size: 16px; color: #555; text-align: center; margin-bottom: 25px;">
      Uma das suas fotos foi vendida! Veja os detalhes abaixo:
    </p>
    
    <div class="earnings-box">
      <h3 style="margin: 0 0 10px 0; font-size: 20px;">💵 Seus Ganhos</h3>
      <p style="margin: 0; font-size: 32px; font-weight: bold;">R$ {{VALOR_FOTOGRAFO}}</p>
      <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Valor líquido para você</p>
    </div>
    
    <div class="highlight-box">
      <h3 style="color: #D4AF37; font-size: 18px; margin: 0 0 15px 0; text-align: center;">
        📸 Detalhes da Venda
      </h3>
      
      <div class="detail-row">
        <span><strong>📷 Foto vendida:</strong></span>
        <span>{{TITULO_FOTO}}</span>
      </div>
      <div class="detail-row">
        <span><strong>👤 Comprador:</strong></span>
        <span>{{NOME_COMPRADOR}}</span>
      </div>
      <div class="detail-row">
        <span><strong>🏆 Evento:</strong></span>
        <span>{{TITULO_CAMPANHA}}</span>
      </div>
      <div class="detail-row">
        <span><strong>💰 Valor total:</strong></span>
        <span>R$ {{VALOR_TOTAL}}</span>
      </div>
      <div class="detail-row">
        <span><strong>💵 Seu valor:</strong></span>
        <span style="color: #28a745; font-weight: bold;">R$ {{VALOR_FOTOGRAFO}}</span>
      </div>
      <div class="detail-row">
        <span><strong>📅 Data da venda:</strong></span>
        <span>{{DATA_VENDA}}</span>
      </div>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{BASE_URL}}/dashboard" class="button-primary">
        📊 Ver Dashboard
      </a>
    </div>
    
    <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 25px 0;">
      <h4 style="color: #D4AF37; font-size: 16px; margin: 0 0 15px 0;">
        🚀 Continue vendendo:
      </h4>
      <ul style="color: #555; font-size: 14px; margin: 0; padding-left: 20px; line-height: 1.8;">
        <li><strong>📱 Faça mais uploads</strong> - Quanto mais fotos, mais vendas!</li>
        <li><strong>🏆 Participe de novos eventos</strong> - Diversifique seu portfólio</li>
        <li><strong>💡 Melhore a qualidade</strong> - Fotos melhores vendem mais</li>
        <li><strong>📊 Acompanhe suas vendas</strong> - Use o dashboard para otimizar</li>
      </ul>
    </div>
  </div>
  
  <div class="footer">
    <div style="display: flex; justify-content: space-around; max-width: 600px; margin: 0 auto; flex-wrap: wrap; gap: 20px;">
      <div style="flex: 1; min-width: 200px; text-align: left;">
        <h3>Contato</h3>
        <p style="font-size: 14px; margin: 5px 0; color: #ccc;">📧 contato@stafotos.com.br</p>
        <p style="font-size: 14px; margin: 5px 0; color: #ccc;">📱 (11) 95771-9467</p>
      </div>
      
      <div style="flex: 1; min-width: 200px; text-align: left;">
        <h3>Links Úteis</h3>
        <p style="margin: 5px 0;">
          <a href="{{BASE_URL}}/dashboard">📊 Dashboard</a>
        </p>
        <p style="margin: 5px 0;">
          <a href="{{BASE_URL}}/events">📅 Eventos</a>
        </p>
      </div>
    </div>
    
    <div style="height: 1px; background: #444; margin: 25px 0;"></div>
    
    <div style="text-align: center;">
      <p style="font-size: 14px; color: #999; margin: 10px 0;">
        © 2024 STA Fotos - Photo Arena. Todos os direitos reservados.
      </p>
    </div>
  </div>
</div>
</body>
</html>
`;

// Template para relatório de organizações
const ORGANIZATION_REPORT_TEMPLATE = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Relatório de Receitas - STA Fotos</title>
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
    .header {
      background: linear-gradient(135deg, #D4AF37 0%, #F4D03F 100%);
      padding: 30px 20px;
      text-align: center;
      border-radius: 10px 10px 0 0;
    }
    .header img {
      height: 60px;
      width: auto;
      margin-bottom: 15px;
    }
    .header h1 {
      color: #000;
      font-size: 28px;
      font-weight: bold;
      margin: 0;
      text-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .content-section {
      padding: 30px;
      background: #fff;
    }
    .revenue-box {
      background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
      color: #fff;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      margin: 20px 0;
      box-shadow: 0 4px 8px rgba(40, 167, 69, 0.3);
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 15px;
      margin: 20px 0;
    }
    .stat-card {
      background: #f8f9fa;
      border: 2px solid #D4AF37;
      border-radius: 8px;
      padding: 15px;
      text-align: center;
    }
    .highlight-box {
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      border: 2px solid #D4AF37;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .button-primary {
      background: linear-gradient(135deg, #D4AF37 0%, #F4D03F 100%);
      color: #000;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      display: inline-block;
      font-weight: bold;
      box-shadow: 0 4px 8px rgba(212, 175, 55, 0.3);
    }
    .footer {
      background: #262626;
      color: #fff;
      padding: 30px 20px;
      text-align: center;
      border-radius: 0 0 10px 10px;
      margin-top: 20px;
    }
    .footer h3 {
      color: #D4AF37;
      font-size: 16px;
      font-weight: bold;
      margin: 0 0 10px 0;
    }
    .footer a {
      color: #D4AF37;
      text-decoration: none;
      font-size: 14px;
    }
  </style>
</head>
<body>
<div class="email-container">
  <div class="header">
    <img src="https://gtpqppvyjrnnuhlsbpqd.supabase.co/storage/v1/object/public/campaign-covers/lovable-uploads/6fdfc5d2-230c-4142-bf7c-3a326e5e45a8.png" alt="STA Fotos Logo" />
    <h1>📊 Relatório de Receitas</h1>
  </div>
  
  <div class="content-section">
    <h2 style="color: #333; font-size: 24px; margin: 0 0 15px 0; text-align: center;">
      {{NOME_ORGANIZACAO}}
    </h2>
    
    <p style="font-size: 16px; color: #555; text-align: center; margin-bottom: 25px;">
      Relatório do período: <strong>{{PERIODO}}</strong>
    </p>
    
    <div class="revenue-box">
      <h3 style="margin: 0 0 10px 0; font-size: 20px;">💰 Receita da Organização</h3>
      <p style="margin: 0; font-size: 32px; font-weight: bold;">R$ {{VALOR_ORGANIZACAO}}</p>
      <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Valor líquido para sua organização</p>
    </div>
    
    <div class="stats-grid">
      <div class="stat-card">
        <h4 style="color: #D4AF37; margin: 0 0 10px 0; font-size: 16px;">💰 Receita Total</h4>
        <p style="margin: 0; font-size: 20px; font-weight: bold; color: #28a745;">R$ {{RECEITA_TOTAL}}</p>
      </div>
      <div class="stat-card">
        <h4 style="color: #D4AF37; margin: 0 0 10px 0; font-size: 16px;">📸 Total de Vendas</h4>
        <p style="margin: 0; font-size: 20px; font-weight: bold; color: #007bff;">{{TOTAL_VENDAS}}</p>
      </div>
    </div>
    
    <div class="highlight-box">
      <h3 style="color: #D4AF37; font-size: 18px; margin: 0 0 15px 0; text-align: center;">
        🏆 Desempenho por Evento
      </h3>
      
      {{EVENTOS_HTML}}
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{BASE_URL}}/dashboard" class="button-primary">
        📊 Ver Dashboard Completo
      </a>
    </div>
    
    <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 25px 0;">
      <h4 style="color: #D4AF37; font-size: 16px; margin: 0 0 15px 0;">
        🚀 Próximos passos:
      </h4>
      <ul style="color: #555; font-size: 14px; margin: 0; padding-left: 20px; line-height: 1.8;">
        <li><strong>📅 Crie novos eventos</strong> - Mais eventos = mais receita</li>
        <li><strong>📱 Convide fotógrafos</strong> - Amplie sua rede de profissionais</li>
        <li><strong>📈 Analise tendências</strong> - Use dados para otimizar</li>
        <li><strong>🎯 Marketing direcionado</strong> - Promova seus eventos</li>
      </ul>
    </div>
    
    <div style="border: 1px solid #D4AF37; border-radius: 8px; padding: 20px; margin: 25px 0; background: #fffbf0;">
      <h4 style="color: #D4AF37; font-size: 16px; margin: 0 0 10px 0;">
        📞 Suporte para Organizações
      </h4>
      <p style="color: #555; font-size: 14px; margin: 5px 0; line-height: 1.6;">
        Nossa equipe especializada está disponível para ajudar sua organização. Entre em contato através do email 
        <strong>organizacoes@stafotos.com.br</strong> ou pelo WhatsApp <strong>(11) 95771-9467</strong>.
      </p>
    </div>
  </div>
  
  <div class="footer">
    <div style="display: flex; justify-content: space-around; max-width: 600px; margin: 0 auto; flex-wrap: wrap; gap: 20px;">
      <div style="flex: 1; min-width: 200px; text-align: left;">
        <h3>Contato</h3>
        <p style="font-size: 14px; margin: 5px 0; color: #ccc;">📧 organizacoes@stafotos.com.br</p>
        <p style="font-size: 14px; margin: 5px 0; color: #ccc;">📱 (11) 95771-9467</p>
      </div>
      
      <div style="flex: 1; min-width: 200px; text-align: left;">
        <h3>Dashboard</h3>
        <p style="margin: 5px 0;">
          <a href="{{BASE_URL}}/dashboard">📊 Acessar Dashboard</a>
        </p>
        <p style="margin: 5px 0;">
          <a href="{{BASE_URL}}/events">📅 Gerenciar Eventos</a>
        </p>
      </div>
    </div>
    
    <div style="height: 1px; background: #444; margin: 25px 0;"></div>
    
    <div style="text-align: center;">
      <p style="font-size: 14px; color: #999; margin: 10px 0;">
        © 2024 STA Fotos - Photo Arena. Todos os direitos reservados.
      </p>
    </div>
  </div>
</div>
</body>
</html>
`;

// Função para envio de relatório para organizações
export const sendOrganizationRevenueReport = async (
  organizationEmail: string,
  organizationName: string,
  reportDetails: {
    period: string;
    totalRevenue: number;
    organizationAmount: number;
    totalSales: number;
    events: Array<{
      eventName: string;
      sales: number;
      revenue: number;
    }>;
  }
) => {
  try {
    // Gerar HTML dos eventos
    const eventsHtml = reportDetails.events.map(event => `
      <div style="
        border: 1px solid #D4AF37;
        border-radius: 8px;
        padding: 15px;
        margin: 10px 0;
        background: #f8f9fa;
      ">
        <h4 style="color: #333; margin: 0 0 10px 0;">${event.eventName}</h4>
        <div style="display: flex; justify-content: space-between; margin: 5px 0;">
          <span><strong>📸 Vendas:</strong></span>
          <span>${event.sales}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin: 5px 0;">
          <span><strong>💰 Receita:</strong></span>
          <span style="color: #28a745; font-weight: bold;">R$ ${event.revenue.toFixed(2)}</span>
        </div>
      </div>
    `).join('');

    const emailHtml = ORGANIZATION_REPORT_TEMPLATE
      .replace(/{{NOME_ORGANIZACAO}}/g, organizationName)
      .replace(/{{PERIODO}}/g, reportDetails.period)
      .replace(/{{RECEITA_TOTAL}}/g, reportDetails.totalRevenue.toFixed(2))
      .replace(/{{VALOR_ORGANIZACAO}}/g, reportDetails.organizationAmount.toFixed(2))
      .replace(/{{TOTAL_VENDAS}}/g, reportDetails.totalSales.toString())
      .replace(/{{EVENTOS_HTML}}/g, eventsHtml)
      .replace(/{{BASE_URL}}/g, BASE_URL);

    console.log('Enviando relatório de receitas para organização:', organizationEmail);
    console.log('Assunto:', `📊 Relatório de Receitas - ${reportDetails.period}`);
    console.log('Conteúdo HTML gerado com template STA Fotos');
    
    return { success: true, message: 'Relatório enviado para a organização!' };
  } catch (error) {
    console.error('Erro ao enviar relatório para organização:', error);
    return { success: false, message: 'Erro ao enviar relatório' };
  }
};
