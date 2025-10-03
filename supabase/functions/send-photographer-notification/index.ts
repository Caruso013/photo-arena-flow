import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationRequest {
  email: string
  name: string
  status: 'submitted' | 'approved' | 'rejected'
  rejectionReason?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, name, status, rejectionReason }: NotificationRequest = await req.json()

    // Validate required fields
    if (!email || !name || !status) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, name, status' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Initialize Resend
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY não configurada')
      return new Response(
        JSON.stringify({ error: 'Configuração de email não encontrada' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Prepare email content based on status
    let subject: string
    let htmlContent: string

    switch (status) {
      case 'submitted':
        subject = '📸 Candidatura para Fotógrafo Recebida - Photo Arena'
        htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Candidatura Recebida</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2563eb; margin-bottom: 10px;">📸 Photo Arena</h1>
              <h2 style="color: #1e40af; margin-top: 0;">Candidatura Recebida!</h2>
            </div>
            
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="color: #1e40af; margin-top: 0;">Olá, ${name}!</h3>
              <p>Recebemos sua candidatura para se tornar um fotógrafo credenciado na Photo Arena!</p>
              
              <p><strong>O que acontece agora:</strong></p>
              <ul style="margin: 15px 0; padding-left: 20px;">
                <li>Nossa equipe analisará seu portfolio e experiência</li>
                <li>Avaliaremos se seu perfil está alinhado com nossos padrões de qualidade</li>
                <li>Você receberá uma resposta por email em até 5 dias úteis</li>
              </ul>
              
              <p><strong>Critérios de avaliação:</strong></p>
              <ul style="margin: 15px 0; padding-left: 20px;">
                <li>Qualidade técnica e artística do portfolio</li>
                <li>Experiência comprovada em fotografia de eventos</li>
                <li>Profissionalismo e comprometimento</li>
                <li>Adequação aos nossos padrões de qualidade</li>
              </ul>
            </div>
            
            <div style="background: #ecfdf5; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;">
              <p style="margin: 0; color: #065f46;">
                💡 <strong>Dica:</strong> Enquanto aguarda, que tal explorar nossa plataforma e ver os trabalhos de outros fotógrafos? Isso pode te dar insights sobre o tipo de conteúdo que valorizamos!
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px;">
                Este é um email automático. Em caso de dúvidas, responda este email ou entre em contato conosco.
              </p>
              <p style="color: #6b7280; font-size: 12px; margin-top: 10px;">
                Photo Arena - Capturando momentos únicos
              </p>
            </div>
          </body>
          </html>
        `
        break

      case 'approved':
        subject = '🎉 Candidatura Aprovada - Bem-vindo à Photo Arena!'
        htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Candidatura Aprovada</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2563eb; margin-bottom: 10px;">📸 Photo Arena</h1>
              <h2 style="color: #059669; margin-top: 0;">🎉 Parabéns! Candidatura Aprovada!</h2>
            </div>
            
            <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 2px solid #10b981;">
              <h3 style="color: #059669; margin-top: 0;">Olá, ${name}!</h3>
              <p>É com grande prazer que informamos que sua candidatura para se tornar um fotógrafo credenciado na Photo Arena foi <strong>APROVADA</strong>!</p>
              
              <p>Ficamos impressionados com a qualidade do seu portfolio e acreditamos que você será uma excelente adição à nossa comunidade de fotógrafos profissionais.</p>
            </div>
            
            <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="color: #0284c7; margin-top: 0;">🚀 Próximos Passos:</h3>
              <ol style="margin: 15px 0; padding-left: 20px;">
                <li><strong>Acesse sua conta:</strong> Faça login na plataforma - seu perfil já foi atualizado para fotógrafo</li>
                <li><strong>Complete seu perfil:</strong> Adicione mais informações sobre suas especialidades e experiência</li>
                <li><strong>Explore oportunidades:</strong> Comece a se candidatar para eventos disponíveis</li>
                <li><strong>Configure pagamentos:</strong> Configure suas informações de pagamento para receber pelas fotos vendidas</li>
              </ol>
            </div>
            
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin-bottom: 20px;">
              <h4 style="color: #92400e; margin-top: 0;">📋 Lembrete Importante:</h4>
              <p style="margin: 0; color: #92400e;">
                Como fotógrafo credenciado, você deve manter os altos padrões de qualidade que nos impressionaram. 
                Certifique-se de entregar sempre o seu melhor trabalho!
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${Deno.env.get('SITE_URL') || 'https://photo-arena.com'}/dashboard" 
                 style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                Acessar Minha Conta
              </a>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px;">
                Bem-vindo à nossa comunidade de fotógrafos profissionais! 🎊
              </p>
              <p style="color: #6b7280; font-size: 12px; margin-top: 10px;">
                Photo Arena - Capturando momentos únicos
              </p>
            </div>
          </body>
          </html>
        `
        break

      case 'rejected':
        subject = '📸 Atualização sobre sua Candidatura - Photo Arena'
        htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Candidatura Não Aprovada</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2563eb; margin-bottom: 10px;">📸 Photo Arena</h1>
              <h2 style="color: #dc2626; margin-top: 0;">Atualização sobre sua Candidatura</h2>
            </div>
            
            <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #dc2626;">
              <h3 style="color: #991b1b; margin-top: 0;">Olá, ${name},</h3>
              <p>Agradecemos pelo interesse em se tornar um fotógrafo credenciado na Photo Arena e pelo tempo dedicado ao envio da sua candidatura.</p>
              
              <p>Após uma análise cuidadosa, decidimos não prosseguir com sua candidatura neste momento.</p>
              
              ${rejectionReason ? `
                <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
                  <h4 style="color: #991b1b; margin-top: 0;">Feedback da nossa equipe:</h4>
                  <p style="margin: 0; color: #7f1d1d;">${rejectionReason}</p>
                </div>
              ` : ''}
            </div>
            
            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="color: #166534; margin-top: 0;">💡 Não desista!</h3>
              <p>Esta decisão não é definitiva. Encorajamos você a:</p>
              <ul style="margin: 15px 0; padding-left: 20px;">
                <li>Continuar desenvolvendo suas habilidades fotográficas</li>
                <li>Expandir seu portfolio com trabalhos de alta qualidade</li>
                <li>Ganhar mais experiência em fotografia de eventos</li>
                <li>Considerar uma nova candidatura no futuro</li>
              </ul>
            </div>
            
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #64748b;">
              <p style="margin: 0; color: #475569;">
                <strong>Dica:</strong> Continue acompanhando nossa plataforma e observe o trabalho de nossos fotógrafos credenciados. 
                Isso pode te ajudar a entender melhor nossos padrões de qualidade.
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px;">
                Em caso de dúvidas sobre este feedback, sinta-se à vontade para responder este email.
              </p>
              <p style="color: #6b7280; font-size: 12px; margin-top: 10px;">
                Photo Arena - Capturando momentos únicos
              </p>
            </div>
          </body>
          </html>
        `
        break

      default:
        return new Response(
          JSON.stringify({ error: 'Status inválido' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
    }

    // Send email via Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Photo Arena <noreply@photo-arena.com>',
        to: [email],
        subject,
        html: htmlContent,
      }),
    })

    const emailData = await emailResponse.json()

    if (!emailResponse.ok) {
      console.error('Erro ao enviar email:', emailData)
      return new Response(
        JSON.stringify({ error: 'Erro ao enviar email', details: emailData }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Email enviado com sucesso:', emailData)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email enviado com sucesso',
        emailId: emailData.id 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Erro na função de notificação:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor',
        message: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})