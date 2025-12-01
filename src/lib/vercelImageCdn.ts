/**
 * Vercel Image Optimization CDN
 * Usa o CDN da Vercel para servir imagens do Supabase
 * Reduz Cached Egress em ~80-90%
 */

import { ImageSize, IMAGE_SIZE_CONFIG } from './imageOptimization';

// Vercel Image Optimization limits
const VERCEL_IMAGE_LIMITS = {
  maxWidth: 3840,
  maxHeight: 2160,
  maxFileSize: 10485760, // 10MB
};

/**
 * Gera URL otimizada via Vercel Image Optimization
 * https://vercel.com/docs/image-optimization
 */
export function getVercelImageUrl(
  supabaseUrl: string,
  size: ImageSize = 'medium',
  quality: number | null = null
): string {
  // Se não for URL do Supabase, retornar original
  if (!supabaseUrl || !supabaseUrl.includes('supabase.co')) {
    return supabaseUrl;
  }

  const config = IMAGE_SIZE_CONFIG[size];
  if (!config && size !== 'original') {
    return supabaseUrl;
  }

  // Para 'original', retornar direto do Supabase (apenas compras)
  if (size === 'original') {
    return supabaseUrl;
  }

  try {
    // Vercel Image Optimization endpoint
    // Format: /_vercel/image?url=<encoded_url>&w=<width>&q=<quality>
    const encodedUrl = encodeURIComponent(supabaseUrl);
    const width = config!.width;
    const imageQuality = quality || config!.quality;

    // Construir URL otimizada
    const vercelImageUrl = `/_vercel/image?url=${encodedUrl}&w=${width}&q=${imageQuality}`;

    return vercelImageUrl;
  } catch (error) {
    console.error('Error generating Vercel CDN URL:', error);
    return supabaseUrl; // Fallback para Supabase direto
  }
}

/**
 * Determina se deve usar CDN ou Supabase direto
 */
export function shouldUseCdn(url: string, size: ImageSize): boolean {
  // Sempre usar CDN para thumbnails e medium (maior economia)
  if (size === 'thumbnail' || size === 'medium' || size === 'blur') {
    return true;
  }

  // Para large, usar CDN também (cache agressivo)
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
 * Pré-carregar imagem via CDN
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
