import { useState } from 'react';
import { KeyRound, Shield, CheckCircle, Clock, AlertTriangle, Edit } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { PixKeyRegistration } from '@/components/photographer/PixKeyRegistration';
import { usePhotographerPix } from '@/hooks/usePhotographerPix';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function PixSettings() {
  const {
    hasPixKey,
    pixKeyMasked,
    pixKeyType,
    recipientName,
    institution,
    verifiedAt,
    hasPendingChange,
    daysUntilChangeApplied,
    loading,
  } = usePhotographerPix();

  const [showEditForm, setShowEditForm] = useState(false);

  const getPixTypeLabel = (type: string | null): string => {
    const labels: Record<string, string> = {
      cpf: 'CPF',
      cnpj: 'CNPJ',
      email: 'E-mail',
      telefone: 'Telefone',
      aleatoria: 'Chave Aleatória',
    };
    return type ? labels[type] || type : 'Não definido';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <KeyRound className="h-6 w-6" />
          Configurações de PIX
        </h1>
        <p className="text-muted-foreground">
          Gerencie sua chave PIX para receber seus pagamentos
        </p>
      </div>

      {/* Alert for photographers without PIX */}
      {!hasPixKey && !hasPendingChange && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Chave PIX Obrigatória</AlertTitle>
          <AlertDescription>
            Você precisa cadastrar uma chave PIX para poder fazer upload de fotos e receber seus pagamentos.
          </AlertDescription>
        </Alert>
      )}

      {/* Current PIX Info */}
      {hasPixKey && !showEditForm && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Sua Chave PIX
              </CardTitle>
              <Badge variant="default" className="bg-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                Verificada
              </Badge>
            </div>
            <CardDescription>
              Dados cadastrados para recebimento de pagamentos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Tipo de Chave</p>
                <p className="font-medium">{getPixTypeLabel(pixKeyType)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Chave PIX</p>
                <p className="font-medium text-green-600">{pixKeyMasked || 'Cadastrada'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Nome do Titular</p>
                <p className="font-medium">{recipientName || 'Não informado'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Instituição</p>
                <p className="font-medium">{institution || 'Não informada'}</p>
              </div>
            </div>

            {verifiedAt && (
              <>
                <Separator />
                <p className="text-sm text-muted-foreground">
                  Verificada em {format(verifiedAt, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </>
            )}

            <Button 
              variant="outline" 
              onClick={() => setShowEditForm(true)}
              disabled={hasPendingChange}
            >
              <Edit className="h-4 w-4 mr-2" />
              Alterar Chave PIX
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Pending Change Alert */}
      {hasPendingChange && (
        <Alert className="border-warning/50 bg-warning/10">
          <Clock className="h-4 w-4 text-warning" />
          <AlertTitle className="text-warning">Alteração em Processamento</AlertTitle>
          <AlertDescription>
            Sua nova chave PIX será ativada em <strong>{daysUntilChangeApplied} dia(s) útil(is)</strong>.
            Por segurança, este período é necessário para confirmar a alteração.
          </AlertDescription>
        </Alert>
      )}

      {/* Registration/Edit Form */}
      {(!hasPixKey || showEditForm) && (
        <PixKeyRegistration 
          isUpdate={hasPixKey && showEditForm}
          onSuccess={() => setShowEditForm(false)}
        />
      )}

      {/* Security Info */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Segurança
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Sua chave PIX é criptografada e armazenada de forma segura.</p>
          <p>• Alterações na chave PIX levam 3 dias úteis para serem processadas.</p>
          <p>• Nunca compartilhamos suas informações financeiras com terceiros.</p>
          <p>• Em caso de suspeita de fraude, entre em contato imediatamente.</p>
        </CardContent>
      </Card>
    </div>
  );
}
