import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Download, Smartphone } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Verificar se já está instalado
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Verificar se o usuário já recusou antes (localStorage)
    const hasDeclined = localStorage.getItem('pwa-install-declined');
    if (hasDeclined) {
      const declinedDate = new Date(hasDeclined);
      const daysSince = (Date.now() - declinedDate.getTime()) / (1000 * 60 * 60 * 24);
      
      // Mostrar novamente após 7 dias
      if (daysSince < 7) {
        return;
      }
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Mostrar prompt após 30 segundos de uso
      setTimeout(() => {
        setShowPrompt(true);
      }, 30000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Detectar quando é instalado
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowPrompt(false);
      toast({
        title: "App instalado!",
        description: "STA Fotos foi instalado no seu dispositivo.",
      });
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      toast({
        title: "Instalando...",
        description: "O app será instalado em breve.",
      });
    } else {
      // Usuário recusou - salvar no localStorage
      localStorage.setItem('pwa-install-declined', new Date().toISOString());
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-declined', new Date().toISOString());
  };

  // Não mostrar se já está instalado ou não há prompt
  if (isInstalled || !showPrompt || !deferredPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-5">
      <Card className="shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Smartphone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Instalar App</CardTitle>
                <CardDescription className="text-xs">
                  Acesso rápido e offline
                </CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 -mt-1"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          <p className="text-sm text-muted-foreground">
            Instale STA Fotos no seu dispositivo para:
          </p>
          <ul className="text-xs space-y-1 text-muted-foreground">
            <li className="flex items-center gap-1">
              <span className="text-green-500">✓</span> Acesso rápido
            </li>
            <li className="flex items-center gap-1">
              <span className="text-green-500">✓</span> Funciona offline
            </li>
            <li className="flex items-center gap-1">
              <span className="text-green-500">✓</span> Notificações push
            </li>
          </ul>
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleInstall}
              className="flex-1 gap-2"
              size="sm"
            >
              <Download className="h-4 w-4" />
              Instalar
            </Button>
            <Button
              onClick={handleDismiss}
              variant="outline"
              size="sm"
            >
              Agora não
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
