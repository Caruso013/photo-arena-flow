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
 */
async function shareToSaveGallery(blob: Blob, fileName: string): Promise<boolean> {
  try {
    if (!canShareFiles()) return false;

    const file = new File([blob], fileName, { type: blob.type || 'image/jpeg' });
    
    // Verificar se pode compartilhar este arquivo
    if (!navigator.canShare({ files: [file] })) {
      console.log('Web Share API não suporta este tipo de arquivo');
      return false;
    }

    await navigator.share({
      files: [file],
      title: 'Salvar Foto',
    });

    return true;
  } catch (error: any) {
    // Se o usuário cancelou, não é erro
    if (error.name === 'AbortError') {
      console.log('Compartilhamento cancelado pelo usuário');
      return true; // Retorna true porque não é um erro técnico
    }
    console.error('Erro no Web Share:', error);
    return false;
  }
}

/**
 * Abre imagem em nova aba otimizada para iOS (fullscreen para facilitar salvamento)
 */
function openImageForIOSSave(signedUrl: string, fileName: string): void {
  // Criar página HTML otimizada para iOS
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=3.0, user-scalable=yes">
      <title>Salvar Foto - ${fileName}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          background: #000; 
          min-height: 100vh; 
          display: flex; 
          flex-direction: column;
          align-items: center; 
          justify-content: center;
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          padding: 20px;
          padding-top: env(safe-area-inset-top);
          padding-bottom: env(safe-area-inset-bottom);
        }
        .instructions {
          color: white;
          text-align: center;
          padding: 15px 20px;
          background: rgba(255,255,255,0.15);
          border-radius: 12px;
          margin-bottom: 20px;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }
        .instructions h2 { font-size: 18px; margin-bottom: 8px; }
        .instructions p { font-size: 14px; opacity: 0.9; line-height: 1.4; }
        .icon { font-size: 24px; margin-bottom: 5px; }
        img { 
          max-width: 100%; 
          max-height: 70vh; 
          object-fit: contain;
          border-radius: 8px;
          -webkit-touch-callout: default !important;
          -webkit-user-select: auto !important;
        }
        .close-btn {
          position: fixed;
          top: max(20px, env(safe-area-inset-top));
          right: 20px;
          background: rgba(255,255,255,0.2);
          border: none;
          color: white;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          font-size: 20px;
          cursor: pointer;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }
      </style>
    </head>
    <body>
      <button class="close-btn" onclick="window.close()">✕</button>
      <div class="instructions">
        <div class="icon">📲</div>
        <h2>Salvar na Galeria</h2>
        <p><strong>Toque e segure</strong> na foto abaixo, depois escolha <strong>"Salvar Imagem"</strong> ou <strong>"Adicionar às Fotos"</strong></p>
      </div>
      <img src="${signedUrl}" alt="${fileName}" />
    </body>
    </html>
  `;

  const blob = new Blob([htmlContent], { type: 'text/html' });
  const blobUrl = URL.createObjectURL(blob);
  
  const newWindow = window.open(blobUrl, '_blank');
  
  // Limpar blob URL após um tempo
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
  
  if (!newWindow) {
    // Fallback: abrir direto a imagem
    window.open(signedUrl, '_blank');
  }
}

/**
 * Baixa uma foto do bucket privado usando URL assinada
 * Compatível com iOS/Safari - usa Web Share API ou abre página otimizada
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

    const isIOSDevice = isIOS();
    const isSafariBrowser = isSafari();

    // Para iOS/Safari: tentar Web Share API primeiro (permite salvar na galeria diretamente)
    if (isIOSDevice || isSafariBrowser) {
      toast.loading('Preparando para salvar...', { id: 'download-toast' });
      
      // Baixar como blob primeiro
      const blob = await urlToBlob(signedUrl);
      
      if (blob) {
        // Tentar Web Share API (iOS 15+ permite salvar direto na galeria)
        const shared = await shareToSaveGallery(blob, fileName);
        
        if (shared) {
          toast.success('Use "Salvar Imagem" para adicionar à galeria!', { id: 'download-toast' });
          return;
        }
      }
      
      // Fallback: abrir página otimizada com instruções
      openImageForIOSSave(signedUrl, fileName);
      toast.success('Toque e segure na foto para salvar!', { id: 'download-toast', duration: 5000 });
      return;
    }

    // Para outros navegadores: baixar como blob (método padrão)
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
    toast.error('Erro ao baixar foto. Tente novamente.', { id: 'download-toast' });
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
  
  // Para iOS com múltiplas fotos, mostrar instrução especial
  if (isIOSDevice && photos.length > 1) {
    toast.info(`Baixando ${photos.length} fotos. Cada uma será aberta para você salvar.`, { duration: 5000 });
  } else {
    toast.info(`Iniciando download de ${photos.length} fotos...`);
  }
  
  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];
    const fileName = `${buyerName.replace(/\s+/g, '_')}_${photo.photo_id.slice(0, 8)}.jpg`;
    
    // Delay maior para iOS para dar tempo ao usuário salvar cada foto
    const delay = isIOSDevice ? 2500 : 800;
    await new Promise(resolve => setTimeout(resolve, i === 0 ? 0 : delay));
    await downloadOriginalPhoto(photo.photo_url, fileName);
  }
  
  if (!isIOSDevice) {
    toast.success(`Download de ${photos.length} fotos concluído!`);
  }
}
