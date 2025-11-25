import { Loader2 } from 'lucide-react';

interface PullToRefreshIndicatorProps {
  isPulling: boolean;
  isRefreshing: boolean;
  progress: number;
}

export const PullToRefreshIndicator = ({
  isPulling,
  isRefreshing,
  progress
}: PullToRefreshIndicatorProps) => {
  if (!isPulling && !isRefreshing) return null;

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none"
      style={{
        transform: `translateY(${isPulling ? Math.min(progress, 100) : 0}%)`,
        transition: isPulling ? 'none' : 'transform 0.3s ease-out'
      }}
    >
      <div className="bg-background/80 backdrop-blur-sm rounded-full p-3 m-4 shadow-lg border">
        {isRefreshing ? (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        ) : (
          <div 
            className="relative h-5 w-5"
            style={{
              transform: `rotate(${progress * 3.6}deg)`,
              transition: 'transform 0.1s ease-out'
            }}
          >
            <div className="absolute inset-0 border-2 border-primary/30 rounded-full" />
            <div 
              className="absolute inset-0 border-2 border-primary rounded-full"
              style={{
                clipPath: `polygon(50% 50%, 50% 0%, ${50 + 50 * Math.sin((progress * 3.6) * Math.PI / 180)}% ${50 - 50 * Math.cos((progress * 3.6) * Math.PI / 180)}%, 50% 50%)`
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
