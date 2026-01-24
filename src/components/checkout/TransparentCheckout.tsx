import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreditCard, Lock, AlertCircle, Loader2, QrCode, Copy, CheckCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// SDK do Mercado Pago types
declare global {
  interface Window {
    MercadoPago: any;
  }
}

interface Photo {
  id: string;
  title?: string;
  price?: number;
}

interface BuyerInfo {
  name: string;
  surname: string;
  email: string;
  phone: string;
  document: string;
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

// Public Key de PRODUÇÃO do Mercado Pago
const MP_PUBLIC_KEY = 'APP_USR-26c10e70-0b3a-444f-8db6-ae325fcd3da4';

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
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card'>('pix');

  // Estado PIX
  const [pixData, setPixData] = useState<{
    qrCode: string;
    qrCodeBase64: string;
    paymentId: string;
  } | null>(null);
  const [pixCopied, setPixCopied] = useState(false);
  const [checkingPix, setCheckingPix] = useState(false);
  const pixIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Estado Cartão
  const [cardNumber, setCardNumber] = useState('');
  const [cardholderName, setCardholderName] = useState(buyerInfo.name + ' ' + buyerInfo.surname);
  const [expirationMonth, setExpirationMonth] = useState('');
  const [expirationYear, setExpirationYear] = useState('');
  const [securityCode, setSecurityCode] = useState('');
  const [cardBrand, setCardBrand] = useState<string | null>(null);
  const [installments, setInstallments] = useState<any[]>([]);
  const [selectedInstallment, setSelectedInstallment] = useState(1);
  const [issuers, setIssuers] = useState<any[]>([]);
  const [selectedIssuer, setSelectedIssuer] = useState('');

  const mpRef = useRef<any>(null);

  // Inicializar SDK do Mercado Pago
  useEffect(() => {
    const initMP = () => {
      if (window.MercadoPago) {
        try {
          mpRef.current = new window.MercadoPago(MP_PUBLIC_KEY, { locale: 'pt-BR' });
          setMpReady(true);
          console.log('✅ Mercado Pago SDK inicializado');
        } catch (error) {
          console.error('❌ Erro ao inicializar MP:', error);
          onError('Erro ao carregar sistema de pagamento');
        }
      } else {
        console.error('❌ SDK do Mercado Pago não carregado');
        onError('Sistema de pagamento não disponível');
      }
    };

    initMP();

    return () => {
      if (pixIntervalRef.current) {
        clearInterval(pixIntervalRef.current);
      }
    };
  }, []);

  // Detectar bandeira do cartão
  const handleCardNumberChange = async (value: string) => {
    const clean = value.replace(/\D/g, '');
    const formatted = clean.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
    setCardNumber(formatted);

    if (clean.length >= 6 && mpRef.current) {
      try {
        const bin = clean.substring(0, 6);
        const methods = await mpRef.current.getPaymentMethods({ bin });

        if (methods.results?.length > 0) {
          const method = methods.results[0];
          setCardBrand(method.id);

          // Buscar bancos emissores
          const issuerData = await mpRef.current.getIssuers({ paymentMethodId: method.id, bin });
          setIssuers(issuerData);
          if (issuerData.length > 0) {
            setSelectedIssuer(issuerData[0].id.toString());
          }

          // Buscar parcelas
          const installmentData = await mpRef.current.getInstallments({
            amount: totalAmount.toString(),
            bin,
            paymentTypeId: 'credit_card',
          });

          if (installmentData?.length > 0) {
            setInstallments(installmentData[0].payer_costs || []);
          }
        }
      } catch (error) {
        console.error('Erro ao detectar bandeira:', error);
      }
    } else {
      setCardBrand(null);
      setInstallments([]);
    }
  };

  // Copiar código PIX
  const handleCopyPix = async () => {
    if (pixData?.qrCode) {
      await navigator.clipboard.writeText(pixData.qrCode);
      setPixCopied(true);
      toast({ title: "Código copiado!", description: "Cole no app do seu banco." });
      setTimeout(() => setPixCopied(false), 3000);
    }
  };

  // Verificar status do PIX
  const checkPixStatus = async (paymentId: string) => {
    try {
      const { data } = await supabase.functions.invoke('mercadopago-checkout', {
        body: { action: 'check_status', paymentId },
      });

      if (data?.status === 'approved') {
        if (pixIntervalRef.current) clearInterval(pixIntervalRef.current);
        setCheckingPix(false);
        toast({ title: "✅ Pagamento confirmado!", description: "PIX aprovado com sucesso." });
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
      // Capturar Device Session ID para anti-fraude (obrigatório pelo MP)
      let deviceId = '';
      try {
        if (mpRef.current?.getDeviceSessionId) {
          deviceId = await mpRef.current.getDeviceSessionId();
        }
      } catch (e) {
        console.warn('Device ID não disponível:', e);
      }

      const { data, error } = await supabase.functions.invoke('mercadopago-checkout', {
        body: {
          action: 'create_pix',
          deviceId, // ID do dispositivo para anti-fraude
          photos: photos.map(p => ({ id: p.id, title: p.title || 'Foto', price: p.price || 0 })),
          buyer: {
            name: buyerInfo.name,
            surname: buyerInfo.surname,
            email: buyerInfo.email,
            phone: buyerInfo.phone,
            cpf: buyerInfo.document,
          },
          discount: progressiveDiscount ? {
            percentage: progressiveDiscount.percentage,
            amount: progressiveDiscount.amount,
          } : null,
        },
      });

      if (error) throw error;

      if (data.success && data.pix) {
        setPixData({
          qrCode: data.pix.qrCode,
          qrCodeBase64: data.pix.qrCodeBase64,
          paymentId: data.paymentId,
        });

        // Iniciar verificação automática
        setCheckingPix(true);
        pixIntervalRef.current = setInterval(() => {
          checkPixStatus(data.paymentId);
        }, 3000);

        toast({ title: "✅ PIX gerado!", description: "Escaneie o QR Code ou copie o código." });
      } else {
        throw new Error(data.error || 'Erro ao gerar PIX');
      }
    } catch (error: any) {
      console.error('Erro PIX:', error);
      toast({ title: "Erro ao gerar PIX", description: error.message, variant: "destructive" });
      onError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Pagar com Cartão
  const handleCardPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!mpRef.current || !cardBrand) {
      toast({ title: "Preencha os dados do cartão", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      const cleanCardNumber = cardNumber.replace(/\s/g, '');
      const fullYear = expirationYear.length === 2 ? '20' + expirationYear : expirationYear;

      // Capturar Device Session ID para anti-fraude
      let deviceId = '';
      try {
        if (mpRef.current?.getDeviceSessionId) {
          deviceId = await mpRef.current.getDeviceSessionId();
        }
      } catch (e) {
        console.warn('Device ID não disponível:', e);
      }

      // Gerar token do cartão
      const tokenData = await mpRef.current.createCardToken({
        cardNumber: cleanCardNumber,
        cardholderName,
        cardExpirationMonth: expirationMonth,
        cardExpirationYear: fullYear,
        securityCode,
        identificationType: 'CPF',
        identificationNumber: buyerInfo.document.replace(/\D/g, ''),
      });

      if (tokenData.error) throw new Error(tokenData.error);

      // Enviar para backend
      const { data, error } = await supabase.functions.invoke('mercadopago-checkout', {
        body: {
          action: 'create_card',
          deviceId, // ID do dispositivo para anti-fraude
          cardToken: tokenData.id,
          cardPaymentMethodId: cardBrand,
          cardIssuerId: selectedIssuer,
          installments: selectedInstallment,
          photos: photos.map(p => ({ id: p.id, title: p.title || 'Foto', price: p.price || 0 })),
          buyer: {
            name: buyerInfo.name,
            surname: buyerInfo.surname,
            email: buyerInfo.email,
            phone: buyerInfo.phone,
            cpf: buyerInfo.document,
          },
          discount: progressiveDiscount ? {
            percentage: progressiveDiscount.percentage,
            amount: progressiveDiscount.amount,
          } : null,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast({ title: "✅ Pagamento aprovado!", description: "Compra realizada com sucesso." });
        onSuccess(data);
      } else if (data.status === 'rejected') {
        toast({ title: "Pagamento recusado", description: "Tente outro cartão ou use PIX.", variant: "destructive" });
        onError('Pagamento recusado');
      } else if (data.status === 'pending' || data.status === 'in_process') {
        toast({ title: "Pagamento em análise", description: "Você será notificado quando for aprovado." });
        onSuccess(data);
      } else {
        throw new Error(data.error || 'Erro no pagamento');
      }
    } catch (error: any) {
      console.error('Erro cartão:', error);
      toast({ title: "Erro no pagamento", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!mpReady) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Carregando...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">{photos.length} foto(s)</span>
            <span className="text-lg font-bold">{formatCurrency(totalAmount)}</span>
          </div>
          {progressiveDiscount && progressiveDiscount.percentage > 0 && (
            <div className="text-xs text-green-600 mt-1">
              {progressiveDiscount.percentage}% de desconto aplicado
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs de Pagamento */}
      <Tabs value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as 'pix' | 'card')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pix" className="flex items-center gap-2">
            <QrCode className="h-4 w-4" /> PIX
          </TabsTrigger>
          <TabsTrigger value="card" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" /> Cartão
          </TabsTrigger>
        </TabsList>

        {/* PIX */}
        <TabsContent value="pix" className="space-y-4">
          {!pixData ? (
            <>
              <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4 text-sm">
                <div className="flex items-center gap-2 font-medium text-green-700 dark:text-green-400 mb-2">
                  <QrCode className="h-4 w-4" /> Pagamento instantâneo via PIX
                </div>
                <ul className="text-green-600 dark:text-green-500 space-y-1 text-xs">
                  <li>✓ Aprovação em segundos</li>
                  <li>✓ Disponível 24h</li>
                  <li>✓ Sem taxas adicionais</li>
                </ul>
              </div>

              <Button onClick={handleGeneratePix} disabled={loading} className="w-full bg-[#32BCAD] hover:bg-[#2aa89b]">
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <QrCode className="h-4 w-4 mr-2" />}
                Gerar QR Code PIX
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <img
                  src={`data:image/png;base64,${pixData.qrCodeBase64}`}
                  alt="QR Code PIX"
                  className="mx-auto w-48 h-48 border rounded-lg"
                />
              </div>

              <div className="bg-muted p-3 rounded-lg">
                <Label className="text-xs text-muted-foreground">Código PIX (copiar e colar)</Label>
                <div className="flex gap-2 mt-1">
                  <Input value={pixData.qrCode} readOnly className="text-xs font-mono" />
                  <Button variant="outline" size="icon" onClick={handleCopyPix}>
                    {pixCopied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {checkingPix && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Aguardando confirmação do pagamento...
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* Cartão */}
        <TabsContent value="card">
          <form onSubmit={handleCardPayment} className="space-y-4">
            <div className="space-y-2">
              <Label>Número do Cartão</Label>
              <div className="relative">
                <Input
                  value={cardNumber}
                  onChange={(e) => handleCardNumberChange(e.target.value)}
                  placeholder="0000 0000 0000 0000"
                  maxLength={19}
                />
                {cardBrand && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs bg-primary/10 px-2 py-1 rounded">
                    {cardBrand.toUpperCase()}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nome no Cartão</Label>
              <Input
                value={cardholderName}
                onChange={(e) => setCardholderName(e.target.value.toUpperCase())}
                placeholder="NOME COMO ESTÁ NO CARTÃO"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Mês</Label>
                <Input
                  value={expirationMonth}
                  onChange={(e) => setExpirationMonth(e.target.value.replace(/\D/g, '').slice(0, 2))}
                  placeholder="MM"
                  maxLength={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Ano</Label>
                <Input
                  value={expirationYear}
                  onChange={(e) => setExpirationYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="AA"
                  maxLength={4}
                />
              </div>
              <div className="space-y-2">
                <Label>CVV</Label>
                <Input
                  value={securityCode}
                  onChange={(e) => setSecurityCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="123"
                  maxLength={4}
                  type="password"
                />
              </div>
            </div>

            {installments.length > 0 && (
              <div className="space-y-2">
                <Label>Parcelas</Label>
                <Select value={selectedInstallment.toString()} onValueChange={(v) => setSelectedInstallment(Number(v))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {installments.map((inst: any) => (
                      <SelectItem key={inst.installments} value={inst.installments.toString()}>
                        {inst.installments}x de {formatCurrency(inst.installment_amount)}
                        {inst.installment_rate > 0 && ` (${inst.installment_rate}% juros)`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button type="submit" disabled={loading || !cardBrand} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CreditCard className="h-4 w-4 mr-2" />}
              Pagar {formatCurrency(totalAmount)}
            </Button>
          </form>
        </TabsContent>
      </Tabs>

      {/* Botão Cancelar */}
      <Button variant="ghost" onClick={onCancel} className="w-full">
        Voltar
      </Button>

      {/* Rodapé */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
        <Lock className="h-3 w-3" />
        <span>Pagamento seguro processado pelo Mercado Pago</span>
      </div>
    </div>
  );
}
