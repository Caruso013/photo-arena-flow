import React, { useRef, useEffect, useState, memo } from 'react';
import { getTransformedImageUrl, TransformSize } from '@/lib/supabaseImageTransform';

// Cache global da marca d'água - carrega UMA vez para todas as fotos
const watermarkCache: Record<string, boolean> = {};
function preloadWatermark(src: string): boolean {
  if (watermarkCache[src] === true) return true;
  if (watermarkCache[src] === undefined) {
    watermarkCache[src] = false;
    const img = new Image();
    img.onload = () => { watermarkCache[src] = true; };
    img.onerror = () => { watermarkCache[src] = true; };
    img.src = src;
  }
  return watermarkCache[src];
}

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
  isPurchased?: boolean;
  displaySize?: TransformSize;
}

const WatermarkedPhoto: React.FC<WatermarkedPhotoProps> = memo(({
  src,
  alt = '',
  watermarkSrc = '/watermark_front.png',
  imgClassName = 'w-full h-full object-contain',
  watermarkClassName = '',
  position = 'full',
  opacity = 0.85,
  loading = 'lazy',
  onDownload,
  isPurchased = false,
  displaySize = 'medium',
}) => {
  const [currentSrc, setCurrentSrc] = useState(() => isPurchased ? src : getTransformedImageUrl(src, displaySize));
  const containerRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<number | null>(null);
  
  // Watermark DEVE carregar ANTES da foto ficar visível
  const [watermarkReady, setWatermarkReady] = useState(false);
  const [photoLoaded, setPhotoLoaded] = useState(false);
  const [forceReveal, setForceReveal] = useState(false);
  // Foto só fica visível quando WATERMARK está pronta (não quando foto carrega)
  const canRevealPhoto = watermarkReady;

  // Failsafe: se demorar mais de 6s, libera a foto mesmo sem confirmação de load
  // (evita carregamento "infinito" quando o evento onLoad não dispara em iOS/Safari)
  useEffect(() => {
    if (canRevealPhoto) return;
    const timeout = setTimeout(() => setForceReveal(true), 6000);
    return () => clearTimeout(timeout);
  }, [canRevealPhoto, currentSrc]);

  const watermarkPositionClass =
    position === 'center'
      ? 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32'
      : position === 'corner'
      ? 'right-2 bottom-2 w-16 h-16'
      : 'inset-0 w-full h-full'; // position === 'full'

  // Carregamento eager e prioritário da watermark
  useEffect(() => {
    if (isPurchased) return;
    
    // Forçar carregamento eager da watermark
    const img = new Image();
    img.onload = () => {
      watermarkCache[watermarkSrc] = true;
      setWatermarkReady(true);
    };
    img.onerror = () => {
      // Mesmo com erro, marca como pronto para não travar
      watermarkCache[watermarkSrc] = true;
      setWatermarkReady(true);
    };
    img.src = watermarkSrc;

    // Checar se já está em cache
    if (preloadWatermark(watermarkSrc)) {
      setWatermarkReady(true);
    }
  }, [watermarkSrc, isPurchased]);

  // Reset photo loaded state when src changes
  useEffect(() => {
    setPhotoLoaded(false);
    setCurrentSrc(isPurchased ? src : getTransformedImageUrl(src, displaySize));
  }, [src, isPurchased, displaySize]);

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
      {/* Skeleton enquanto watermark não estiver pronta */}
      {!canRevealPhoto && (
        <div className="absolute inset-0 bg-muted animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" />
        </div>
      )}
      
      {/* Foto só aparece quando watermark está pronta */}
      <img 
        src={currentSrc} 
        alt={alt} 
        className={imgClassName}
        loading={loading}
        decoding="async"
        draggable={false}
        onLoad={() => setPhotoLoaded(true)}
        onError={() => {
          // Fallback para URL original se a otimizada falhar
          if (currentSrc !== src) {
            setCurrentSrc(src);
          } else {
            // Mesmo com erro, libera para não travar a UI
            setPhotoLoaded(true);
          }
        }}
        style={{
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
          userSelect: 'none',
          pointerEvents: 'none',
          opacity: canRevealPhoto ? 1 : 0,
          transition: 'opacity 0.1s ease-in-out'
        }}
      />

      {/* Watermark overlay - renderiza quando watermark está pronta */}
      {watermarkReady && (
        <img
          src={watermarkSrc}
          alt=""
          className={`pointer-events-none absolute z-10 ${watermarkPositionClass} ${watermarkClassName}`}
          style={{ 
            opacity: opacity,
            objectFit: position === 'full' ? 'cover' : 'contain',
            WebkitUserSelect: 'none',
            WebkitTouchCallout: 'none',
            userSelect: 'none',
            transition: 'opacity 0.1s ease-in-out'
          }}
          loading="eager"
          decoding="async"
          aria-hidden
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
});

WatermarkedPhoto.displayName = 'WatermarkedPhoto';

export default WatermarkedPhoto;
