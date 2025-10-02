import React from 'react';

interface WatermarkedPhotoProps {
  src: string;
  alt?: string;
  watermarkSrc?: string;
  imgClassName?: string;
  watermarkClassName?: string;
  position?: 'center' | 'corner' | 'full';
  opacity?: number;
}

const WatermarkedPhoto: React.FC<WatermarkedPhotoProps> = ({
  src,
  alt = '',
  watermarkSrc = '/watermark_front.png',
  imgClassName = 'w-full h-full object-cover',
  watermarkClassName = '',
  position = 'full',
  opacity = 0.6,
}) => {
  const watermarkPositionClass =
    position === 'center'
      ? 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32'
      : position === 'corner'
      ? 'right-2 bottom-2 w-16 h-16'
      : 'inset-0 w-full h-full'; // position === 'full'

  return (
    <div className="relative w-full h-full">
      <img src={src} alt={alt} className={imgClassName} />

      {/* watermark overlay in front */}
      <img
        src={watermarkSrc}
        alt="Marca d'água"
        className={`pointer-events-none absolute z-10 ${watermarkPositionClass} ${watermarkClassName}`}
        style={{ 
          opacity,
          objectFit: position === 'full' ? 'cover' : 'contain'
        }}
        aria-hidden
      />
    </div>
  );
};

export default WatermarkedPhoto;
