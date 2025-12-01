import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { getOptimizedImageUrlWithCdn } from '@/lib/vercelImageCdn';
import { ImageSize } from '@/lib/imageOptimization';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallback?: React.ReactNode;
  size?: ImageSize; // Tamanho da imagem para otimização
}

export const LazyImage = ({ src, alt, className, fallback, size = 'thumbnail', ...props }: LazyImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Otimizar URL via Vercel CDN
  const optimizedSrc = getOptimizedImageUrlWithCdn(src, size);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '50px' }
    );

    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  return (
    <div className="relative w-full h-full" ref={containerRef}>
      {!isLoaded && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
      {isInView && (
        <img
          src={optimizedSrc}
          alt={alt}
          loading="lazy"
          className={cn(
            'transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0',
            className
          )}
          onLoad={() => setIsLoaded(true)}
          {...props}
        />
      )}
      {!isLoaded && fallback}
    </div>
  );
};
