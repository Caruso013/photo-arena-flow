import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreditCard, Lock, AlertCircle, Loader2, CheckCircle, QrCode, Copy, Clock } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// SDK do Mercado Pago types
declare global {
  interface Window {
    MercadoPago: any;
  }
}

interface CardData {
  cardNumber: string;
  cardholderName: string;
  expirationMonth: string;
  expirationYear: string;
  securityCode: string;
}

interface BuyerInfo {
  name: string;
  surname: string;
  email: string;
  phone: string;
  document: string;
}

interface Photo {
  id: string;
  title?: string;
  price?: number;
}

interface ProgressiveDiscount {
  enabled: boolean;
  percentage: number;
  amount: number;
  subtotal: number;
  total: number;
}

interface TransparentCheckoutProps {
  photos: Photo[];
  buyerInfo: BuyerInfo;
  totalAmount: number;
  progressiveDiscount?: ProgressiveDiscount | null;
  onSuccess: (paymentData: any) => void;
  onError: (error: string) => void;
  onCancel: () => void;
}

// Public Key do Mercado Pago (pode ser exposta no frontend)
const MP_PUBLIC_KEY = 'APP_USR-af4e8472-4521-43e3-ac3c-5454853c0964';

export default function TransparentCheckout({
  photos,
  buyerInfo,
  totalAmount,
  progressiveDiscount,
  onSuccess,
  onError,
  onCancel,
}: TransparentCheckoutProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [mpReady, setMpReady] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'pix'>('pix');
  
  // Estados do cartão
  const [cardBrand, setCardBrand] = useState<string | null>(null);
  const [installmentOptions, setInstallmentOptions] = useState<any[]>([]);
  const [selectedInstallment, setSelectedInstallment] = useState(1);
  const [issuers, setIssuers] = useState<any[]>([]);
  const [selectedIssuer, setSelectedIssuer] = useState<string>('');
  const [cardData, setCardData] = useState<CardData>({
    cardNumber: '',
    cardholderName: buyerInfo.name + ' ' + buyerInfo.surname,
    expirationMonth: '',
    expirationYear: '',
    securityCode: '',
  });
  const [cardErrors, setCardErrors] = useState<Record<string, string>>({});
  
  // Estados do PIX
  const [pixData, setPixData] = useState<{
    qrCode: string;
    qrCodeBase64: string;
    expirationDate: string;
    paymentId: string;
  } | null>(null);
  const [pixCopied, setPixCopied] = useState(false);
  const [checkingPixPayment, setCheckingPixPayment] = useState(false);
  
  const mpRef = useRef<any>(null);
  const pixCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Inicializar SDK do Mercado Pago
  useEffect(() => {
    const initMP = async () => {
      if (window.MercadoPago) {
        try {
          mpRef.current = new window.MercadoPago(MP_PUBLIC_KEY, {
            locale: 'pt-BR',
          });
          setMpReady(true);
          console.log('✅ Mercado Pago SDK inicializado');
        } catch (error) {
          console.error('❌ Erro ao inicializar MP:', error);
          onError('Erro ao inicializar sistema de pagamento');
        }
      } else {
        console.error('❌ SDK do Mercado Pago não encontrado');
        onError('Sistema de pagamento não disponível');
      }
    };

    initMP();
    
    // Cleanup: parar verificação de PIX
    return () => {
      if (pixCheckIntervalRef.current) {
        clearInterval(pixCheckIntervalRef.current);
      }
    };
  }, []);

  // Detectar bandeira do cartão
  const handleCardNumberChange = async (value: string) => {
    const cleanValue = value.replace(/\D/g, '');
    const formatted = cleanValue.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
    
    setCardData(prev => ({ ...prev, cardNumber: formatted }));
    
    if (cleanValue.length >= 6 && mpRef.current) {
      try {
        const bin = cleanValue.substring(0, 6);
        const paymentMethods = await mpRef.current.getPaymentMethods({ bin });
        
        if (paymentMethods.results && paymentMethods.results.length > 0) {
          const method = paymentMethods.results[0];
          setCardBrand(method.id);
          
          const issuersData = await mpRef.current.getIssuers({ 
            paymentMethodId: method.id,
            bin: bin 
          });
          setIssuers(issuersData);
          if (issuersData.length > 0) {
            setSelectedIssuer(issuersData[0].id.toString());
          }
          
          await getInstallments(method.id, bin);
        }
      } catch (error) {
        console.error('Erro ao detectar bandeira:', error);
      }
    } else {
      setCardBrand(null);
      setInstallmentOptions([]);
    }
  };

  // Buscar opções de parcelamento
  const getInstallments = async (paymentMethodId: string, bin: string) => {
    if (!mpRef.current) return;
    
    try {
      const installments = await mpRef.current.getInstallments({
        amount: totalAmount.toString(),
        bin: bin,
        paymentTypeId: 'credit_card',
      });
      
      if (installments && installments.length > 0) {
        const options = installments[0].payer_costs || [];
        setInstallmentOptions(options);
        setSelectedInstallment(1);
      }
    } catch (error) {
      console.error('Erro ao buscar parcelas:', error);
    }
  };

  // Copiar código PIX
  const handleCopyPix = async () => {
    if (pixData?.qrCode) {
      try {
        await navigator.clipboard.writeText(pixData.qrCode);
        setPixCopied(true);
        toast({
          title: "Código copiado!",
          description: "Cole no app do seu banco para pagar.",
        });
        setTimeout(() => setPixCopied(false), 3000);
      } catch (error) {
        toast({
          title: "Erro ao copiar",
          description: "Selecione o código manualmente.",
          variant: "destructive",
        });
      }
    }
  };

  // Verificar status do pagamento PIX
  const checkPixPaymentStatus = async (paymentId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('process-transparent-payment', {
        body: {
          action: 'check_pix_status',
          paymentId: paymentId,
        },
      });

      if (data?.status === 'approved') {
        if (pixCheckIntervalRef.current) {
          clearInterval(pixCheckIntervalRef.current);
        }
        setCheckingPixPayment(false);
        toast({
          title: "Pagamento confirmado!",
          description: "Seu PIX foi aprovado.",
        });
        onSuccess(data);
      }
    } catch (error) {
      console.error('Erro ao verificar PIX:', error);
    }
  };

  // Gerar PIX
  const handleGeneratePix = async () => {
    setLoading(true);
    setPixData(null);

    try {
      const { data, error } = await supabase.functions.invoke('process-transparent-payment', {
        body: {
          paymentMethod: 'pix',
          photos: photos.map(p => ({
            id: p.id,
            title: p.title || 'Foto',
            price: p.price || 0,
          })),
          buyerInfo: {
            name: buyerInfo.name,
            surname: buyerInfo.surname,
            email: buyerInfo.email,
            phone: buyerInfo.phone,
            document: buyerInfo.document,
          },
          progressiveDiscount: progressiveDiscount,
        },
      });

      if (error) throw error;

      if (data.success && data.pixData) {
        setPixData({
          qrCode: data.pixData.qr_code,
          qrCodeBase64: data.pixData.qr_code_base64,
          expirationDate: data.pixData.expiration_date,
          paymentId: data.payment_id,
        });
        
        // Iniciar verificação automática do status
        setCheckingPixPayment(true);
        pixCheckIntervalRef.current = setInterval(() => {
          checkPixPaymentStatus(data.payment_id);
        }, 3000); // Verificar a cada 3 segundos para UX mais responsiva
        
        toast({
          title: "✅ PIX gerado!",
          description: "Escaneie o QR Code ou copie o código para pagar.",
        });
      } else {
        // Verificar se é erro de credenciais
        const isCredentialError = data.error?.includes('credentials') || 
                                  data.error?.includes('Invalid');
        
        if (isCredentialError) {
          toast({
            title: "⚙️ Erro de configuração",
            description: "Sistema de pagamento indisponível. Tente novamente em alguns minutos.",
            variant: "destructive",
          });
        } else {
          throw new Error(data.error || 'Erro ao gerar PIX');
        }
        onError(data.error || 'Erro ao gerar PIX');
      }
    } catch (error: any) {
      console.error('❌ Erro ao gerar PIX:', error);
      toast({
        title: "❌ Erro ao gerar PIX",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
      onError(error.message || 'Erro ao gerar PIX');
    } finally {
      setLoading(false);
    }
  };

  // Processar pagamento com cartão
  const handleCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!mpRef.current || !cardBrand) {
      toast({
        title: "Erro",
        description: "Por favor, preencha os dados do cartão corretamente.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setCardErrors({});

    try {
      const cardNumberClean = cardData.cardNumber.replace(/\s/g, '');
      
      const tokenData = await mpRef.current.createCardToken({
        cardNumber: cardNumberClean,
        cardholderName: cardData.cardholderName,
        cardExpirationMonth: cardData.expirationMonth,
        cardExpirationYear: cardData.expirationYear.length === 2 ? '20' + cardData.expirationYear : cardData.expirationYear,
        securityCode: cardData.securityCode,
        identificationType: 'CPF',
        identificationNumber: buyerInfo.document.replace(/\D/g, ''),
      });

      if (tokenData.error) {
        throw new Error(tokenData.error);
      }

      const { data, error } = await supabase.functions.invoke('process-transparent-payment', {
        body: {
          paymentMethod: 'card',
          token: tokenData.id,
          paymentMethodId: cardBrand,
          issuerId: selectedIssuer,
          installments: selectedInstallment,
          photos: photos.map(p => ({
            id: p.id,
            title: p.title || 'Foto',
            price: p.price || 0,
          })),
          buyerInfo: {
            name: buyerInfo.name,
            surname: buyerInfo.surname,
            email: buyerInfo.email,
            phone: buyerInfo.phone,
            document: buyerInfo.document,
          },
          progressiveDiscount: progressiveDiscount,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "✅ Pagamento aprovado!",
          description: data.message || "Sua compra foi realizada com sucesso. Redirecionando...",
        });
        onSuccess(data);
      } else if (data.status === 'pending' || data.status === 'in_process') {
        toast({
          title: "⏳ Pagamento em análise",
          description: "Seu pagamento está sendo processado. Você será notificado quando for aprovado.",
        });
        onSuccess(data);
      } else if (data.status === 'rejected') {
        // Mapear motivos de rejeição para mensagens claras
        let rejectMessage = "Tente outro cartão ou use PIX.";
        const statusDetail = data.status_detail || '';
        
        if (statusDetail.includes('insufficient_amount')) {
          rejectMessage = "Saldo insuficiente. Tente outro cartão ou use PIX.";
        } else if (statusDetail.includes('cc_rejected_bad_filled')) {
          rejectMessage = "Dados do cartão incorretos. Verifique e tente novamente.";
        } else if (statusDetail.includes('cc_rejected_high_risk')) {
          rejectMessage = "Transação não autorizada pelo banco. Tente PIX.";
        } else if (statusDetail.includes('cc_rejected_call_for_authorize')) {
          rejectMessage = "Entre em contato com seu banco para autorizar.";
        }
        
        toast({
          title: "❌ Pagamento recusado",
          description: rejectMessage,
          variant: "destructive",
        });
        onError(data.error || rejectMessage);
      } else if (data.error) {
        // Verificar se é erro de credenciais
        const isCredentialError = data.error?.includes('credentials') || 
                                  data.error?.includes('Invalid');
        
        toast({
          title: isCredentialError ? "⚙️ Erro de configuração" : "❌ Erro no pagamento",
          description: isCredentialError 
            ? "Sistema de pagamento indisponível. Tente novamente em alguns minutos."
            : (data.error || "Tente novamente."),
          variant: "destructive",
        });
        onError(data.error);
      }
    } catch (error: any) {
      console.error('❌ Erro no pagamento:', error);
      
      // Verificar se é erro de limite/valor
      const errorMsg = error.message || '';
      const isHighValueError = errorMsg.includes('valor') || 
                               errorMsg.includes('limite') || 
                               errorMsg.includes('amount');
      
      if (error.cause) {
        const causes = error.cause;
        const newErrors: Record<string, string> = {};
        
        causes.forEach((cause: any) => {
          if (cause.code === '205' || cause.code === 'E301') {
            newErrors.cardNumber = 'Número do cartão inválido';
          } else if (cause.code === '208' || cause.code === 'E302') {
            newErrors.expirationMonth = 'Mês de validade inválido';
          } else if (cause.code === '209' || cause.code === 'E302') {
            newErrors.expirationYear = 'Ano de validade inválido';
          } else if (cause.code === '224' || cause.code === 'E303') {
            newErrors.securityCode = 'Código de segurança inválido';
          } else if (cause.code === '221') {
            newErrors.cardholderName = 'Nome do titular inválido';
          } else if (cause.code === '214' || cause.code === '324') {
            newErrors.document = 'CPF inválido';
          }
        });
        
        setCardErrors(newErrors);
      }
      
      toast({
        title: isHighValueError ? "Valor muito alto para cartão" : "Erro no pagamento",
        description: isHighValueError 
          ? "Para compras de valor alto, recomendamos usar PIX." 
          : (error.message || "Verifique os dados e tente novamente."),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getCardBrandIcon = () => {
    if (!cardBrand) return null;
    
    const brandIcons: Record<string, string> = {
      visa: '💳 Visa',
      master: '💳 Mastercard',
      amex: '💳 American Express',
      elo: '💳 Elo',
      hipercard: '💳 Hipercard',
      diners: '💳 Diners',
    };
    
    return brandIcons[cardBrand] || `💳 ${cardBrand}`;
  };

  if (!mpReady) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Carregando sistema de pagamento...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Resumo do pedido */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              {photos.length} {photos.length === 1 ? 'foto' : 'fotos'}
            </span>
            <span className="text-lg font-bold">{formatCurrency(totalAmount)}</span>
          </div>
          {progressiveDiscount && progressiveDiscount.percentage > 0 && (
            <div className="text-xs text-green-600 mt-1">
              {progressiveDiscount.percentage}% de desconto aplicado
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs de método de pagamento */}
      <Tabs value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as 'card' | 'pix')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pix" className="flex items-center gap-2">
            <QrCode className="h-4 w-4" />
            PIX
          </TabsTrigger>
          <TabsTrigger value="card" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Cartão
          </TabsTrigger>
        </TabsList>

        {/* TAB PIX */}
        <TabsContent value="pix" className="space-y-4 mt-4">
          {!pixData ? (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-2">
                  <QrCode className="h-5 w-5" />
                  <span className="font-medium">Pagamento instantâneo via PIX</span>
                </div>
                <ul className="text-sm text-green-600 dark:text-green-500 space-y-1">
                  <li>✓ Aprovação em segundos</li>
                  <li>✓ Disponível 24h</li>
                  <li>✓ Sem taxas adicionais</li>
                </ul>
              </div>

              <Button 
                onClick={handleGeneratePix} 
                disabled={loading}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Gerando PIX...
                  </>
                ) : (
                  <>
                    <QrCode className="h-4 w-4 mr-2" />
                    Gerar QR Code PIX
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* QR Code */}
              <div className="flex flex-col items-center p-4 bg-white rounded-lg border">
                {pixData.qrCodeBase64 && (
                  <img 
                    src={`data:image/png;base64,${pixData.qrCodeBase64}`}
                    alt="QR Code PIX"
                    className="w-48 h-48 mb-4"
                  />
                )}
                
                {checkingPixPayment && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Aguardando pagamento...
                  </div>
                )}
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Válido por 30 minutos
                </div>
              </div>

              {/* Código Copia e Cola */}
              <div className="space-y-2">
                <Label>Código PIX (Copia e Cola)</Label>
                <div className="flex gap-2">
                  <Input 
                    value={pixData.qrCode} 
                    readOnly 
                    className="font-mono text-xs"
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={handleCopyPix}
                  >
                    {pixCopied ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm">
                <p className="text-blue-700 dark:text-blue-400">
                  <strong>Como pagar:</strong>
                </p>
                <ol className="text-blue-600 dark:text-blue-500 mt-1 space-y-1 list-decimal list-inside">
                  <li>Abra o app do seu banco</li>
                  <li>Escolha pagar com PIX</li>
                  <li>Escaneie o QR Code ou cole o código</li>
                  <li>Confirme o pagamento</li>
                </ol>
              </div>

              <Button 
                variant="outline" 
                onClick={() => {
                  if (pixCheckIntervalRef.current) {
                    clearInterval(pixCheckIntervalRef.current);
                  }
                  setPixData(null);
                  setCheckingPixPayment(false);
                }}
                className="w-full"
              >
                Gerar novo PIX
              </Button>
            </div>
          )}
        </TabsContent>

        {/* TAB CARTÃO */}
        <TabsContent value="card" className="space-y-4 mt-4">
          <form onSubmit={handleCardSubmit} className="space-y-4">
            {/* Número do Cartão */}
            <div className="space-y-2">
              <Label htmlFor="cardNumber" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Número do Cartão
                {cardBrand && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                    {getCardBrandIcon()}
                  </span>
                )}
              </Label>
              <Input
                id="cardNumber"
                type="text"
                placeholder="0000 0000 0000 0000"
                value={cardData.cardNumber}
                onChange={(e) => handleCardNumberChange(e.target.value)}
                maxLength={19}
                className={cardErrors.cardNumber ? 'border-red-500' : ''}
              />
              {cardErrors.cardNumber && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {cardErrors.cardNumber}
                </p>
              )}
            </div>

            {/* Nome do Titular */}
            <div className="space-y-2">
              <Label htmlFor="cardholderName">Nome no Cartão</Label>
              <Input
                id="cardholderName"
                type="text"
                placeholder="NOME COMO ESTÁ NO CARTÃO"
                value={cardData.cardholderName}
                onChange={(e) => setCardData(prev => ({ ...prev, cardholderName: e.target.value.toUpperCase() }))}
                className={cardErrors.cardholderName ? 'border-red-500' : ''}
              />
              {cardErrors.cardholderName && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {cardErrors.cardholderName}
                </p>
              )}
            </div>

            {/* Validade e CVV */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="expirationMonth">Mês</Label>
                <Select 
                  value={cardData.expirationMonth} 
                  onValueChange={(value) => setCardData(prev => ({ ...prev, expirationMonth: value }))}
                >
                  <SelectTrigger className={cardErrors.expirationMonth ? 'border-red-500' : ''}>
                    <SelectValue placeholder="MM" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => {
                      const month = (i + 1).toString().padStart(2, '0');
                      return <SelectItem key={month} value={month}>{month}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expirationYear">Ano</Label>
                <Select 
                  value={cardData.expirationYear} 
                  onValueChange={(value) => setCardData(prev => ({ ...prev, expirationYear: value }))}
                >
                  <SelectTrigger className={cardErrors.expirationYear ? 'border-red-500' : ''}>
                    <SelectValue placeholder="AA" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 15 }, (_, i) => {
                      const year = (new Date().getFullYear() + i).toString().slice(-2);
                      return <SelectItem key={year} value={year}>{year}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="securityCode" className="flex items-center gap-1">
                  CVV
                  <Lock className="h-3 w-3 text-muted-foreground" />
                </Label>
                <Input
                  id="securityCode"
                  type="text"
                  placeholder="123"
                  value={cardData.securityCode}
                  onChange={(e) => setCardData(prev => ({ ...prev, securityCode: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                  maxLength={4}
                  className={cardErrors.securityCode ? 'border-red-500' : ''}
                />
              </div>
            </div>
            {(cardErrors.expirationMonth || cardErrors.expirationYear || cardErrors.securityCode) && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {cardErrors.expirationMonth || cardErrors.expirationYear || cardErrors.securityCode}
              </p>
            )}

            {/* Parcelas */}
            {installmentOptions.length > 0 && (
              <div className="space-y-2">
                <Label>Parcelas</Label>
                <Select 
                  value={selectedInstallment.toString()} 
                  onValueChange={(value) => setSelectedInstallment(Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione as parcelas" />
                  </SelectTrigger>
                  <SelectContent>
                    {installmentOptions.map((option: any) => (
                      <SelectItem key={option.installments} value={option.installments.toString()}>
                        {option.installments}x de {formatCurrency(option.installment_amount)}
                        {option.installments === 1 ? ' (sem juros)' : 
                         option.installment_rate === 0 ? ' (sem juros)' : 
                         ` (total ${formatCurrency(option.total_amount)})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Botão de pagamento */}
            <Button 
              type="submit" 
              disabled={loading || !cardBrand || !cardData.expirationMonth || !cardData.expirationYear || !cardData.securityCode}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Processando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Pagar {formatCurrency(totalAmount)}
                </>
              )}
            </Button>
          </form>
        </TabsContent>
      </Tabs>

      {/* Segurança */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
        <Lock className="h-3 w-3" />
        <span>Pagamento seguro processado pelo Mercado Pago</span>
      </div>

      {/* Botão Voltar */}
      <Button 
        variant="ghost" 
        onClick={onCancel}
        disabled={loading}
        className="w-full"
      >
        Voltar
      </Button>
    </div>
  );
}
