import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export const PWAUpdatePrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Detectar quando há uma nova versão disponível
      navigator.serviceWorker.ready.then((reg) => {
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Nova versão disponível
                setRegistration(reg);
                setShowPrompt(true);
                
                toast.info('Nova atualização disponível!', {
                  description: 'Clique para atualizar o site com as novas funcionalidades.',
                  duration: Infinity,
                  action: {
                    label: 'Atualizar',
                    onClick: () => handleUpdate()
                  }
                });
              }
            });
          }
        });

        // Verificar atualizações a cada 60 segundos
        setInterval(() => {
          reg.update();
        }, 60000);
      });

      // Detectar quando o service worker foi atualizado e está pronto
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }
  }, []);

  const handleUpdate = () => {
    if (registration && registration.waiting) {
      // Enviar mensagem para o service worker skipWaiting
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <Card className="fixed bottom-4 right-4 z-50 p-4 shadow-lg border-primary/20 bg-card max-w-sm animate-in slide-in-from-bottom">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <RefreshCw className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm mb-1">Nova Atualização Disponível</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Uma nova versão do site está disponível com melhorias e novas funcionalidades.
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleUpdate} className="flex-1">
              Atualizar Agora
            </Button>
            <Button size="sm" variant="outline" onClick={handleDismiss}>
              Depois
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};
