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
 * Detecta se é Safari (desktop ou mobile)
 */
function isSafari(): boolean {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

/**
 * Verifica se Web Share API está disponível para arquivos
 */
function canShareFiles(): boolean {
  return typeof navigator.share === 'function' && typeof navigator.canShare === 'function';
}

/**
 * Gera URL assinada para download de foto do bucket privado photos-original
 * @param originalUrl - URL da foto original (pode ser path ou URL completa)
 * @returns URL assinada válida por 300 segundos (5 minutos)
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

    // Gerar URL assinada (válida por 5 minutos para dar tempo ao usuário)
    const { data, error } = await supabase.storage
      .from('photos-original')
      .createSignedUrl(photoPath, 300);

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
 * Converte URL para Blob
 */
async function urlToBlob(url: string): Promise<Blob | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Falha ao baixar imagem');
    return await response.blob();
  } catch (error) {
    console.error('Erro ao converter URL para blob:', error);
    return null;
  }
}

/**
 * Tenta usar Web Share API para salvar na galeria (iOS 15+)
 * Retorna true se compartilhou com sucesso, false se falhou
 */
async function shareToSaveGallery(blob: Blob, fileName: string): Promise<boolean> {
  try {
    if (!canShareFiles()) {
      console.log('Web Share API não disponível');
      return false;
    }

    const file = new File([blob], fileName, { type: blob.type || 'image/jpeg' });
    
    // Verificar se pode compartilhar este arquivo
    if (!navigator.canShare({ files: [file] })) {
      console.log('Navegador não suporta compartilhar este tipo de arquivo');
      return false;
    }

    await navigator.share({
      files: [file],
      title: 'Salvar Foto',
    });

    return true;
  } catch (error: any) {
    // Se o usuário cancelou, não é erro técnico
    if (error.name === 'AbortError') {
      console.log('Compartilhamento cancelado pelo usuário');
      return true;
    }
    console.error('Erro no Web Share:', error);
    return false;
  }
}

/**
 * Força download via anchor tag com blob (fallback para Safari)
 */
async function forceDownloadViaAnchor(blob: Blob, fileName: string): Promise<boolean> {
  try {
    const blobUrl = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    link.style.display = 'none';
    
    // Para Safari: precisa adicionar ao DOM e simular clique
    document.body.appendChild(link);
    
    // Usar timeout para garantir que o DOM processou
    await new Promise(resolve => setTimeout(resolve, 100));
    
    link.click();
    
    // Cleanup após delay
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    }, 1000);
    
    return true;
  } catch (error) {
    console.error('Erro no download via anchor:', error);
    return false;
  }
}

/**
 * Abre imagem diretamente para o usuário salvar manualmente (último fallback)
 */
function openImageDirectly(signedUrl: string): void {
  // Abrir imagem diretamente - usuário pode tocar e segurar para salvar
  window.open(signedUrl, '_blank');
}

/**
 * Baixa uma foto do bucket privado usando URL assinada
 * Compatível com iOS/Safari - tenta múltiplos métodos
 * @param originalUrl - URL da foto original
 * @param fileName - Nome do arquivo para download
 */
export async function downloadOriginalPhoto(originalUrl: string, fileName: string, toastId?: string): Promise<void> {
  const currentToastId = toastId || `download-${Date.now()}`;
  
  try {
    toast.loading('Preparando download...', { id: currentToastId });
    
    const signedUrl = await getSignedPhotoUrl(originalUrl);
    
    if (!signedUrl) {
      toast.error('Erro ao gerar link de download', { id: currentToastId });
      return;
    }

    const isIOSDevice = isIOS();
    const isSafariBrowser = isSafari();
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    // Baixar como blob primeiro (necessário para todos os métodos)
    const blob = await urlToBlob(signedUrl);
    
    if (!blob) {
      // Se não conseguiu baixar blob, abrir URL direta
      openImageDirectly(signedUrl);
      toast.success('Foto aberta! Toque e segure para salvar.', { id: currentToastId, duration: 5000 });
      return;
    }

    // MÉTODO 1: Para iOS/Safari - tentar Web Share API primeiro (salva direto na galeria)
    if (isIOSDevice || isSafariBrowser) {
      const shared = await shareToSaveGallery(blob, fileName);
      
      if (shared) {
        toast.success('Escolha "Salvar Imagem" na galeria!', { id: currentToastId, duration: 4000 });
        return;
      }
      
      // MÉTODO 2: Tentar download via anchor
      const downloaded = await forceDownloadViaAnchor(blob, fileName);
      
      if (downloaded) {
        toast.success('Download iniciado!', { id: currentToastId });
        return;
      }
      
      // MÉTODO 3: Último recurso - abrir imagem para salvar manualmente
      openImageDirectly(signedUrl);
      toast.info('Toque e segure na foto para salvar', { 
        id: currentToastId, 
        duration: 6000 
      });
      return;
    }

    // Para Android mobile - também tentar Web Share API primeiro
    if (isMobile) {
      const shared = await shareToSaveGallery(blob, fileName);
      
      if (shared) {
        toast.success('Foto salva!', { id: currentToastId });
        return;
      }
    }

    // Para outros navegadores (Chrome, Firefox, Edge): download padrão via blob
    const downloaded = await forceDownloadViaAnchor(blob, fileName);
    
    if (downloaded) {
      toast.success('Download concluído!', { id: currentToastId });
    } else {
      // Fallback: abrir diretamente
      openImageDirectly(signedUrl);
      toast.success('Foto aberta! Clique direito para salvar.', { id: currentToastId });
    }
  } catch (error) {
    console.error('Erro no download:', error);
    toast.error('Erro ao baixar foto. Tente novamente.', { id: currentToastId });
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
  const isIOSDevice = isIOS();
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  
  // Para mobile com múltiplas fotos, avisar sobre o processo
  if (isMobile && photos.length > 1) {
    toast.info(`Baixando ${photos.length} fotos...`, { duration: 4000 });
  } else {
    toast.info(`Iniciando download de ${photos.length} fotos...`);
  }
  
  let successCount = 0;
  
  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];
    const fileName = `${buyerName.replace(/\s+/g, '_')}_foto_${i + 1}.jpg`;
    const toastId = `download-${photo.photo_id}`;
    
    // Delay maior para mobile para dar tempo ao usuário interagir
    const delay = isMobile ? 2500 : 600;
    if (i > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    try {
      await downloadOriginalPhoto(photo.photo_url, fileName, toastId);
      successCount++;
    } catch (error) {
      console.error(`Erro ao baixar foto ${i + 1}:`, error);
    }
  }
  
  if (successCount === photos.length) {
    toast.success(`${photos.length} fotos baixadas!`, { duration: 3000 });
  } else if (successCount > 0) {
    toast.success(`${successCount}/${photos.length} fotos baixadas`, { duration: 3000 });
  }
}
