export const BRAND_LOGO_PATH = '/lovable-uploads/6fdfc5d2-230c-4142-bf7c-3a326e5e45a8.png';

export const getBrandLogoUrl = (baseUrl?: string) => {
  const normalizedBaseUrl = baseUrl?.replace(/\/$/, '');

  if (normalizedBaseUrl) {
    return `${normalizedBaseUrl}${BRAND_LOGO_PATH}`;
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${BRAND_LOGO_PATH}`;
  }

  return `https://www.stafotos.com${BRAND_LOGO_PATH}`;
};