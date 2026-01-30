import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Copy, CheckCircle2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

interface CreateMesarioModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  campaignTitle: string;
  organizationId?: string;
}

interface CreatedSession {
  access_code: string;
  mesario_name: string;
  expires_at: string;
}

const CreateMesarioModal = ({
  open,
  onOpenChange,
  campaignId,
  campaignTitle,
  organizationId
}: CreateMesarioModalProps) => {
  const [mesarioName, setMesarioName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdSession, setCreatedSession] = useState<CreatedSession | null>(null);

  const handleCreate = async () => {
    if (!mesarioName.trim()) {
      setError('Nome do mesário é obrigatório');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError('Sessão expirada. Faça login novamente.');
        return;
      }

      const { data, error: fnError } = await supabase.functions.invoke('create-mesario-session', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        },
        body: {
          campaign_id: campaignId,
          mesario_name: mesarioName.trim(),
          organization_id: organizationId
        }
      });

      if (fnError) throw fnError;

      if (!data.success) {
        setError(data.error || 'Erro ao criar sessão');
        return;
      }

      setCreatedSession({
        access_code: data.session.access_code,
        mesario_name: data.session.mesario_name,
        expires_at: data.session.expires_at
      });

      toast.success('Sessão de mesário criada com sucesso!');
    } catch (err: any) {
      console.error('Erro ao criar sessão:', err);
      setError('Erro ao criar sessão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    if (createdSession) {
      navigator.clipboard.writeText(createdSession.access_code);
      toast.success('Código copiado!');
    }
  };

  const handleClose = () => {
    setMesarioName('');
    setError(null);
    setCreatedSession(null);
    onOpenChange(false);
  };

  const formatExpiration = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {createdSession ? 'Mesário Criado!' : 'Criar Mesário'}
          </DialogTitle>
          <DialogDescription>
            {createdSession 
              ? 'Compartilhe o código com o mesário'
              : `Evento: ${campaignTitle}`
            }
          </DialogDescription>
        </DialogHeader>

        {!createdSession ? (
          <>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="mesario_name">Nome do Mesário</Label>
                <Input
                  id="mesario_name"
                  placeholder="Ex: João Silva"
                  value={mesarioName}
                  onChange={(e) => setMesarioName(e.target.value)}
                  disabled={loading}
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={loading}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  'Criar Acesso'
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <div className="space-y-6 py-4">
            {/* Success State */}
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-green-500/10 mx-auto mb-4 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>

              <p className="font-medium mb-1">{createdSession.mesario_name}</p>
              <p className="text-sm text-muted-foreground">Mesário do evento</p>
            </div>

            {/* Access Code */}
            <div className="bg-muted p-4 rounded-lg text-center">
              <p className="text-sm text-muted-foreground mb-2">Código de Acesso</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-3xl font-mono font-bold tracking-[0.3em]">
                  {createdSession.access_code}
                </span>
                <Button variant="ghost" size="icon" onClick={copyCode}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Expiration */}
            <Alert>
              <AlertDescription className="text-center">
                <strong>Válido até:</strong> {formatExpiration(createdSession.expires_at)}
                <br />
                <span className="text-sm">(24 horas a partir de agora)</span>
              </AlertDescription>
            </Alert>

            {/* Instructions */}
            <div className="text-sm text-muted-foreground space-y-1">
              <p>• O mesário deve acessar: <strong>/mesario</strong></p>
              <p>• Inserir o código acima para fazer login</p>
              <p>• O código expira automaticamente após 24h</p>
            </div>

            <DialogFooter>
              <Button className="w-full" onClick={handleClose}>
                Fechar
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CreateMesarioModal;
