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
  tiny:      { width: 40,   quality: 20, format: 'webp' },   // ~1-2KB - blur placeholder
  thumbnail: { width: 300,  quality: 50, format: 'webp' },   // ~10-20KB - grid de fotos
  medium:    { width: 600,  quality: 65, format: 'webp' },   // ~30-60KB - visualização modal
  large:     { width: 1200, quality: 75, format: 'webp' },   // ~80-150KB - zoom/detalhe
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

  try {
    // Verificar se é URL do Supabase Storage
    if (!originalUrl.includes('supabase.co/storage/v1/object/')) {
      return originalUrl;
    }

    // Converter /object/ para /render/image/
    let transformedUrl = originalUrl.replace(
      '/storage/v1/object/',
      '/storage/v1/render/image/'
    );

    // Adicionar parâmetros de transformação
    const separator = transformedUrl.includes('?') ? '&' : '?';
    const params = new URLSearchParams({
      width: config.width.toString(),
      quality: config.quality.toString(),
    });

    if (config.format) {
      params.set('format', config.format);
    }

    // Resize mode: cover mantém proporção e corta
    params.set('resize', 'contain');

    return `${transformedUrl}${separator}${params.toString()}`;
  } catch {
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
