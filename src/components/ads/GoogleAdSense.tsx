import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { ADSENSE_CONFIG } from '@/config/adsense.config';

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

interface GoogleAdSenseProps {
  adSlot: string;
  adFormat?: 'auto' | 'fluid' | 'rectangle' | 'vertical' | 'horizontal';
  style?: React.CSSProperties;
  className?: string;
  responsive?: boolean;
}

/**
 * Componente para exibir anúncios do Google AdSense
 * 
 * Para configurar:
 * 1. Acesse https://www.google.com/adsense
 * 2. Adicione seu site e obtenha o código do cliente (ca-pub-XXXXXXX)
 * 3. Crie blocos de anúncios e obtenha os data-ad-slot
 * 4. Atualize os valores em src/config/adsense.config.ts
 */
const GoogleAdSense = ({ 
  adSlot, 
  adFormat = 'auto', 
  style,
  className = '',
  responsive = true 
}: GoogleAdSenseProps) => {
  const adRef = useRef<HTMLModElement>(null);
  const location = useLocation();

  useEffect(() => {
    try {
      // Inicializa o array de anúncios se não existir
      if (typeof window !== 'undefined') {
        window.adsbygoogle = window.adsbygoogle || [];
        window.adsbygoogle.push({});
      }
    } catch (error) {
      console.error('Erro ao carregar AdSense:', error);
    }
  }, [location.pathname]); // Recarrega quando muda de página

  return (
    <div className={`adsense-container ${className}`}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{
          display: 'block',
          minHeight: '100px',
          ...style,
        }}
        data-ad-client={ADSENSE_CONFIG.CLIENT_ID}
        data-ad-slot={adSlot}
        data-ad-format={adFormat}
        data-full-width-responsive={responsive ? 'true' : 'false'}
      />
    </div>
  );
};

export default GoogleAdSense;
