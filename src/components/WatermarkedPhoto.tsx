import React from 'react';

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
}) => {
  const watermarkPositionClass =
    position === 'center'
      ? 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32'
      : position === 'corner'
      ? 'right-2 bottom-2 w-16 h-16'
      : 'inset-0 w-full h-full'; // position === 'full'

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

  return (
    <div className="relative w-full h-full">
      <img 
        src={src} 
        alt={alt} 
        className={imgClassName}
        loading={loading}
        decoding="async"
        crossOrigin="anonymous"
      />

      {/* watermark overlay in front */}
      <img
        src={watermarkSrc}
        alt="Marca d'água"
        className={`pointer-events-none absolute z-10 ${watermarkPositionClass} ${watermarkClassName}`}
        style={{ 
          opacity,
          objectFit: position === 'full' ? 'cover' : 'contain'
        }}
        loading={loading}
        decoding="async"
        aria-hidden
        crossOrigin="anonymous"
      />
    </div>
  );
};

export default WatermarkedPhoto;
