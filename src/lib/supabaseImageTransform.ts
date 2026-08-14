/**
 * Estratégia de imagens do app.
 *
 * IMPORTANTE: o app NÃO usa mais o endpoint de transformação do Supabase
 * (/storage/v1/render/image/...). Cada imagem-origem transformada nesse endpoint
 * é cobrada como "Storage Image Transformations" e, por o bucket
 * `photos-watermarked` ser público, qualquer requisição externa também gerava
 * cobrança. Isso causou faturas altas e foi desativado.
 *
 * Agora as versões de exibição já são geradas pequenas e com a marca d'água
 * embutida no momento do upload (ver [[watermarkImage]] e backgroundUploadService),
 * então servimos a URL direta do Storage — sem transformação, sem custo extra.
 *
 * Estas funções são mantidas para compatibilidade com os pontos de uso
 * existentes, mas apenas retornam a URL original.
 */

export type TransformSize = 'tiny' | 'thumbnail' | 'medium' | 'large' | 'original';

/**
 * Retorna a URL da imagem para exibição.
 * (Antes convertia para o endpoint /render/image/; hoje serve a URL direta.)
 */
export function getTransformedImageUrl(
  originalUrl: string,
  _size: TransformSize = 'medium',
): string {
  return originalUrl || '';
}

/**
 * Compat: mantém assinatura antiga com cache-busting opcional.
 */
export function getTransformedImageUrlWithCache(
  originalUrl: string,
  size: TransformSize = 'medium',
  cacheVersion: number = 1,
): string {
  const url = getTransformedImageUrl(originalUrl, size);
  if (!url || cacheVersion === 1) return url;

  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}v=${cacheVersion}`;
}

/**
 * Estimativa de economia de bandwidth (mantida para dashboards).
 * Foto original média: 2-5MB
 * Versão de exibição (resize + watermark embutida): ~100-250KB
 */
export function estimateEgressSavings(
  photosPerDay: number,
  viewsPerPhoto: number = 5,
  avgOriginalSizeKB: number = 3000,
): {
  withoutTransform: string;
  withTransform: string;
  savingsPercent: number;
} {
  const totalViewsPerMonth = photosPerDay * viewsPerPhoto * 30;

  const withoutGB = (totalViewsPerMonth * avgOriginalSizeKB) / 1024 / 1024;

  const avgDisplayKB = 150; // versão de exibição gerada no upload
  const withGB = (totalViewsPerMonth * avgDisplayKB) / 1024 / 1024;

  const savings = ((withoutGB - withGB) / withoutGB) * 100;

  return {
    withoutTransform: `${withoutGB.toFixed(1)} GB/mês`,
    withTransform: `${withGB.toFixed(1)} GB/mês`,
    savingsPercent: Math.round(savings),
  };
}
