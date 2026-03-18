/**
 * Supabase Storage Image Transformations
 * Usa o endpoint /render/image/ do Supabase Pro para servir imagens otimizadas
 * Reduz Cached Egress em ~70-80%
 * 
 * Documentação: https://supabase.com/docs/guides/storage/serving/image-transformations
 */

export type TransformSize = 'tiny' | 'thumbnail' | 'medium' | 'large' | 'original';

interface TransformConfig {
  width: number;
  quality: number;
  format?: 'webp' | 'avif';
}

// Configurações otimizadas para cada contexto
const TRANSFORM_CONFIGS: Record<TransformSize, TransformConfig | null> = {
  tiny:      { width: 40,   quality: 15, format: 'webp' },   // ~0.5-1KB - blur placeholder
  thumbnail: { width: 250,  quality: 40, format: 'webp' },   // ~5-12KB - grid de fotos
  medium:    { width: 500,  quality: 55, format: 'webp' },   // ~20-40KB - visualização modal
  large:     { width: 900,  quality: 65, format: 'webp' },   // ~50-100KB - zoom/detalhe
  original:  null,                                             // Sem transformação (compra)
};

/**
 * Converte URL do Supabase Storage para usar transformações de imagem
 * 
 * Input:  https://xxx.supabase.co/storage/v1/object/public/bucket/path/file.jpg
 * Output: https://xxx.supabase.co/storage/v1/render/image/public/bucket/path/file.jpg?width=300&quality=50&format=webp
 */
export function getTransformedImageUrl(
  originalUrl: string,
  size: TransformSize = 'medium'
): string {
  if (!originalUrl || size === 'original') return originalUrl;

  const config = TRANSFORM_CONFIGS[size];
  if (!config) return originalUrl;

  // Apenas URLs do Supabase Storage
  if (!originalUrl.includes('supabase.co/storage/v1/object/')) {
    return originalUrl;
  }

  try {
    // Converter /object/public/ para /render/image/public/
    const transformed = originalUrl.replace(
      '/storage/v1/object/public/',
      '/storage/v1/render/image/public/'
    );

    const url = new URL(transformed);
    url.searchParams.set('width', config.width.toString());
    url.searchParams.set('quality', config.quality.toString());
    if (config.format) {
      url.searchParams.set('format', config.format);
    }

    return url.toString();
  } catch (error) {
    console.error('Error generating transformed URL:', error);
    return originalUrl;
  }
}

/**
 * Gera URL com cache-busting para forçar refresh quando necessário
 */
export function getTransformedImageUrlWithCache(
  originalUrl: string,
  size: TransformSize = 'medium',
  cacheVersion: number = 1
): string {
  const url = getTransformedImageUrl(originalUrl, size);
  if (url === originalUrl) return url;

  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}v=${cacheVersion}`;
}

/**
 * Estimativa de economia de bandwidth
 * Foto original média: 2-5MB
 * Com transformação thumbnail: 10-20KB (99% redução)
 * Com transformação medium: 30-60KB (98% redução)
 */
export function estimateEgressSavings(
  photosPerDay: number,
  viewsPerPhoto: number = 5,
  avgOriginalSizeKB: number = 3000
): {
  withoutTransform: string;
  withTransform: string;
  savingsPercent: number;
} {
  const totalViewsPerMonth = photosPerDay * viewsPerPhoto * 30;
  
  // Sem transformação: cada view baixa a foto original
  const withoutGB = (totalViewsPerMonth * avgOriginalSizeKB) / 1024 / 1024;
  
  // Com transformação: thumbnail ~15KB, medium ~45KB
  const avgTransformedKB = 30; // média ponderada
  const withGB = (totalViewsPerMonth * avgTransformedKB) / 1024 / 1024;
  
  const savings = ((withoutGB - withGB) / withoutGB) * 100;
  
  return {
    withoutTransform: `${withoutGB.toFixed(1)} GB/mês`,
    withTransform: `${withGB.toFixed(1)} GB/mês`,
    savingsPercent: Math.round(savings),
  };
}
