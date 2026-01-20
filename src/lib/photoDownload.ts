import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Detecta se é iOS/Safari
 */
function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/**
 * Gera URL assinada para download de foto do bucket privado photos-original
 * @param originalUrl - URL da foto original (pode ser path ou URL completa)
 * @returns URL assinada válida por 60 segundos
 */
export async function getSignedPhotoUrl(originalUrl: string): Promise<string | null> {
  try {
    if (!originalUrl) return null;

    // Extrair o path da foto do bucket
    let photoPath = originalUrl;
    
    // Se for URL completa do Supabase, extrair apenas o path
    if (originalUrl.includes('photos-original/')) {
      const match = originalUrl.match(/photos-original\/(.+)$/);
      if (match) {
        photoPath = match[1];
      }
    }

    // Gerar URL assinada (válida por 60 segundos)
    const { data, error } = await supabase.storage
      .from('photos-original')
      .createSignedUrl(photoPath, 60);

    if (error) {
      console.error('Erro ao gerar URL assinada:', error);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error('Erro ao processar URL da foto:', error);
    return null;
  }
}

/**
 * Baixa uma foto do bucket privado usando URL assinada
 * Compatível com iOS/Safari - abre em nova aba para permitir download
 * @param originalUrl - URL da foto original
 * @param fileName - Nome do arquivo para download
 */
export async function downloadOriginalPhoto(originalUrl: string, fileName: string): Promise<void> {
  try {
    toast.loading('Preparando download...', { id: 'download-toast' });
    
    const signedUrl = await getSignedPhotoUrl(originalUrl);
    
    if (!signedUrl) {
      toast.error('Erro ao gerar link de download', { id: 'download-toast' });
      return;
    }

    // Para iOS/Safari: abrir em nova aba (método mais confiável)
    if (isIOS()) {
      // No iOS, o melhor é abrir a imagem em nova aba e o usuário salva manualmente
      const newWindow = window.open(signedUrl, '_blank');
      if (newWindow) {
        toast.success('Foto aberta! Toque e segure para salvar.', { id: 'download-toast' });
      } else {
        // Se popup bloqueado, tentar link direto
        window.location.href = signedUrl;
        toast.success('Baixando foto...', { id: 'download-toast' });
      }
      return;
    }

    // Para outros navegadores: baixar como blob
    const response = await fetch(signedUrl);
    if (!response.ok) {
      throw new Error('Falha ao baixar imagem');
    }
    
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    
    // Criar link de download com blob URL
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    }, 100);
    
    toast.success('Download concluído!', { id: 'download-toast' });
  } catch (error) {
    console.error('Erro no download:', error);
    toast.error('Erro ao baixar foto', { id: 'download-toast' });
  }
}

/**
 * Baixa múltiplas fotos com delay entre downloads
 * @param photos - Array de fotos com url e nome
 * @param buyerName - Nome do comprador para nomear arquivos
 */
export async function downloadMultiplePhotos(
  photos: Array<{ photo_url: string; photo_id: string }>,
  buyerName: string
): Promise<void> {
  toast.info(`Iniciando download de ${photos.length} fotos...`);
  
  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];
    const fileName = `${buyerName.replace(/\s+/g, '_')}_${photo.photo_id.slice(0, 8)}.jpg`;
    
    // Delay maior para iOS
    const delay = isIOS() ? 1500 : 800;
    await new Promise(resolve => setTimeout(resolve, i === 0 ? 0 : delay));
    await downloadOriginalPhoto(photo.photo_url, fileName);
  }
  
  toast.success(`Download de ${photos.length} fotos concluído!`);
}
