import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
 * @param originalUrl - URL da foto original
 * @param fileName - Nome do arquivo para download
 */
export async function downloadOriginalPhoto(originalUrl: string, fileName: string): Promise<void> {
  try {
    const signedUrl = await getSignedPhotoUrl(originalUrl);
    
    if (!signedUrl) {
      toast.error('Erro ao gerar link de download');
      return;
    }

    // Abrir em nova aba para download
    const link = document.createElement('a');
    link.href = signedUrl;
    link.target = '_blank';
    link.download = fileName;
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Download iniciado!');
  } catch (error) {
    console.error('Erro no download:', error);
    toast.error('Erro ao baixar foto');
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
    
    // Delay entre downloads para não sobrecarregar
    await new Promise(resolve => setTimeout(resolve, i === 0 ? 0 : 800));
    await downloadOriginalPhoto(photo.photo_url, fileName);
  }
  
  toast.success(`Download de ${photos.length} fotos concluído!`);
}
