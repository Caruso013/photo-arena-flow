import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { KeyRound, AlertTriangle, CheckCircle, Clock, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { MaskedInput, masks, validateCPF, validateCNPJ } from '@/components/ui/masked-input';
import { usePhotographerPix, PixKeyData } from '@/hooks/usePhotographerPix';
import { toast } from 'sonner';

const pixKeySchema = z.object({
  pixKey: z.string().min(1, 'Chave PIX é obrigatória'),
  pixKeyType: z.enum(['cpf', 'cnpj', 'email', 'telefone', 'aleatoria'], {
    required_error: 'Selecione o tipo de chave',
  }),
  recipientName: z.string().min(3, 'Nome do titular deve ter pelo menos 3 caracteres'),
  institution: z.string().optional(),
});

type PixKeyFormData = z.infer<typeof pixKeySchema>;

const PIX_KEY_TYPES = [
  { value: 'cpf', label: 'CPF' },
  { value: 'cnpj', label: 'CNPJ' },
  { value: 'email', label: 'E-mail' },
  { value: 'telefone', label: 'Telefone' },
  { value: 'aleatoria', label: 'Chave Aleatória' },
];

const BANKS = [
  'Banco do Brasil',
  'Bradesco',
  'Caixa Econômica',
  'Itaú',
  'Santander',
  'Nubank',
  'Inter',
  'C6 Bank',
  'PicPay',
  'Mercado Pago',
  'PagBank',
  'Outro',
];

interface PixKeyRegistrationProps {
  isUpdate?: boolean;
  onSuccess?: () => void;
}

export function PixKeyRegistration({ isUpdate = false, onSuccess }: PixKeyRegistrationProps) {
  const { 
    hasPixKey, 
    hasPendingChange, 
    daysUntilChangeApplied,
    registerPixKey, 
    requestPixChange,
    cancelPendingChange,
    loading: pixLoading,
  } = usePhotographerPix();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
    reset,
  } = useForm<PixKeyFormData>({
    resolver: zodResolver(pixKeySchema),
    defaultValues: {
      pixKey: '',
      recipientName: '',
      institution: '',
    },
  });

  const pixKeyType = watch('pixKeyType');
  const pixKeyValue = watch('pixKey');

  const getMask = (type: string): string | undefined => {
    switch (type) {
      case 'cpf':
        return masks.cpf;
      case 'cnpj':
        return masks.cnpj;
      case 'telefone':
        return masks.phone;
      default:
        return undefined;
    }
  };

  const validatePixKey = (value: string, type: string): string | null => {
    if (!value || !type) return null;
    
    switch (type) {
      case 'cpf':
        const cpfClean = value.replace(/\D/g, '');
        if (cpfClean.length < 11) return 'CPF incompleto';
        return validateCPF(value) ? null : 'CPF inválido';
      case 'cnpj':
        const cnpjClean = value.replace(/\D/g, '');
        if (cnpjClean.length < 14) return 'CNPJ incompleto';
        return validateCNPJ(value) ? null : 'CNPJ inválido';
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value) ? null : 'E-mail inválido';
      case 'telefone':
        const phoneClean = value.replace(/\D/g, '');
        if (phoneClean.length < 10) return 'Telefone incompleto';
        return phoneClean.length >= 10 ? null : 'Telefone inválido';
      case 'aleatoria':
        return value.length >= 20 ? null : 'Chave aleatória deve ter pelo menos 20 caracteres';
      default:
        return null;
    }
  };

  // Validate on change
  const handlePixKeyChange = (value: string) => {
    setValue('pixKey', value);
    if (pixKeyType && value) {
      const error = validatePixKey(value, pixKeyType);
      setValidationError(error);
    } else {
      setValidationError(null);
    }
  };

  const onSubmit = async (data: PixKeyFormData) => {
    // Validate PIX key based on type
    const keyError = validatePixKey(data.pixKey, data.pixKeyType);
    if (keyError) {
      setValidationError(keyError);
      toast.error(keyError);
      return;
    }

    setIsSubmitting(true);
    try {
      const pixData: PixKeyData = {
        pixKey: data.pixKey,
        pixKeyType: data.pixKeyType as PixKeyData['pixKeyType'],
        recipientName: data.recipientName,
        institution: data.institution,
      };

      let success: boolean;
      if (isUpdate && hasPixKey) {
        success = await requestPixChange(pixData);
      } else {
        success = await registerPixKey(pixData);
      }

      if (success) {
        reset();
        onSuccess?.();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (hasPendingChange) {
    return (
      <Card className="border-warning/50 bg-warning/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-warning">
            <Clock className="h-5 w-5" />
            Alteração de PIX Pendente
          </CardTitle>
          <CardDescription>
            Sua solicitação de alteração está sendo processada.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Aguardando período de segurança</AlertTitle>
            <AlertDescription>
              {daysUntilChangeApplied > 0 ? (
                <>
                  Sua nova chave PIX será ativada em <strong>{daysUntilChangeApplied} dia(s) útil(is)</strong>.
                  Este período é necessário por motivos de segurança.
                </>
              ) : (
                <>Sua nova chave PIX será ativada em breve.</>
              )}
            </AlertDescription>
          </Alert>
          
          <Button 
            variant="outline" 
            onClick={cancelPendingChange}
            disabled={pixLoading}
          >
            Cancelar Alteração
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5" />
          {isUpdate ? 'Alterar Chave PIX' : 'Cadastrar Chave PIX'}
        </CardTitle>
        <CardDescription>
          {isUpdate 
            ? 'Solicite a alteração da sua chave PIX. Por segurança, a alteração levará 3 dias úteis.'
            : 'Cadastre sua chave PIX para receber seus pagamentos. Esta informação é obrigatória para fazer upload de fotos.'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Tipo de Chave */}
          <div className="space-y-2">
            <Label htmlFor="pixKeyType">Tipo de Chave *</Label>
            <Select
              value={selectedType}
              onValueChange={(value) => {
                setSelectedType(value);
                setValue('pixKeyType', value as PixKeyFormData['pixKeyType']);
                setValue('pixKey', ''); // Clear when type changes
                setValidationError(null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo de chave" />
              </SelectTrigger>
              <SelectContent>
                {PIX_KEY_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.pixKeyType && (
              <p className="text-sm text-destructive">{errors.pixKeyType.message}</p>
            )}
          </div>

          {/* Chave PIX */}
          <div className="space-y-2">
            <Label htmlFor="pixKey">Chave PIX *</Label>
            <Controller
              name="pixKey"
              control={control}
              render={({ field }) => (
                getMask(pixKeyType) ? (
                  <MaskedInput
                    mask={getMask(pixKeyType)!}
                    placeholder={
                      pixKeyType === 'cpf' ? '000.000.000-00' :
                      pixKeyType === 'cnpj' ? '00.000.000/0000-00' :
                      pixKeyType === 'telefone' ? '(00) 00000-0000' : ''
                    }
                    value={field.value || ''}
                    onChange={(e) => handlePixKeyChange(e.target.value)}
                    onBlur={field.onBlur}
                  />
                ) : (
                  <Input
                    type={pixKeyType === 'email' ? 'email' : 'text'}
                    placeholder={
                      pixKeyType === 'email' ? 'seu@email.com' :
                      pixKeyType === 'aleatoria' ? 'Cole sua chave aleatória' : 'Digite sua chave PIX'
                    }
                    value={field.value || ''}
                    onChange={(e) => handlePixKeyChange(e.target.value)}
                    onBlur={field.onBlur}
                  />
                )
              )}
            />
            {(errors.pixKey || validationError) && (
              <p className="text-sm text-destructive">{validationError || errors.pixKey?.message}</p>
            )}
          </div>

          {/* Nome do Titular */}
          <div className="space-y-2">
            <Label htmlFor="recipientName">Nome do Titular *</Label>
            <Input
              placeholder="Nome completo conforme cadastrado no banco"
              {...register('recipientName')}
            />
            {errors.recipientName && (
              <p className="text-sm text-destructive">{errors.recipientName.message}</p>
            )}
          </div>

          {/* Instituição */}
          <div className="space-y-2">
            <Label htmlFor="institution">Instituição Financeira</Label>
            <Select
              onValueChange={(value) => setValue('institution', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o banco (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {BANKS.map((bank) => (
                  <SelectItem key={bank} value={bank}>
                    {bank}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Aviso de período de carência */}
          {isUpdate && (
            <Alert variant="default" className="bg-muted/50">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Período de Segurança</AlertTitle>
              <AlertDescription>
                Por motivos de segurança, alterações na chave PIX levam <strong>3 dias úteis</strong> para serem processadas.
                Sua chave atual continuará válida durante este período.
              </AlertDescription>
            </Alert>
          )}

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isSubmitting || pixLoading}
          >
            {isSubmitting ? 'Processando...' : isUpdate ? 'Solicitar Alteração' : 'Cadastrar Chave PIX'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
