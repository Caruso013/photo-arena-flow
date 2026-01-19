/**
 * OptimizedImage Component v3
 * Componente otimizado com carregamento rápido e fallback robusto
 */

import React, { useState, useRef, useCallback, memo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { shouldEagerLoad, ImageSize } from '@/lib/imageOptimization';
import { getOptimizedImageUrlWithCdn } from '@/lib/vercelImageCdn';

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
 * OptimizedImage - Carregamento rápido de imagens com fallback
 * - Usa IntersectionObserver nativo para lazy loading
 * - Carrega diretamente a imagem final (sem cascata blur→thumb→final)
 * - Fallback robusto para erros de rede
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
  const containerRef = useRef<HTMLDivElement>(null);
  const imageUrl = getOptimizedImageUrlWithCdn(src, size);

  // Intersection Observer para lazy loading
  const observerCallback = useCallback((entries: IntersectionObserverEntry[]) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
      }
    });
  }, []);

  // Setup observer
  React.useEffect(() => {
    if (isVisible || !containerRef.current) return;

    const observer = new IntersectionObserver(observerCallback, {
      rootMargin: '100px',
      threshold: 0.01
    });

    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, [isVisible, observerCallback]);

  const handleLoad = useCallback(() => {
    setStatus('loaded');
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setStatus('error');
  }, []);

  if (status === 'error') {
    return (
      <div 
        ref={containerRef}
        className={`flex items-center justify-center bg-muted ${className}`}
        onClick={onClick}
      >
        <div className="text-center p-4">
          <p className="text-xs text-muted-foreground">Erro ao carregar</p>
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
          src={imageUrl}
          alt={alt}
          loading={shouldEagerLoad(index) ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            status === 'loaded' ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </div>
  );
});

OptimizedImage.displayName = 'OptimizedImage';
