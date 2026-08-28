import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Copy, CheckCircle2, ExternalLink, Compass, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Detecta se a página está aberta dentro do navegador interno do Instagram
 * (in-app webview), que bloqueia pagamento e câmera.
 */
const isInstagramBrowser = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /Instagram|FBAN|FBAV/i.test(ua);
};

/** Motivo pelo qual o navegador externo é necessário — ajusta o texto do aviso. */
type GateReason = 'payment' | 'camera' | 'generic';

interface GateContextValue {
  /** true quando estamos dentro do navegador interno do Instagram. */
  isInstagramInApp: boolean;
  /**
   * Chame antes de uma ação que precisa do navegador de verdade (pagamento, câmera).
   * Se estiver no Instagram, abre o aviso e retorna `false` (aborte a ação).
   * Caso contrário retorna `true` e você pode seguir normalmente.
   */
  requireExternalBrowser: (reason?: GateReason) => boolean;
}

const InstagramGateContext = createContext<GateContextValue | null>(null);

const COPY: Record<GateReason, { title: string; subtitle: string }> = {
  payment: {
    title: 'Falta pouco pras suas fotos',
    subtitle: 'Pra concluir o pagamento com segurança, abra o site no navegador do seu celular. O Instagram bloqueia a tela de pagamento.',
  },
  camera: {
    title: 'Vamos encontrar suas fotos',
    subtitle: 'Pra usar a câmera e reconhecer seu rosto, abra o site no navegador do seu celular. O Instagram não libera a câmera aqui dentro.',
  },
  generic: {
    title: 'Abra no seu navegador',
    subtitle: 'Pra melhor experiência, abra o site no navegador do seu celular. Aqui dentro do Instagram alguns recursos ficam bloqueados.',
  },
};

export const InstagramGateProvider = ({ children }: { children: ReactNode }) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<GateReason>('generic');
  const isInstagramInApp = useMemo(isInstagramBrowser, []);

  const requireExternalBrowser = useCallback(
    (nextReason: GateReason = 'generic') => {
      if (!isInstagramInApp) return true;
      setReason(nextReason);
      setOpen(true);
      return false;
    },
    [isInstagramInApp],
  );

  const value = useMemo(
    () => ({ isInstagramInApp, requireExternalBrowser }),
    [isInstagramInApp, requireExternalBrowser],
  );

  return (
    <InstagramGateContext.Provider value={value}>
      {children}
      <InstagramGateModal open={open} reason={reason} onOpenChange={setOpen} />
    </InstagramGateContext.Provider>
  );
};

export const useInstagramGate = (): GateContextValue => {
  const ctx = useContext(InstagramGateContext);
  if (!ctx) {
    // Fallback seguro caso algum componente use o hook fora do provider:
    // nunca bloqueia, apenas segue a ação.
    return { isInstagramInApp: false, requireExternalBrowser: () => true };
  }
  return ctx;
};

interface ModalProps {
  open: boolean;
  reason: GateReason;
  onOpenChange: (open: boolean) => void;
}

const InstagramGateModal = ({ open, reason, onOpenChange }: ModalProps) => {
  const [copied, setCopied] = useState(false);
  const { title, subtitle } = COPY[reason];

  const handleCopyLink = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleOpenExternal = () => {
    const url = window.location.href;
    try {
      window.open(
        `intent://${url.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`,
        '_blank',
      );
    } catch {
      window.open(url, '_system');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto gap-0 overflow-hidden rounded-2xl border-none p-0">
        {/* Cabeçalho com a marca STA — acolhedor, não alarmante */}
        <div className="flex flex-col items-center bg-gradient-to-b from-primary/15 to-transparent px-6 pt-8 pb-6 text-center">
          <img
            src="/sta-new-logo-transparent.png"
            alt="STA Fotos"
            className="mb-5 h-12 w-auto object-contain"
          />
          <h2 className="text-xl font-bold tracking-tight text-foreground">{title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
        </div>

        <div className="space-y-4 px-6 pb-6">
          {/* Passo a passo */}
          <div className="rounded-xl bg-muted/60 p-4">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <MoreVertical className="h-4 w-4 text-primary" />
              Como abrir em 2 passos
            </p>
            <ol className="space-y-2.5 text-sm text-muted-foreground">
              <li className="flex gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  1
                </span>
                <span>
                  Toque nos <strong className="text-foreground">3 pontinhos</strong> no canto
                  superior da tela
                </span>
              </li>
              <li className="flex gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  2
                </span>
                <span>
                  Escolha <strong className="text-foreground">"Abrir no navegador"</strong> ou{' '}
                  <strong className="text-foreground">"Abrir no Chrome"</strong>
                </span>
              </li>
            </ol>
            <p className="mt-3 flex items-center gap-1.5 border-t border-border/60 pt-3 text-xs text-muted-foreground">
              <Compass className="h-3.5 w-3.5 shrink-0" />
              No iPhone: toque no ícone do Safari (bússola) na barra de baixo
            </p>
          </div>

          <div className="text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
            ou faça direto
          </div>

          <div className="space-y-2.5">
            <Button
              onClick={handleCopyLink}
              className="h-12 w-full gap-2 text-base font-semibold"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="h-5 w-5" />
                  Link copiado! Cole no navegador
                </>
              ) : (
                <>
                  <Copy className="h-5 w-5" />
                  Copiar link do site
                </>
              )}
            </Button>

            <Button
              onClick={handleOpenExternal}
              variant="outline"
              className="h-12 w-full gap-2 text-base"
            >
              <ExternalLink className="h-5 w-5" />
              Tentar abrir no Chrome
            </Button>

            <Button
              onClick={() => onOpenChange(false)}
              variant="ghost"
              className="h-10 w-full text-sm text-muted-foreground"
            >
              Continuar olhando por aqui
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
