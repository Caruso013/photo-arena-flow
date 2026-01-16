/**
 * Configurações do Google AdSense
 * 
 * COMO CONFIGURAR:
 * 
 * 1. Acesse https://www.google.com/adsense
 * 2. Faça login com sua conta Google
 * 3. Adicione seu site (stafotos.com) para aprovação
 * 4. Após aprovação, vá em "Anúncios" > "Por unidade de anúncio"
 * 5. Crie os blocos de anúncio:
 *    - Um bloco "Display" 160x600 para laterais
 *    - Um bloco "Display" 728x90 para banners horizontais
 *    - Um bloco "Display" 300x250 para retângulos
 * 6. Copie o ID do cliente (ca-pub-XXXXXXXXXXXXXXXX) e os data-ad-slot
 * 7. Atualize os valores abaixo
 */

export const ADSENSE_CONFIG = {
  // ID do cliente AdSense (encontrado no seu painel do AdSense)
  // Formato: ca-pub-XXXXXXXXXXXXXXXX
  CLIENT_ID: 'ca-pub-1760599892722948',
  
  // Slots de anúncios (cada bloco de anúncio tem um ID único)
  SLOTS: {
    // Anúncio lateral esquerdo (160x600 - Wide Skyscraper)
    SIDEBAR_LEFT: '1235799194',
    
    // Anúncio lateral direito (160x600 - Wide Skyscraper)
    SIDEBAR_RIGHT: '1235799194',
    
    // Banner horizontal (728x90 - Leaderboard)
    LEADERBOARD: '4895024364',
    
    // Retângulo médio (300x250 - Medium Rectangle)
    RECTANGLE: '4895024364',
    
    // Banner responsivo (auto)
    RESPONSIVE: '4895024364',
  },
  
  // Páginas onde os anúncios NÃO devem aparecer
  EXCLUDED_PAGES: [
    '/',
    '/home',
    '/checkout',
    '/checkout-success',
    '/checkout-failure',
    '/checkout-processing',
  ],
};

/**
 * Verifica se a página atual deve exibir anúncios
 */
export const shouldShowAdsOnPage = (pathname: string): boolean => {
  return !ADSENSE_CONFIG.EXCLUDED_PAGES.includes(pathname);
};
