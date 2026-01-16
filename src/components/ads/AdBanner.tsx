import GoogleAdSense from './GoogleAdSense';
import { ADSENSE_CONFIG } from '@/config/adsense.config';

interface AdBannerProps {
  type?: 'horizontal' | 'rectangle' | 'leaderboard';
  className?: string;
}

/**
 * Componente de banner de anúncio para áreas de conteúdo
 * Pode ser usado em diferentes formatos
 */
const AdBanner = ({ type = 'horizontal', className = '' }: AdBannerProps) => {
  const getAdSlot = () => {
    switch (type) {
      case 'leaderboard':
        return ADSENSE_CONFIG.SLOTS.LEADERBOARD;
      case 'rectangle':
        return ADSENSE_CONFIG.SLOTS.RECTANGLE;
      default:
        return ADSENSE_CONFIG.SLOTS.RESPONSIVE;
    }
  };

  const getStyles = () => {
    switch (type) {
      case 'leaderboard':
        // 728x90 - Leaderboard
        return { width: '100%', maxWidth: '728px', height: '90px' };
      case 'rectangle':
        // 300x250 - Medium Rectangle
        return { width: '300px', height: '250px' };
      case 'horizontal':
      default:
        // Responsivo horizontal
        return { width: '100%', height: '90px' };
    }
  };

  return (
    <div className={`flex justify-center my-4 ${className}`}>
      <GoogleAdSense
        adSlot={getAdSlot()}
        adFormat={type === 'rectangle' ? 'rectangle' : 'horizontal'}
        style={getStyles()}
        className="bg-muted/10 rounded-lg overflow-hidden"
      />
    </div>
  );
};

export default AdBanner;
