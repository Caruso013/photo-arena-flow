import React, { useRef, useEffect } from 'react';

interface WatermarkedPhotoProps {
  src: string;
  alt?: string;
  watermarkSrc?: string;
  imgClassName?: string;
  watermarkClassName?: string;
  position?: 'center' | 'corner' | 'full';
  opacity?: number;
  loading?: 'lazy' | 'eager';
  onDownload?: () => void;
  isPurchased?: boolean; // Se true, mostra foto original sem marca d'água
}

const WatermarkedPhoto: React.FC<WatermarkedPhotoProps> = ({
  src,
  alt = '',
  watermarkSrc = '/watermark_front.png',
  imgClassName = 'w-full h-full object-cover',
  watermarkClassName = '',
  position = 'full',
  opacity = 0.85,
  loading = 'lazy',
  onDownload,
  isPurchased = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<number | null>(null);

  const watermarkPositionClass =
    position === 'center'
      ? 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32'
      : position === 'corner'
      ? 'right-2 bottom-2 w-16 h-16'
      : 'inset-0 w-full h-full'; // position === 'full'

  // Proteção contra 3D Touch e long press no iOS
  useEffect(() => {
    const container = containerRef.current;
    if (!container || isPurchased) return;

    const preventLongPress = (e: TouchEvent) => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
      e.preventDefault();
      return false;
    };

    const handleTouchStart = (e: TouchEvent) => {
      longPressTimer.current = window.setTimeout(() => {
        e.preventDefault();
      }, 500);
    };

    const handleTouchEnd = () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    };

    const handleTouchMove = () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('contextmenu', preventLongPress, { passive: false });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('contextmenu', preventLongPress);
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, [isPurchased]);

  // Download para Safari/iOS usando fetch + blob
  const handleDownload = async () => {
    if (onDownload) {
      onDownload();
      return;
    }

    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = alt || 'foto.jpg';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao baixar imagem:', error);
    }
  };

  // Se a foto foi comprada, mostra apenas a imagem original sem marca d'água
  if (isPurchased) {
    return (
      <div ref={containerRef} className="relative w-full h-full">
        <img 
          src={src} 
          alt={alt} 
          className={imgClassName}
          loading={loading}
          decoding="async"
          crossOrigin="anonymous"
        />
      </div>
    );
  }

  // Fotos não compradas: marca d'água forte e visível
  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full select-none"
      style={{
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        userSelect: 'none'
      }}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      <img 
        src={src} 
        alt={alt} 
        className={imgClassName}
        loading={loading}
        decoding="async"
        crossOrigin="anonymous"
        draggable={false}
        style={{
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
          userSelect: 'none',
          pointerEvents: 'none'
        }}
      />

      {/* watermark overlay in front - FORTE para fotos não compradas */}
      <img
        src={watermarkSrc}
        alt="Marca d'água"
        className={`pointer-events-none absolute z-10 ${watermarkPositionClass} ${watermarkClassName}`}
        style={{ 
          opacity,
          objectFit: position === 'full' ? 'cover' : 'contain',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
          userSelect: 'none'
        }}
        loading={loading}
        decoding="async"
        aria-hidden
        crossOrigin="anonymous"
        draggable={false}
      />

      {/* Overlay transparente para bloquear acesso direto à imagem no iOS */}
      <div 
        className="absolute inset-0 z-20"
        style={{
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
          userSelect: 'none',
          backgroundColor: 'transparent'
        }}
      />
    </div>
  );
};

export default WatermarkedPhoto;
