/**
 * OptimizedImage Component v5
 * Usa Supabase Storage Image Transformations para reduzir egress
 */

import React, { useState, useRef, useCallback, memo, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { shouldEagerLoad, ImageSize } from '@/lib/imageOptimization';
import { getTransformedImageUrl, TransformSize } from '@/lib/supabaseImageTransform';

interface OptimizedImageProps {
  src: string;
  alt: string;
  size?: ImageSize;
  transformSize?: TransformSize;
  className?: string;
  index?: number;
  onClick?: () => void;
  onLoad?: () => void;
}

/**
 * OptimizedImage - Carregamento otimizado com Supabase Image Transformations
 * - Serve imagens menores via /render/image/ endpoint
 * - Lazy loading via IntersectionObserver
 * - Retry automático em caso de erro
 */
export const OptimizedImage = memo(({
  src,
  alt,
  size = 'medium',
  transformSize,
  className = '',
  index = 0,
  onClick,
  onLoad
}: OptimizedImageProps) => {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [isVisible, setIsVisible] = useState(shouldEagerLoad(index, 4)); // Reduzido de 8 para 4
  const [retryCount, setRetryCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Mapear ImageSize para TransformSize se não especificado
  const effectiveTransformSize: TransformSize = transformSize || (
    size === 'blur' ? 'tiny' :
    size === 'thumbnail' ? 'thumbnail' :
    size === 'medium' ? 'medium' :
    size === 'large' ? 'large' : 'original'
  );

  // URL otimizada via Supabase Image Transformations
  const imageUrl = getTransformedImageUrl(src, effectiveTransformSize);

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
        rootMargin: '150px',
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
          setRetryCount(prev => prev + 1);
        }
      }, 10000);
      return () => clearTimeout(timeout);
    }
  }, [status, isVisible, retryCount]);

  const handleLoad = useCallback(() => {
    setStatus('loaded');
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    if (retryCount < 2) {
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
      {status === 'loading' && (
        <Skeleton className="absolute inset-0" />
      )}

      {isVisible && (
        <img
          ref={imgRef}
          key={`${src}-${retryCount}`}
          src={imageUrl}
          alt={alt}
          loading={shouldEagerLoad(index, 4) ? 'eager' : 'lazy'}
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
