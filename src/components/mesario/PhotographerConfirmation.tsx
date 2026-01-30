import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PhotographerConfirmationProps {
  photographer: {
    id: string;
    full_name: string;
    avatar_url?: string;
    application?: {
      applied_at: string;
      processed_at: string;
    };
  };
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

const PhotographerConfirmation = ({
  photographer,
  onConfirm,
  onCancel,
  loading = false
}: PhotographerConfirmationProps) => {
  return (
    <Card className="border-2 border-green-500/50 bg-green-500/5">
      <CardContent className="p-6 text-center">
        {/* Avatar */}
        <Avatar className="h-24 w-24 mx-auto mb-4 border-4 border-green-500/30">
          <AvatarImage src={photographer.avatar_url} />
          <AvatarFallback className="text-2xl bg-green-500/10 text-green-600">
            {photographer.full_name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        {/* Name */}
        <h2 className="text-xl font-bold mb-2">{photographer.full_name}</h2>

        {/* Status Badge */}
        <Badge className="bg-green-500/10 text-green-600 border-green-500/30 mb-4">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Aprovado para este evento
        </Badge>

        {/* Application Info */}
        {photographer.application && (
          <p className="text-sm text-muted-foreground mb-6">
            Candidatura aprovada em{' '}
            {format(new Date(photographer.application.processed_at), "dd/MM/yyyy", { locale: ptBR })}
          </p>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <Button 
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            size="lg"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Confirmando...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Confirmar Presença
              </>
            )}
          </Button>

          <Button 
            variant="ghost" 
            className="w-full"
            onClick={onCancel}
            disabled={loading}
          >
            <XCircle className="mr-2 h-4 w-4" />
            Cancelar e escanear outro
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PhotographerConfirmation;
