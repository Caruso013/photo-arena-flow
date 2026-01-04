import { AlertTriangle, KeyRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { usePhotographerPix } from '@/hooks/usePhotographerPix';

interface PixRequiredAlertProps {
  variant?: 'banner' | 'card' | 'inline';
  showButton?: boolean;
}

export function PixRequiredAlert({ variant = 'banner', showButton = true }: PixRequiredAlertProps) {
  const { hasPixKey, loading } = usePhotographerPix();

  if (loading || hasPixKey) {
    return null;
  }

  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-2 text-destructive text-sm">
        <AlertTriangle className="h-4 w-4" />
        <span>Cadastre sua chave PIX para fazer upload</span>
        {showButton && (
          <Link to="/dashboard/fotografo/pix" className="underline font-medium">
            Cadastrar
          </Link>
        )}
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-destructive" />
          <h3 className="font-semibold text-destructive">Chave PIX Obrigatória</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Para fazer upload de fotos e receber seus pagamentos, você precisa cadastrar uma chave PIX.
        </p>
        {showButton && (
          <Button asChild variant="destructive" size="sm">
            <Link to="/dashboard/fotografo/pix">
              <KeyRound className="h-4 w-4 mr-2" />
              Cadastrar Chave PIX
            </Link>
          </Button>
        )}
      </div>
    );
  }

  // Banner (default)
  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Ação Necessária</AlertTitle>
      <AlertDescription className="flex items-center justify-between gap-4">
        <span>
          Cadastre sua chave PIX para poder fazer upload de fotos.
        </span>
        {showButton && (
          <Button asChild variant="outline" size="sm" className="shrink-0 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground">
            <Link to="/dashboard/fotografo/pix">
              Cadastrar Agora
            </Link>
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
