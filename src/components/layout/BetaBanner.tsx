import { useState, useEffect } from 'react';
import { X, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'beta-banner-dismissed';

const BetaBanner = () => {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const isDismissed = localStorage.getItem(STORAGE_KEY);
    if (!isDismissed) setDismissed(false);
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  if (dismissed) return null;

  const whatsappUrl = 'https://wa.me/5511957719467?text=Olá! Encontrei um problema no site STA Fotos.';

  return (
    <div className="w-full bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-1.5 text-center relative">
      <div className="flex items-center justify-center gap-3 text-xs sm:text-sm">
        <span className="text-yellow-700 dark:text-yellow-400 font-medium">
          🚧 Este site está em fase beta
        </span>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-600 text-white text-xs font-medium hover:bg-green-700 transition-colors"
        >
          <MessageCircle className="h-3 w-3" />
          Reportar erro
        </a>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/20"
        onClick={handleDismiss}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
};

export default BetaBanner;
