// 📧 Exemplos de Integração - Sistema de Emails StaFotos
// Copie e cole esses exemplos nos lugares apropriados da sua aplicação

import { supabase } from '@/integrations/supabase/client';

// ============================================
// 1️⃣ EMAIL DE BOAS-VINDAS
// ============================================
// Local: AuthContext.tsx ou página de registro
// Quando: Após sucesso no signUp

async function sendWelcomeEmail(email: string, fullName: string) {
  try {
    const { data, error } = await supabase.functions.invoke('send-welcome-email', {
      body: {
        email: email,
        fullName: fullName || 'Usuário'
      }
    });

    if (error) {
      console.error('Erro ao enviar email de boas-vindas:', error);
    } else {
      console.log('✅ Email de boas-vindas enviado!');
    }
  } catch (err) {
    console.error('Erro:', err);
  }
}

// Exemplo de uso no registro:
async function handleSignUp(email: string, password: string, fullName: string) {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      }
    }
  });

  if (!authError && authData.user) {
    // Enviar email de boas-vindas
    await sendWelcomeEmail(email, fullName);
  }
}

// ============================================
// 2️⃣ EMAIL DE RECUPERAÇÃO DE SENHA
// ============================================
// Local: Página de "Esqueci minha senha"
// Quando: Usuário solicita reset

async function sendPasswordResetEmail(email: string) {
  try {
    // 1. Gerar link de reset via Supabase Auth
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) throw error;

    // 2. Enviar email customizado (opcional - Supabase já envia um)
    // Se quiser usar seu template:
    const resetLink = `${window.location.origin}/reset-password?token=XXX`;
    
    await supabase.functions.invoke('send-password-reset-email', {
      body: {
        userEmail: email,
        userName: '', // Buscar do banco se necessário
        resetLink: resetLink
      }
    });

    console.log('✅ Email de recuperação enviado!');
  } catch (err) {
    console.error('Erro:', err);
  }
}

// ============================================
// 3️⃣ EMAIL DE VENDA (Para Fotógrafo)
// ============================================
// Local: Após confirmar pagamento/compra
// Quando: Uma foto é vendida

async function notifyPhotographerOfSale(purchaseData: any) {
  try {
    // Buscar dados do fotógrafo e foto
    const { data: photo } = await supabase
      .from('photos')
      .select('*, campaign:campaigns(*, photographer:profiles(*))')
      .eq('id', purchaseData.photo_id)
      .single();

    const { data: buyer } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', purchaseData.buyer_id)
      .single();

    // Calcular repasse do fotógrafo (93% menos taxa da organização)
    const photographerAmount = purchaseData.amount * 0.93; // Ajustar conforme lógica

    await supabase.functions.invoke('send-sale-notification-email', {
      body: {
        photographerEmail: photo.campaign.photographer.email,
        photographerName: photo.campaign.photographer.full_name,
        photoTitle: photo.title,
        campaignTitle: photo.campaign.title,
        saleAmount: purchaseData.amount,
        photographerAmount: photographerAmount,
        buyerName: buyer?.full_name || 'Cliente',
      }
    });

    console.log('✅ Email de venda enviado ao fotógrafo!');
  } catch (err) {
    console.error('Erro:', err);
  }
}

// ============================================
// 4️⃣ EMAIL DE COMPRA (Para Cliente)
// ============================================
// Local: Após confirmar pagamento
// Quando: Compra é confirmada

async function sendPurchaseConfirmation(purchaseId: string) {
  try {
    // Buscar dados da compra
    const { data: purchase } = await supabase
      .from('purchases')
      .select(`
        *,
        photo:photos(*, campaign:campaigns(*, photographer:profiles(*))),
        buyer:profiles(*)
      `)
      .eq('id', purchaseId)
      .single();

    await supabase.functions.invoke('send-purchase-confirmation-email', {
      body: {
        buyerEmail: purchase.buyer.email,
        buyerName: purchase.buyer.full_name,
        photoTitle: purchase.photo.title,
        campaignTitle: purchase.photo.campaign.title,
        amount: purchase.amount,
        downloadLink: purchase.photo.original_url, // Link de download
        photographerName: purchase.photo.campaign.photographer.full_name,
      }
    });

    console.log('✅ Email de confirmação enviado ao comprador!');
  } catch (err) {
    console.error('Erro:', err);
  }
}

// ============================================
// 5️⃣ EMAIL DE REPASSE APROVADO
// ============================================
// Local: Dashboard do admin, ao aprovar repasse
// Quando: Admin aprova solicitação de repasse

async function notifyPayoutApproved(payoutRequestId: string) {
  try {
    // Buscar dados da solicitação
    const { data: payout } = await supabase
      .from('payout_requests')
      .select('*, photographer:profiles(*)')
      .eq('id', payoutRequestId)
      .single();

    // Atualizar status
    await supabase
      .from('payout_requests')
      .update({ 
        status: 'approved',
        approved_at: new Date().toISOString()
      })
      .eq('id', payoutRequestId);

    // Enviar email
    await supabase.functions.invoke('send-payout-approved-email', {
      body: {
        photographerEmail: payout.photographer.email,
        photographerName: payout.photographer.full_name,
        amount: payout.amount,
        requestedAt: payout.requested_at,
        approvedAt: new Date().toISOString(),
        paymentMethod: 'PIX', // ou buscar do perfil
        estimatedDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // +2 dias
      }
    });

    console.log('✅ Email de repasse aprovado enviado!');
  } catch (err) {
    console.error('Erro:', err);
  }
}

// ============================================
// 6️⃣ EMAIL DE NOVO EVENTO (Para Admin)
// ============================================
// Local: Após fotógrafo criar campanha
// Quando: Nova campanha é criada

async function notifyAdminOfNewCampaign(campaignId: string) {
  try {
    // Buscar dados da campanha
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('*, photographer:profiles(*)')
      .eq('id', campaignId)
      .single();

    // Buscar email do admin
    const { data: admins } = await supabase
      .from('profiles')
      .select('email')
      .eq('role', 'admin')
      .limit(1);

    if (admins && admins.length > 0) {
      await supabase.functions.invoke('send-new-campaign-email', {
        body: {
          adminEmail: admins[0].email,
          campaignTitle: campaign.title,
          campaignDescription: campaign.description,
          photographerName: campaign.photographer.full_name,
          photographerEmail: campaign.photographer.email,
          eventDate: campaign.event_date,
          location: campaign.location,
          campaignId: campaign.id,
        }
      });

      console.log('✅ Email de novo evento enviado ao admin!');
    }
  } catch (err) {
    console.error('Erro:', err);
  }
}

// ============================================
// 🎯 INTEGRAÇÃO COMPLETA - Exemplo de Fluxo
// ============================================

// Exemplo: Fluxo completo de compra de foto
async function handlePhotoPurchase(photoId: string, buyerId: string, amount: number) {
  try {
    // 1. Criar registro de compra
    const { data: purchase, error: purchaseError } = await supabase
      .from('purchases')
      .insert({
        photo_id: photoId,
        buyer_id: buyerId,
        amount: amount,
        status: 'completed',
      })
      .select()
      .single();

    if (purchaseError) throw purchaseError;

    // 2. Criar revenue shares (plataforma, fotógrafo, organização)
    // ... lógica de criação de revenue shares ...

    // 3. Enviar email para o COMPRADOR
    await sendPurchaseConfirmation(purchase.id);

    // 4. Enviar email para o FOTÓGRAFO
    await notifyPhotographerOfSale(purchase);

    return { success: true, purchase };
  } catch (err) {
    console.error('Erro no fluxo de compra:', err);
    return { success: false, error: err };
  }
}

// ============================================
// 💡 DICAS DE USO
// ============================================

/*
1. SEMPRE use try-catch ao invocar as functions
2. Logs são seus amigos: console.log para debug
3. Teste com seu próprio email primeiro
4. Verifique spam/lixo eletrônico nos testes
5. Monitore os logs no Supabase Dashboard
6. Use variáveis de ambiente para emails de admin
7. Considere adicionar retry logic para falhas
8. Adicione loading states na UI enquanto envia
*/

// ============================================
// 🚨 TRATAMENTO DE ERROS
// ============================================

async function sendEmailWithRetry(
  functionName: string, 
  body: any, 
  maxRetries: number = 3
) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const { data, error } = await supabase.functions.invoke(functionName, { body });
      
      if (error) throw error;
      
      console.log(`✅ Email enviado com sucesso! (tentativa ${i + 1})`);
      return { success: true, data };
    } catch (err) {
      console.error(`❌ Tentativa ${i + 1} falhou:`, err);
      
      if (i === maxRetries - 1) {
        // Última tentativa falhou
        console.error('🚨 Todas as tentativas de envio falharam');
        return { success: false, error: err };
      }
      
      // Aguardar antes de tentar novamente
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}

// ============================================
// ✅ PRONTO PARA USAR!
// ============================================

export {
  sendWelcomeEmail,
  sendPasswordResetEmail,
  notifyPhotographerOfSale,
  sendPurchaseConfirmation,
  notifyPayoutApproved,
  notifyAdminOfNewCampaign,
  handlePhotopurchase,
  sendEmailWithRetry,
};
