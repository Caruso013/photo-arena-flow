import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ExternalLink, Copy, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const isInstagramBrowser = (): boolean => {
  const ua = navigator.userAgent || '';
  return /Instagram/i.test(ua);
};

const InstagramBrowserModal = () => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isInstagramBrowser()) {
      setOpen(true);
    }
  }, []);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const input = document.createElement('input');
      input.value = window.location.href;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">
            ⚠️ Navegador do Instagram detectado
          </DialogTitle>
          <DialogDescription className="text-center">
            O navegador interno do Instagram pode causar erros e travamentos. Para uma melhor experiência, abra o site no seu navegador padrão.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="bg-muted rounded-lg p-4 space-y-2 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Como abrir no navegador:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Toque nos <strong>3 pontinhos</strong> (⋮) no canto superior direito</li>
              <li>Selecione <strong>"Abrir no navegador"</strong> ou <strong>"Abrir no Chrome/Safari"</strong></li>
            </ol>
          </div>

          <Button onClick={handleCopyLink} variant="outline" className="w-full gap-2">
            {copied ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-500" />
                Link copiado!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copiar link do site
              </>
            )}
          </Button>

          <Button onClick={() => setOpen(false)} className="w-full gap-2">
            <ExternalLink className="h-4 w-4" />
            Continuar mesmo assim
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InstagramBrowserModal;
