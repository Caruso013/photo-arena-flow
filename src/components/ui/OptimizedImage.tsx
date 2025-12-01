/**
 * OptimizedImage Component v2
 * Componente avançado com blur-up, lazy loading e cache
 */

import React, { useState, useEffect, useRef } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  createLazyLoadObserver,
  shouldEagerLoad,
  ImageSize
} from '@/lib/imageOptimization';
import { getOptimizedImageUrlWithCdn } from '@/lib/vercelImageCdn';

interface OptimizedImageProps {
  src: string;
  alt: string;
  size?: ImageSize;
  className?: string;
  index?: number; // Posição na lista (para eager loading)
  onClick?: () => void;
  onLoad?: () => void;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  size = 'medium',
  className = '',
  index = 0,
  onClick,
  onLoad
}) => {
  const [currentSrc, setCurrentSrc] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const [shouldLoad, setShouldLoad] = useState(shouldEagerLoad(index));

  // URLs em cascata via Vercel CDN: blur → thumbnail → imagem solicitada
  const blurUrl = getOptimizedImageUrlWithCdn(src, 'blur');
  const thumbnailUrl = getOptimizedImageUrlWithCdn(src, 'thumbnail');
  const targetUrl = getOptimizedImageUrlWithCdn(src, size);

  // Configurar lazy loading com Intersection Observer
  useEffect(() => {
    if (shouldLoad || !imgRef.current) return;

    const observer = createLazyLoadObserver((entry) => {
      if (entry.isIntersecting) {
        setShouldLoad(true);
        observer.unobserve(entry.target);
      }
    });

    observer.observe(imgRef.current);

    return () => observer.disconnect();
  }, [shouldLoad]);

  // Carregamento em cascata: blur → thumbnail → target
  useEffect(() => {
    if (!shouldLoad) return;

    let isMounted = true;

    const loadSequence = async () => {
      try {
        // 1. Mostrar blur imediatamente
        setCurrentSrc(blurUrl);

        // 2. Pré-carregar thumbnail
        const thumbnailImg = new Image();
        thumbnailImg.src = thumbnailUrl;
        await thumbnailImg.decode();

        if (isMounted) {
          setCurrentSrc(thumbnailUrl);
        }

        // 3. Carregar imagem final
        const finalImg = new Image();
        finalImg.src = targetUrl;
        await finalImg.decode();

        if (isMounted) {
          setCurrentSrc(targetUrl);
          setIsLoading(false);
          onLoad?.();
        }
      } catch (error) {
        console.error('Error loading image:', error);
        if (isMounted) {
          setHasError(true);
          setIsLoading(false);
        }
      }
    };

    loadSequence();

    return () => {
      isMounted = false;
    };
  }, [shouldLoad, blurUrl, thumbnailUrl, targetUrl, onLoad]);

  if (hasError) {
    return (
      <div className={`flex items-center justify-center bg-muted ${className}`}>
        <div className="text-center p-4">
          <p className="text-sm text-muted-foreground">Erro ao carregar imagem</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Skeleton enquanto não começar a carregar */}
      {!shouldLoad && <Skeleton className="absolute inset-0" />}

      {/* Imagem com blur-up progressivo */}
      {shouldLoad && (
        <img
          ref={imgRef}
          src={currentSrc}
          alt={alt}
          loading={shouldEagerLoad(index) ? 'eager' : 'lazy'}
          decoding="async"
          onClick={onClick}
          className={`w-full h-full object-cover transition-all duration-500 ${
            currentSrc === blurUrl ? 'blur-lg scale-110' : 
            currentSrc === thumbnailUrl ? 'blur-sm' : 
            'blur-0'
          } ${
            isLoading ? 'opacity-70' : 'opacity-100'
          }`}
          style={{
            willChange: isLoading ? 'filter, opacity' : 'auto'
          }}
        />
      )}

      {/* Indicador de loading */}
      {isLoading && shouldLoad && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/5">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};

/**
 * Exemplo de uso:
 * 
 * // Em uma galeria de fotos
 * {photos.map((photo, index) => (
 *   <OptimizedImage
 *     key={photo.id}
 *     src={photo.watermarked_url}
 *     alt={photo.title}
 *     size="thumbnail"
 *     index={index}
 *     className="aspect-square rounded-lg"
 *     onClick={() => openModal(photo)}
 *   />
 * ))}
 * 
 * // Modal com imagem grande
 * <OptimizedImage
 *   src={selectedPhoto.watermarked_url}
 *   alt={selectedPhoto.title}
 *   size="large"
 *   className="max-w-4xl mx-auto"
 * />
 */
