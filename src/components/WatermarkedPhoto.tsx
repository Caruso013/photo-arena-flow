import React, { useRef, useEffect, useState } from 'react';

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
  
  // PROTEÇÃO: Controle de carregamento - foto só aparece quando marca d'água está pronta
  const [watermarkLoaded, setWatermarkLoaded] = useState(false);
  const [photoLoaded, setPhotoLoaded] = useState(false);
  
  // A foto só fica visível quando AMBAS as imagens estão carregadas
  const isReady = watermarkLoaded && photoLoaded;

  const watermarkPositionClass =
    position === 'center'
      ? 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32'
      : position === 'corner'
      ? 'right-2 bottom-2 w-16 h-16'
      : 'inset-0 w-full h-full'; // position === 'full'

  // Pré-carregar a marca d'água ANTES de mostrar qualquer coisa
  useEffect(() => {
    if (isPurchased) {
      setWatermarkLoaded(true);
      return;
    }
    
    // Reset quando src muda
    setWatermarkLoaded(false);
    setPhotoLoaded(false);
    
    const watermark = new Image();
    watermark.onload = () => {
      setWatermarkLoaded(true);
    };
    watermark.onerror = () => {
      // Se a marca d'água falhar, carregar de qualquer jeito (melhor que não mostrar nada)
      console.error('Erro ao carregar marca d\'água');
      setWatermarkLoaded(true);
    };
    watermark.src = watermarkSrc;
    
    // Cleanup
    return () => {
      watermark.onload = null;
      watermark.onerror = null;
    };
  }, [watermarkSrc, isPurchased, src]);

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
  // PROTEÇÃO: A foto só fica visível quando a marca d'água já carregou
  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full select-none bg-muted"
      style={{
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        userSelect: 'none'
      }}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      {/* Skeleton/placeholder enquanto carrega */}
      {!isReady && (
        <div className="absolute inset-0 bg-muted animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" />
        </div>
      )}
      
      {/* A foto só aparece quando a marca d'água está carregada */}
      <img 
        src={src} 
        alt={alt} 
        className={imgClassName}
        loading={loading}
        decoding="async"
        crossOrigin="anonymous"
        draggable={false}
        onLoad={() => setPhotoLoaded(true)}
        style={{
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
          userSelect: 'none',
          pointerEvents: 'none',
          // PROTEÇÃO: Foto invisível até marca d'água carregar
          opacity: isReady ? 1 : 0,
          transition: 'opacity 0.2s ease-in-out'
        }}
      />

      {/* watermark overlay in front - FORTE para fotos não compradas */}
      {/* Só renderiza após a marca d'água estar pré-carregada */}
      {watermarkLoaded && (
        <img
          src={watermarkSrc}
          alt="Marca d'água"
          className={`pointer-events-none absolute z-10 ${watermarkPositionClass} ${watermarkClassName}`}
          style={{ 
            opacity: isReady ? opacity : 0,
            objectFit: position === 'full' ? 'cover' : 'contain',
            WebkitUserSelect: 'none',
            WebkitTouchCallout: 'none',
            userSelect: 'none',
            transition: 'opacity 0.2s ease-in-out'
          }}
          loading="eager"
          decoding="async"
          aria-hidden
          crossOrigin="anonymous"
          draggable={false}
        />
      )}

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
