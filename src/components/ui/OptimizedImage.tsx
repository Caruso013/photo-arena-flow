/**
 * OptimizedImage Component v4
 * Componente otimizado para iOS/Safari com carregamento rápido
 */

import React, { useState, useRef, useCallback, memo, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { shouldEagerLoad, ImageSize } from '@/lib/imageOptimization';

interface OptimizedImageProps {
  src: string;
  alt: string;
  size?: ImageSize;
  className?: string;
  index?: number;
  onClick?: () => void;
  onLoad?: () => void;
}

/**
 * OptimizedImage - Carregamento otimizado para todos dispositivos incluindo iOS
 * - Usa IntersectionObserver nativo para lazy loading
 * - Fallback robusto para erros de rede
 * - Compatível com Safari/iOS
 */
export const OptimizedImage = memo(({
  src,
  alt,
  size = 'medium',
  className = '',
  index = 0,
  onClick,
  onLoad
}: OptimizedImageProps) => {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [isVisible, setIsVisible] = useState(shouldEagerLoad(index));
  const [retryCount, setRetryCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // URL direta do Supabase sem CDN (mais confiável no iOS)
  const imageUrl = src;

  // Intersection Observer para lazy loading
  useEffect(() => {
    if (isVisible || !containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '200px', // Carrega antes de entrar na viewport
        threshold: 0.01
      }
    );

    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, [isVisible]);

  // Timeout para retry automático
  useEffect(() => {
    if (status === 'loading' && isVisible && retryCount < 2) {
      const timeout = setTimeout(() => {
        if (status === 'loading') {
          // Força reload da imagem
          setRetryCount(prev => prev + 1);
        }
      }, 8000); // 8 segundos timeout

      return () => clearTimeout(timeout);
    }
  }, [status, isVisible, retryCount]);

  const handleLoad = useCallback(() => {
    setStatus('loaded');
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    if (retryCount < 2) {
      // Tentar novamente
      setRetryCount(prev => prev + 1);
      setStatus('loading');
    } else {
      setStatus('error');
    }
  }, [retryCount]);

  if (status === 'error') {
    return (
      <div 
        ref={containerRef}
        className={`flex items-center justify-center bg-muted ${className}`}
        onClick={onClick}
      >
        <div className="text-center p-4">
          <p className="text-xs text-muted-foreground">Erro ao carregar</p>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setRetryCount(0);
              setStatus('loading');
            }}
            className="text-xs text-primary underline mt-1"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      onClick={onClick}
    >
      {/* Skeleton placeholder */}
      {status === 'loading' && (
        <Skeleton className="absolute inset-0" />
      )}

      {/* Imagem - só renderiza quando visível */}
      {isVisible && (
        <img
          ref={imgRef}
          key={`${src}-${retryCount}`} // Force remount on retry
          src={imageUrl}
          alt={alt}
          loading={shouldEagerLoad(index) ? 'eager' : 'lazy'}
          decoding="async"
          crossOrigin="anonymous"
          onLoad={handleLoad}
          onError={handleError}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            status === 'loaded' ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ 
            WebkitBackfaceVisibility: 'hidden',
            backfaceVisibility: 'hidden'
          }}
        />
      )}
    </div>
  );
});

OptimizedImage.displayName = 'OptimizedImage';
