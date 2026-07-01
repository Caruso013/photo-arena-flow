/**
 * Utilitários para gerar links de compartilhamento
 */

export interface Campaign {
  id: string;
  short_code?: string;
  title: string;
}

/**
 * Gera um link curto de compartilhamento para uma campanha
 * Formato: sta.com/E/ABC123
 */
export function generateShareLink(campaign: Campaign): string {
  const origin = window.location.origin;
  
  if (campaign.short_code) {
    return `${origin}/E/${campaign.short_code}`;
  }
  
  // Fallback para ID se não houver código curto
  return `${origin}/campaign/${campaign.id}`;
}

/**
 * Copia o link de compartilhamento para o clipboard
 * Usa Clipboard API quando disponível, com fallback para execCommand
 */
export async function copyShareLink(campaign: Campaign): Promise<boolean> {
  const link = generateShareLink(campaign);
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(link);
      return true;
    }
  } catch {
    // fallthrough para método legado
  }

  // Fallback: textarea + execCommand (funciona em HTTP e contextos restritos)
  try {
    const el = document.createElement('textarea');
    el.value = link;
    el.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0';
    document.body.appendChild(el);
    el.focus();
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  } catch (error) {
    console.error('Erro ao copiar link:', error);
    return false;
  }
}

/**
 * Compartilha via Web Share API (se disponível)
 */
export async function shareViaWebShare(campaign: Campaign): Promise<boolean> {
  if (!navigator.share) {
    return false;
  }

  try {
    await navigator.share({
      title: campaign.title,
      text: `Confira as fotos de ${campaign.title}`,
      url: generateShareLink(campaign),
    });
    return true;
  } catch (error) {
    // Usuário cancelou ou erro
    return false;
  }
}
