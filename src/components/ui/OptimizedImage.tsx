/**
 * OptimizedImage Component
 * Componente otimizado para carregar imagens do Supabase com:
 * - Transformação automática (WebP, resize, quality)
 * - Lazy loading
 * - Placeholder blur
 * - Loading state
 */

import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

interface OptimizedImageProps {
  src: string;
  alt: string;
  size?: 'thumbnail' | 'medium' | 'large' | 'original';
  className?: string;
  placeholderSrc?: string;
  onClick?: () => void;
}

const SIZE_CONFIG = {
  thumbnail: { width: 400, height: 300, quality: 80 },
  medium: { width: 800, height: 600, quality: 85 },
  large: { width: 1200, height: 900, quality: 90 },
  original: null // Sem transformação
};

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  size = 'medium',
  className = '',
  placeholderSrc,
  onClick
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Gerar URL otimizada
  const getOptimizedUrl = () => {
    if (size === 'original' || !src.includes('supabase')) {
      return src;
    }

    const config = SIZE_CONFIG[size];
    if (!config) return src;

    try {
      // Extrair bucket e path do URL
      const urlParts = src.split('/storage/v1/object/public/');
      if (urlParts.length !== 2) return src;

      const [bucket, ...pathParts] = urlParts[1].split('/');
      const path = pathParts.join('/');

      return supabase.storage
        .from(bucket)
        .getPublicUrl(path, {
          transform: {
            width: config.width,
            height: config.height,
            quality: config.quality
          }
        }).data.publicUrl;
    } catch (error) {
      console.error('Error generating optimized URL:', error);
      return src;
    }
  };

  const optimizedUrl = getOptimizedUrl();

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

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
    <div className={`relative ${className}`}>
      {/* Skeleton placeholder enquanto carrega */}
      {isLoading && (
        <Skeleton className="absolute inset-0" />
      )}

      {/* Thumbnail como placeholder blur (se fornecido) */}
      {isLoading && placeholderSrc && (
        <img
          src={placeholderSrc}
          alt={alt}
          className="absolute inset-0 w-full h-full object-cover blur-sm"
          aria-hidden="true"
        />
      )}

      {/* Imagem principal */}
      <img
        src={optimizedUrl}
        alt={alt}
        loading="lazy"
        onLoad={handleLoad}
        onError={handleError}
        onClick={onClick}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        }`}
      />
    </div>
  );
};

/**
 * Exemplo de uso:
 * 
 * // Thumbnail em listagem
 * <OptimizedImage
 *   src={photo.watermarked_url}
 *   alt={photo.title}
 *   size="thumbnail"
 *   placeholderSrc={photo.thumbnail_url}
 *   className="aspect-square rounded-lg"
 * />
 * 
 * // Imagem média em modal
 * <OptimizedImage
 *   src={photo.watermarked_url}
 *   alt={photo.title}
 *   size="medium"
 *   className="max-w-4xl mx-auto"
 * />
 * 
 * // Imagem grande para visualização
 * <OptimizedImage
 *   src={photo.original_url}
 *   alt={photo.title}
 *   size="large"
 *   className="w-full"
 * />
 */
