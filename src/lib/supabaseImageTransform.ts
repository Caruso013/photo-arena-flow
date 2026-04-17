/**
 * Supabase Storage Image Transformations
 * Usa o endpoint nativo /render/image/ do Supabase para servir imagens otimizadas.
 * Isso evita buscar o arquivo original por um proxy intermediário e reduz o volume
 * transferido em listagens, cards e previews.
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
  thumbnail: { width: 220,  quality: 38, format: 'webp' },   // ~5-12KB - grid de fotos
  medium:    { width: 480,  quality: 52, format: 'webp' },   // ~20-40KB - visualização modal
  large:     { width: 840,  quality: 60, format: 'webp' },   // ~50-100KB - zoom/detalhe
  original:  null,                                             // Sem transformação (compra)
};

const SUPABASE_STORAGE_OBJECT_RE = /\/storage\/v1\/object\/(public|sign)\/([^/]+)\/(.+)$/;

function buildSupabaseRenderUrl(originalUrl: string, config: TransformConfig): string | null {
  try {
    const url = new URL(originalUrl);

    if (!url.hostname.includes('supabase.co')) {
      return null;
    }

    const match = url.pathname.match(SUPABASE_STORAGE_OBJECT_RE);
    if (!match) {
      return null;
    }

    const [, accessType, bucket, objectPath] = match;
    const renderUrl = new URL(`${url.origin}/storage/v1/render/image/${accessType}/${bucket}/${objectPath}`);
    const params = new URLSearchParams(url.search);
    params.set('width', String(config.width));
    params.set('quality', String(config.quality));

    if (config.format) {
      params.set('format', config.format);
    }

    renderUrl.search = params.toString();
    return renderUrl.toString();
  } catch {
    return null;
  }
}

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
  if (!originalUrl) return '';

  const config = TRANSFORM_CONFIGS[size];
  if (!config) return originalUrl;

  // Only optimize Supabase storage URLs
  if (!originalUrl.includes('supabase.co')) {
    return originalUrl;
  }

  return buildSupabaseRenderUrl(originalUrl, config) || originalUrl;
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
