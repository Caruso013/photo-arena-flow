// Resend API Helper
// Domínio: stafotos.com

interface EmailParams {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL = 'noreply@stafotos.com';
const FROM_NAME = 'StaFotos';

export async function sendEmail({ to, subject, html, from }: EmailParams) {
  if (!RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY não configurada!');
    throw new Error('RESEND_API_KEY não está configurada nas variáveis de ambiente');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: from || `${FROM_NAME} <${FROM_EMAIL}>`,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('❌ Erro ao enviar email:', error);
    throw new Error(`Falha ao enviar email: ${error}`);
  }

  const data = await response.json();
  console.log('✅ Email enviado:', data.id);
  return data;
}

// Template base HTML responsivo
export function getEmailTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>StaFotos</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 20px;
      text-align: center;
    }
    .logo {
      font-size: 32px;
      font-weight: bold;
      color: #ffffff;
      text-decoration: none;
    }
    .content {
      padding: 40px 30px;
    }
    .button {
      display: inline-block;
      padding: 14px 32px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      margin: 20px 0;
      text-align: center;
    }
    .footer {
      background-color: #f9fafb;
      padding: 30px;
      text-align: center;
      color: #6b7280;
      font-size: 14px;
      border-top: 1px solid #e5e7eb;
    }
    .info-box {
      background-color: #f0f9ff;
      border-left: 4px solid #667eea;
      padding: 16px;
      margin: 20px 0;
      border-radius: 4px;
    }
    h1 { font-size: 24px; margin-bottom: 20px; color: #1f2937; }
    h2 { font-size: 20px; margin: 20px 0 10px; color: #374151; }
    p { margin-bottom: 16px; color: #4b5563; }
    .highlight { color: #667eea; font-weight: 600; }
    @media only screen and (max-width: 600px) {
      .content { padding: 30px 20px; }
      .button { display: block; margin: 20px 0; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <a href="https://stafotos.com" class="logo">📸 StaFotos</a>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p><strong>StaFotos</strong> - Plataforma de Fotos de Eventos</p>
      <p>Este é um email automático, por favor não responda.</p>
      <p style="margin-top: 10px;">
        <a href="https://stafotos.com" style="color: #667eea; text-decoration: none;">www.stafotos.com</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}
