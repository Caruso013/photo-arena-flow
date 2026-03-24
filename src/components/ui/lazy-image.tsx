import { useState, useEffect, useRef, memo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { getOptimizedImageUrlWithCdn } from '@/lib/vercelImageCdn';
import { ImageSize } from '@/lib/imageOptimization';
import { Skeleton } from './skeleton';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallback?: React.ReactNode;
  size?: ImageSize;
}

/**
 * LazyImage - Carregamento lazy otimizado
 * Usa IntersectionObserver para carregar imagens apenas quando visíveis
 * Fallback automático para URL original se CDN falhar
 */
export const LazyImage = memo(({ 
  src, 
  alt, 
  className, 
  fallback, 
  size = 'thumbnail', 
  ...props 
}: LazyImageProps) => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  const [useFallbackUrl, setUseFallbackUrl] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Otimizar URL via CDN (ou usar original como fallback)
  const optimizedSrc = useFallbackUrl ? src : getOptimizedImageUrlWithCdn(src, size);

  useEffect(() => {
    if (!containerRef.current || !src) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStatus('loading');
          observer.disconnect();
        }
      },
      { rootMargin: '100px', threshold: 0.01 }
    );

    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, [src]);

  const handleLoad = useCallback(() => {
    setStatus('loaded');
  }, []);

  const handleError = useCallback(() => {
    // Se CDN falhou, tentar URL original do Supabase
    if (!useFallbackUrl && src) {
      console.warn('LazyImage: CDN failed, falling back to original URL');
      setUseFallbackUrl(true);
      setStatus('loading');
      return;
    }
    setStatus('error');
  }, [useFallbackUrl, src]);

  return (
    <div className="relative w-full h-full" ref={containerRef}>
      {/* Skeleton placeholder */}
      {status !== 'loaded' && status !== 'error' && (
        <Skeleton className="absolute inset-0" />
      )}
      
      {/* Imagem */}
      {(status === 'loading' || status === 'loaded') && src && (
        <img
          src={optimizedSrc}
          alt={alt}
          loading="lazy"
          decoding="async"
          className={cn(
            'transition-opacity duration-300',
            status === 'loaded' ? 'opacity-100' : 'opacity-0',
            className
          )}
          onLoad={handleLoad}
          onError={handleError}
          {...props}
        />
      )}
      
      {/* Error fallback */}
      {status === 'error' && (
        fallback || (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <span className="text-xs text-muted-foreground">Erro</span>
          </div>
        )
      )}
    </div>
  );
});
LazyImage.displayName = 'LazyImage';
