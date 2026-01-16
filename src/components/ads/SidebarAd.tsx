import GoogleAdSense from './GoogleAdSense';
import { ADSENSE_CONFIG } from '@/config/adsense.config';

interface SidebarAdProps {
  position: 'left' | 'right';
}

/**
 * Componente de anúncio para as laterais do site
 * Só aparece em telas grandes (desktop)
 */
const SidebarAd = ({ position }: SidebarAdProps) => {
  const adSlot = position === 'left' 
    ? ADSENSE_CONFIG.SLOTS.SIDEBAR_LEFT 
    : ADSENSE_CONFIG.SLOTS.SIDEBAR_RIGHT;

  return (
    <aside
      className={`
        hidden xl:block 
        fixed top-24 
        ${position === 'left' ? 'left-4' : 'right-4'}
        w-[160px] 
        z-40
        space-y-4
      `}
    >
      {/* Anúncio vertical 160x600 (Wide Skyscraper) */}
      <GoogleAdSense
        adSlot={adSlot}
        adFormat="vertical"
        style={{
          width: '160px',
          height: '600px',
        }}
        className="bg-muted/20 rounded-lg overflow-hidden"
      />
    </aside>
  );
};

export default SidebarAd;
