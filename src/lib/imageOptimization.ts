/**
 * Image Optimization Utilities
 * Funções para otimização de carregamento de imagens
 */

export type ImageSize = 'blur' | 'thumbnail' | 'medium' | 'large' | 'original';

export interface ImageSizeConfig {
  width: number;
  height: number;
  quality: number;
}

// Configurações de tamanho otimizadas para reduzir Cached Egress
// Qualidades mais baixas para economizar bandwidth
export const IMAGE_SIZE_CONFIG: Record<ImageSize, ImageSizeConfig | null> = {
  blur: { width: 40, height: 40, quality: 15 },      // 3-5KB - blur inicial (reduzido)
  thumbnail: { width: 300, height: 225, quality: 65 }, // 20-35KB - preview (reduzido)
  medium: { width: 600, height: 450, quality: 75 },    // 60-100KB - visualização (reduzido)
  large: { width: 1000, height: 750, quality: 80 },    // 150-250KB - compra (reduzido)
  original: null // Sem transformação
};

/**
 * Gera URL otimizada do Supabase Storage com transformações
 */
export function getOptimizedImageUrl(
  url: string,
  size: ImageSize = 'medium'
): string {
  if (size === 'original' || !url.includes('supabase')) {
    return url;
  }

  const config = IMAGE_SIZE_CONFIG[size];
  if (!config) return url;

  try {
    // Adicionar parâmetros de transformação na URL + Cache headers
    const urlObj = new URL(url);
    const params = new URLSearchParams({
      width: config.width.toString(),
      height: config.height.toString(),
      quality: config.quality.toString(),
      format: 'webp', // WebP é ~30% menor que JPEG
      resize: 'cover'
    });

    urlObj.search = params.toString();
    
    // URL com parâmetros otimizados
    const optimizedUrl = urlObj.toString();
    
    // Cache no localStorage para evitar requisições duplicadas
    const cacheKey = `img_${size}_${url}`;
    try {
      localStorage.setItem(cacheKey, optimizedUrl);
    } catch (e) {
      // Ignorar erro de localStorage cheio
    }
    
    return optimizedUrl;
  } catch (error) {
    console.error('Error generating optimized URL:', error);
    return url;
  }
}

/**
 * Comprime imagem no client antes de upload
 */
export async function compressImage(
  file: File,
  maxWidth: number = 2000,
  quality: number = 0.9
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      let { width, height } = img;

      // Redimensionar se necessário
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      ctx?.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Gera thumbnail tiny para blur-up
 */
export async function generateTinyThumbnail(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      canvas.width = 50;
      canvas.height = 50;
      ctx?.drawImage(img, 0, 0, 50, 50);
      resolve(canvas.toDataURL('image/jpeg', 0.2));
    };

    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Lazy loading inteligente com Intersection Observer
 */
export function createLazyLoadObserver(
  callback: (entry: IntersectionObserverEntry) => void,
  options?: IntersectionObserverInit
): IntersectionObserver {
  const defaultOptions: IntersectionObserverInit = {
    root: null,
    rootMargin: '50px', // Começar a carregar 50px antes de entrar na viewport
    threshold: 0.01,
    ...options
  };

  return new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        callback(entry);
      }
    });
  }, defaultOptions);
}

/**
 * Calcula se a imagem deve ser eager ou lazy
 */
export function shouldEagerLoad(index: number, eagerCount: number = 8): boolean {
  return index < eagerCount;
}

/**
 * Cache de imagens no localStorage (URLs otimizadas)
 */
export const imageCache = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(`img_cache_${key}`);
    } catch {
      return null;
    }
  },

  set(key: string, value: string): void {
    try {
      localStorage.setItem(`img_cache_${key}`, value);
    } catch (error) {
      console.warn('Failed to cache image URL:', error);
    }
  },

  clear(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith('img_cache_')) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Failed to clear image cache:', error);
    }
  }
};
