/**
 * Compat layer para URLs de imagem otimizadas.
 * O nome do arquivo é histórico, mas a implementação usa o endpoint nativo
 * de transformação do Supabase para evitar proxy intermediário.
 */

import { ImageSize } from './imageOptimization';
import { getTransformedImageUrl, TransformSize } from './supabaseImageTransform';

/**
 * Gera URL otimizada via transformação nativa do Supabase
 */
export function getVercelImageUrl(
  supabaseUrl: string,
  size: ImageSize = 'medium',
  quality: number | null = null
): string {
  if (!supabaseUrl || !supabaseUrl.includes('supabase.co')) {
    return supabaseUrl;
  }

  if (size === 'original') {
    return supabaseUrl;
  }

  const mappedSize: TransformSize = size === 'blur' ? 'tiny' : size;
  const optimizedUrl = getTransformedImageUrl(supabaseUrl, mappedSize);

  if (!quality || optimizedUrl === supabaseUrl) {
    return optimizedUrl;
  }

  try {
    const url = new URL(optimizedUrl);
    url.searchParams.set('quality', String(quality));
    return url.toString();
  } catch {
    return optimizedUrl;
  }
}

/**
 * Determina se deve usar CDN ou Supabase direto
 */
export function shouldUseCdn(url: string, size: ImageSize): boolean {
  // Sempre usar transformação para thumbnails e medium (maior economia)
  if (size === 'thumbnail' || size === 'medium' || size === 'blur') {
    return true;
  }

  // Para large, usar transformação também
  if (size === 'large') {
    return true;
  }

  // Para original, usar Supabase direto (compras, privado)
  return false;
}

/**
 * Wrapper principal: decide se usa CDN ou Supabase
 */
export function getOptimizedImageUrlWithCdn(
  supabaseUrl: string,
  size: ImageSize = 'medium'
): string {
  if (!shouldUseCdn(supabaseUrl, size)) {
    return supabaseUrl;
  }

  return getVercelImageUrl(supabaseUrl, size);
}

/**
 * Pré-carregar imagem otimizada
 */
export function preloadImageViaCdn(url: string, size: ImageSize = 'thumbnail') {
  if (typeof window === 'undefined') return;

  const optimizedUrl = getOptimizedImageUrlWithCdn(url, size);
  
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = optimizedUrl;
  document.head.appendChild(link);
}

/**
 * Estatísticas de economia de bandwidth
 */
export function estimateBandwidthSavings(
  imagesPerDay: number,
  avgImageSize: number // em KB
): {
  withoutCdn: number; // GB/mês
  withCdn: number; // GB/mês
  savings: number; // GB/mês
  savingsPercent: number;
} {
  const daysPerMonth = 30;
  const totalRequests = imagesPerDay * daysPerMonth;
  
  // Sem CDN: todas requisições vão para Supabase
  const withoutCdnMB = (totalRequests * avgImageSize) / 1024;
  const withoutCdnGB = withoutCdnMB / 1024;
  
  // Com CDN: apenas ~10% vão para Supabase (90% cache hit rate)
  const cacheHitRate = 0.9;
  const withCdnGB = withoutCdnGB * (1 - cacheHitRate);
  
  const savingsGB = withoutCdnGB - withCdnGB;
  const savingsPercent = (savingsGB / withoutCdnGB) * 100;
  
  return {
    withoutCdn: parseFloat(withoutCdnGB.toFixed(2)),
    withCdn: parseFloat(withCdnGB.toFixed(2)),
    savings: parseFloat(savingsGB.toFixed(2)),
    savingsPercent: parseFloat(savingsPercent.toFixed(1))
  };
}

/**
 * Exemplo de uso:
 * 
 * // Em componentes
 * import { getOptimizedImageUrlWithCdn } from '@/lib/vercelImageCdn';
 * 
 * const imageUrl = getOptimizedImageUrlWithCdn(photo.watermarked_url, 'thumbnail');
 * 
 * <img src={imageUrl} alt={photo.title} />
 */
