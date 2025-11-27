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
  const baseUrl = window.location.origin + window.location.pathname.replace(/\/$/, '');
  
  if (campaign.short_code) {
    return `${baseUrl}#/E/${campaign.short_code}`;
  }
  
  // Fallback para ID se não houver código curto
  return `${baseUrl}#/campaign/${campaign.id}`;
}

/**
 * Copia o link de compartilhamento para o clipboard
 */
export async function copyShareLink(campaign: Campaign): Promise<boolean> {
  try {
    const link = generateShareLink(campaign);
    await navigator.clipboard.writeText(link);
    return true;
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
