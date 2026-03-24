import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Copy, CheckCircle, AlertTriangle, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';

const isInstagramBrowser = (): boolean => {
  const ua = navigator.userAgent || '';
  return /Instagram|FBAN|FBAV/i.test(ua);
};

const InstagramBrowserModal = () => {
  const [detected, setDetected] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isInstagramBrowser()) {
      setDetected(true);
    }
  }, []);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      const input = document.createElement('input');
      input.value = window.location.href;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleOpenExternal = () => {
    // Tentar abrir no navegador externo via intent (Android)
    const url = window.location.href;
    try {
      window.open(`intent://${url.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`, '_blank');
    } catch {
      // Fallback: tentar window.open normal
      window.open(url, '_system');
    }
  };

  if (!detected) return null;

  return (
    <Dialog open={true} onOpenChange={() => { /* Bloqueado - não pode fechar */ }}>
      <DialogContent 
        className="max-w-sm mx-auto [&>button]:hidden" 
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex justify-center mb-3">
            <div className="bg-destructive/10 p-4 rounded-full">
              <AlertTriangle className="h-10 w-10 text-destructive" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl">
            Site bloqueado no Instagram
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            O navegador do Instagram <strong className="text-foreground">não é compatível</strong> com nosso site. 
            Você precisa abrir no navegador do seu celular para continuar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="bg-muted rounded-lg p-4 space-y-3 text-sm">
            <p className="font-semibold text-foreground flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Como abrir no navegador:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
              <li>Toque nos <strong className="text-foreground">3 pontinhos</strong> (⋮) no canto superior direito da tela</li>
              <li>Selecione <strong className="text-foreground">"Abrir no navegador"</strong> ou <strong className="text-foreground">"Abrir no Chrome"</strong></li>
            </ol>
            <p className="text-xs text-muted-foreground italic">
              No iPhone: toque no ícone do Safari (bússola) na barra inferior
            </p>
          </div>

          <div className="text-center text-xs text-muted-foreground">ou</div>

          <Button onClick={handleCopyLink} variant="outline" className="w-full gap-2 min-h-[48px] text-base">
            {copied ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                Link copiado! Cole no navegador
              </>
            ) : (
              <>
                <Copy className="h-5 w-5" />
                Copiar link do site
              </>
            )}
          </Button>

          <Button onClick={handleOpenExternal} className="w-full gap-2 min-h-[48px] text-base">
            <Smartphone className="h-5 w-5" />
            Tentar abrir no Chrome
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Este aviso aparece porque o Instagram usa um navegador limitado que causa erros de pagamento e carregamento.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InstagramBrowserModal;
