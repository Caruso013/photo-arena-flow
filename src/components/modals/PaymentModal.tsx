import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveModal, ResponsiveModalHeader, ResponsiveModalTitle, ResponsiveModalDescription } from '@/components/ui/responsive-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { MaskedInput, masks, validateCPF } from '@/components/ui/masked-input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { CreditCard, Loader2, ShoppingCart, ArrowLeft, AlertCircle, Percent, Tag } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useProgressiveDiscount, getNextDiscountThreshold } from '@/hooks/useProgressiveDiscount';
import TransparentCheckout from '@/components/checkout/TransparentCheckout';

declare global {
  interface Window {
    MercadoPago: any;
  }
}

interface Photo {
  id: string;
  title?: string;
  price?: number;
  image_url?: string;
  watermarked_url?: string;
  thumbnail_url?: string;
  campaign_id?: string;
  progressive_discount_enabled?: boolean;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  photo?: Photo; // Single photo (backwards compatibility)
  photos?: Photo[]; // Multiple photos (cart)
  onPaymentSuccess?: (paymentData: any) => void;
  appliedCoupon?: any; // Optional coupon validation result
  eventTitle?: string;
}

export default function PaymentModal({ 
  isOpen, 
  onClose, 
  photo, 
  photos,
  onPaymentSuccess,
  appliedCoupon,
  eventTitle,
}: PaymentModalProps) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const checkoutContainerRef = useRef<HTMLDivElement>(null);
  const [buyerData, setBuyerData] = useState({
    name: user?.user_metadata?.full_name?.split(' ')[0] || '',
    surname: user?.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
    email: user?.email || '',
    phone: '',
    document: '',
  });
  
  // Estado para controlar checkout transparente (novo) vs checkout pro (antigo)
  const [useTransparentCheckout, setUseTransparentCheckout] = useState(true);
  const [campaignTitles, setCampaignTitles] = useState<Record<string, string>>({});

  // Bloquear organizações de fazer compras
  useEffect(() => {
    const role = profile?.role;
    if (isOpen && role === 'organization') {
      toast({
        title: "Ação não permitida",
        description: "Organizações não podem comprar fotos.",
        variant: "destructive",
      });
      onClose();
    }
  }, [isOpen, profile?.role]);

  // Support both single photo and multiple photos (cart)
  const itemsToProcess = photos && photos.length > 0 ? photos : (photo ? [photo] : []);
  const subtotal = itemsToProcess.reduce((sum, item) => sum + (item.price || 0), 0);
  const totalItems = itemsToProcess.length;
  
  // Verificar se desconto progressivo está habilitado (todas as fotos precisam permitir)
  const progressiveDiscountEnabled = itemsToProcess.length > 0 &&
    itemsToProcess.every(item => item.progressive_discount_enabled !== false);
  
  // Calcular preço médio por foto
  const averagePrice = totalItems > 0 ? subtotal / totalItems : 0;
  
  // Usar hook de desconto progressivo
  const progressiveDiscount = useProgressiveDiscount(
    totalItems,
    averagePrice,
    progressiveDiscountEnabled
  );

  // Preço final com desconto aplicado
  const totalPrice = progressiveDiscount.total;
  const finalAmountForCheckout = Number(
    Math.max(0, totalPrice - (appliedCoupon?.discount_amount || 0)).toFixed(2)
  );
  
  // Próximo threshold de desconto
  const nextThreshold = getNextDiscountThreshold(totalItems);
  const campaignIdsKey = itemsToProcess
    .map((item) => item.campaign_id)
    .filter((campaignId): campaignId is string => Boolean(campaignId))
    .join(',');

  useEffect(() => {
    const campaignIds = Array.from(
      new Set(
        itemsToProcess
          .map((item) => item.campaign_id)
          .filter((campaignId): campaignId is string => Boolean(campaignId))
      )
    );

    if (campaignIds.length === 0) {
      setCampaignTitles({});
      return;
    }

    let active = true;

    const loadCampaignTitles = async () => {
      const { data } = await supabase
        .from('campaigns')
        .select('id, title')
        .in('id', campaignIds);

      if (!active) return;

      const titleMap = (data || []).reduce<Record<string, string>>((acc, campaign) => {
        acc[campaign.id] = campaign.title || 'Evento';
        return acc;
      }, {});

      setCampaignTitles(titleMap);
    };

    loadCampaignTitles();

    return () => {
      active = false;
    };
  }, [campaignIdsKey]);

  const getItemEventTitle = (item: Photo) => {
    if (item.campaign_id && campaignTitles[item.campaign_id]) {
      return campaignTitles[item.campaign_id];
    }

    return eventTitle || 'Evento';
  };

  const handleInputChange = (field: string, value: string) => {
    // Só remove caracteres não-numéricos para campos numéricos (phone e document)
    if (field === 'phone' || field === 'document') {
      const cleanValue = value.replace(/\D/g, '');
      setBuyerData(prev => ({ ...prev, [field]: cleanValue }));
    } else if (field === 'name' || field === 'surname') {
      // Para nome e sobrenome, apenas limpa espaços extras e mantém letras
      const cleanValue = value.replace(/\s+/g, ' ').trimStart();
      setBuyerData(prev => ({ ...prev, [field]: cleanValue }));
    } else if (field === 'email') {
      // Para email, apenas trim e lowercase
      setBuyerData(prev => ({ ...prev, [field]: value.trim().toLowerCase() }));
    } else {
      setBuyerData(prev => ({ ...prev, [field]: value }));
    }
  };

  const isFormValid = () => {
    return buyerData.name.length >= 2 && 
           buyerData.surname.length >= 2 && 
           buyerData.email.includes('@') && 
           (buyerData.phone.length === 10 || buyerData.phone.length === 11) && 
           buyerData.document.length === 11 &&
           validateCPF(buyerData.document); // Validar CPF
  };

  useEffect(() => {
    if (showCheckout && preferenceId && checkoutContainerRef.current && window.MercadoPago) {
      const mp = new window.MercadoPago('APP_USR-d5f88e87-7622-412c-b0af-da8b7aee664b', {
        locale: 'pt-BR'
      });

      mp.checkout({
        preference: {
          id: preferenceId
        },
        render: {
          container: '.cho-container',
          label: 'Pagar',
        },
        theme: {
          elementsColor: '#4f46e5',
          headerColor: '#4f46e5',
        }
      });
    }
  }, [showCheckout, preferenceId]);

  const handlePayment = async () => {
    if (!user) {
      toast({
        title: "Sessão expirada",
        description: "Faça login novamente para finalizar a compra.",
        variant: "destructive",
      });
      handleModalClose();
      navigate('/auth');
      return;
    }

    if (itemsToProcess.length === 0 || !isFormValid()) {
      toast({
        title: "Dados incompletos",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    if (finalAmountForCheckout <= 0) {
      toast({
        title: "Compra bloqueada",
        description: "Não é permitido finalizar compra com valor R$ 0,00.",
        variant: "destructive",
      });
      return;
    }

    // Com checkout transparente, só avançar para o formulário de cartão
    if (useTransparentCheckout) {
      setShowCheckout(true);
      return;
    }

    // Checkout antigo (redirect para MP) - mantido como fallback
    setLoading(true);

    try {
      // Garantir que os dados estejam limpos antes de enviar
      const buyerInfo = {
        name: buyerData.name.trim(),
        surname: buyerData.surname.trim(),
        email: buyerData.email.trim().toLowerCase(),
        phone: buyerData.phone.replace(/\D/g, ''),
        document: buyerData.document.replace(/\D/g, ''),
      };

      const { data, error } = await supabase.functions.invoke('create-payment-preference', {
        body: {
          photos: itemsToProcess.map(p => ({
            id: p.id,
            title: p.title || 'Foto',
            price: p.price || 0,
          })),
          buyerInfo,
          campaignId: 'cart-purchase',
          // Enviar informações do desconto progressivo
          progressiveDiscount: progressiveDiscountEnabled && progressiveDiscount.discountPercentage > 0 ? {
            enabled: true,
            percentage: progressiveDiscount.discountPercentage,
            amount: progressiveDiscount.discountAmount,
            subtotal: subtotal,
            total: totalPrice
          } : null
        },
      });

      if (error) throw error;

      if (data.success && data.preference_id) {
        setPreferenceId(data.preference_id);
        setShowCheckout(true);
      } else {
        throw new Error(data.error || 'Erro ao criar preferência de pagamento');
      }
    } catch (error) {
      console.error('Erro no pagamento:', error);
      toast({
        title: "Erro no pagamento",
        description: "Não foi possível processar o pagamento. Verifique seus dados e tente novamente. Se o problema persistir, entre em contato: contato@stafotos.com",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setShowCheckout(false);
    setPreferenceId(null);
  };

  const handleModalClose = () => {
    setShowCheckout(false);
    setPreferenceId(null);
    onClose();
  };

  return (
    <ResponsiveModal open={isOpen} onOpenChange={handleModalClose} className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
      <ResponsiveModalHeader>
        <ResponsiveModalTitle className="flex items-center gap-2">
          {showCheckout && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleBack}
              className="mr-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <ShoppingCart className="h-5 w-5" />
          {showCheckout ? 'Pagamento' : 'Comprar Foto'}
        </ResponsiveModalTitle>
        <ResponsiveModalDescription>
          {showCheckout 
            ? 'Complete o pagamento no formulário abaixo'
            : 'Complete seus dados para prosseguir com o pagamento via Mercado Pago'
          }
        </ResponsiveModalDescription>
      </ResponsiveModalHeader>

        {!showCheckout ? (
          <div className="space-y-6">
            <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg">
              <p className="text-sm text-foreground">
                <strong>Passo 1 de 2:</strong> Preencha seus dados e clique em "Continuar" para ir ao pagamento seguro do Mercado Pago.
              </p>
            </div>

            {totalItems === 1 ? (
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Resumo</div>
                <div className="space-y-1">
                  <div className="text-sm">
                    <span className="font-medium text-muted-foreground">Evento:</span>{' '}
                    <span>{getItemEventTitle(itemsToProcess[0])}</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium text-muted-foreground">Foto:</span>{' '}
                    <span>{itemsToProcess[0].title || 'Sem título'}</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium text-muted-foreground">Valor:</span>{' '}
                    <span className="font-semibold text-primary">{formatCurrency(totalPrice)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">Resumo do carrinho</h4>
                  <span className="text-sm text-muted-foreground">{totalItems} fotos</span>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {itemsToProcess.map((item, index) => (
                    <div key={index} className="p-3 bg-muted rounded space-y-1">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">
                        {getItemEventTitle(item)}
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{item.title || 'Sem título'}</p>
                          <p className="text-xs text-muted-foreground">Foto</p>
                        </div>
                        <p className="text-sm font-semibold text-primary whitespace-nowrap">
                          {formatCurrency(item.price || 0)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Resumo de preços com desconto progressivo */}
                <div className="pt-3 border-t border-border space-y-2">
                  {/* Subtotal */}
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Subtotal ({totalItems} fotos):</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  
                  {/* Desconto Progressivo */}
                  {progressiveDiscountEnabled && progressiveDiscount.discountPercentage > 0 && (
                    <div className="flex justify-between items-center text-sm text-green-600">
                      <span className="flex items-center gap-1">
                        <Percent className="h-3 w-3" />
                        Desconto ({progressiveDiscount.discountPercentage}%):
                      </span>
                      <span>-{formatCurrency(progressiveDiscount.discountAmount)}</span>
                    </div>
                  )}

                  {/* Desconto do Cupom */}
                  {appliedCoupon?.valid && appliedCoupon.discount_amount > 0 && (
                    <div className="flex justify-between items-center text-sm text-green-600">
                      <span className="flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        Cupom:
                      </span>
                      <span>-{formatCurrency(appliedCoupon.discount_amount)}</span>
                    </div>
                  )}
                  
                  {/* Incentivo para próximo desconto */}
                  {progressiveDiscountEnabled && nextThreshold && progressiveDiscount.discountPercentage === 0 && (
                    <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-2 text-xs text-blue-700 dark:text-blue-400 flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      Adicione mais {nextThreshold.threshold - totalItems} foto(s) para ganhar {nextThreshold.percentage}% de desconto!
                    </div>
                  )}
                  
                  {/* Mensagem de desconto aplicado */}
                  {progressiveDiscountEnabled && progressiveDiscount.discountPercentage > 0 && (
                    <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-2 text-xs text-green-700 dark:text-green-400 flex items-center gap-1">
                      <Percent className="h-3 w-3" />
                      🎉 Desconto de {progressiveDiscount.discountPercentage}% aplicado!
                    </div>
                  )}
                  
                  {/* Total Final */}
                  <div className="flex justify-between items-center pt-2 border-t border-border">
                    <span className="font-bold">Total:</span>
                     <span className="text-2xl font-bold text-primary">
                       {formatCurrency(finalAmountForCheckout)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <Separator />

            <div className="space-y-4">
              <h4 className="font-medium">Dados do comprador</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    value={buyerData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Seu primeiro nome"
                    className="min-h-[48px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="surname">Sobrenome *</Label>
                  <Input
                    id="surname"
                    value={buyerData.surname}
                    onChange={(e) => handleInputChange('surname', e.target.value)}
                    placeholder="Seu sobrenome"
                    className="min-h-[48px]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail *</Label>
                <Input
                  id="email"
                  type="email"
                  value={buyerData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="seu@email.com"
                  className="min-h-[48px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone *</Label>
                <MaskedInput
                  id="phone"
                  mask={masks.phone}
                  value={buyerData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="(11) 99999-9999"
                  className={`min-h-[48px] ${buyerData.phone && buyerData.phone.length < 10 ? 'border-destructive' : ''}`}
                />
                {buyerData.phone && buyerData.phone.length < 10 && (
                  <p className="text-sm text-muted-foreground">
                    {buyerData.phone.length}/{buyerData.phone.length > 10 ? '11' : '10'} dígitos
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="document">CPF *</Label>
                <MaskedInput
                  id="document"
                  mask={masks.cpf}
                  value={buyerData.document}
                  onChange={(e) => handleInputChange('document', e.target.value)}
                  placeholder="000.000.000-00"
                  className={`min-h-[48px] ${
                    buyerData.document && buyerData.document.length === 11 && validateCPF(buyerData.document)
                      ? 'border-green-500 focus:ring-green-500'
                      : buyerData.document && (buyerData.document.length < 11 || !validateCPF(buyerData.document))
                        ? 'border-destructive'
                        : ''
                  }`}
                />
                {buyerData.document && buyerData.document.length === 11 && validateCPF(buyerData.document) && (
                  <div className="flex items-center gap-1 text-sm text-green-600">
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>CPF válido</span>
                  </div>
                )}
                {buyerData.document && buyerData.document.length === 11 && !validateCPF(buyerData.document) && (
                  <div className="flex items-center gap-1 text-sm text-destructive">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>CPF inválido - verifique os números</span>
                  </div>
                )}
                {buyerData.document && buyerData.document.length < 11 && (
                  <p className="text-sm text-muted-foreground">
                    {buyerData.document.length}/11 dígitos
                  </p>
                )}
              </div>
            </div>

            <Separator />

            <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="h-4 w-4 text-primary" />
                <span className="font-medium text-foreground">Pagamento Seguro via Mercado Pago</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>✓ Cartão de crédito ou débito</li>
                <li>✓ PIX (aprovação instantânea)</li>
                <li>✓ Boleto bancário</li>
                <li>✓ Seus dados estão protegidos</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleModalClose} className="flex-1 min-h-[48px]">
                Cancelar
              </Button>
              <Button 
                onClick={handlePayment} 
                disabled={!isFormValid() || loading || finalAmountForCheckout <= 0}
                className="flex-1 min-h-[48px] text-base font-semibold"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-5 w-5 mr-2" />
                    Ir para Pagamento
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {useTransparentCheckout ? (
              /* Checkout Transparente - Formulário de cartão no site */
              <TransparentCheckout
                photos={itemsToProcess.map(p => ({
                  id: p.id,
                  title: p.title,
                  price: p.price,
                }))}
                buyerInfo={{
                  name: buyerData.name,
                  surname: buyerData.surname,
                  email: buyerData.email,
                  phone: buyerData.phone,
                  document: buyerData.document,
                }}
                totalAmount={finalAmountForCheckout}
                progressiveDiscount={progressiveDiscountEnabled && progressiveDiscount.discountPercentage > 0 ? {
                  enabled: true,
                  percentage: progressiveDiscount.discountPercentage,
                  amount: progressiveDiscount.discountAmount,
                  subtotal: subtotal,
                  total: totalPrice,
                } : null}
                appliedCoupon={appliedCoupon ? {
                  couponId: appliedCoupon.coupon_id || appliedCoupon.id,
                  code: appliedCoupon.code,
                  discountAmount: appliedCoupon.discount_amount || 0,
                  discountPercentage: appliedCoupon.discount_percentage,
                } : null}
                onSuccess={(paymentData) => {
                  toast({
                    title: "✅ Pagamento processado!",
                    description: paymentData.status === 'pending' 
                      ? "Aguardando confirmação do pagamento..." 
                      : "Redirecionando para suas fotos...",
                  });
                  if (onPaymentSuccess) {
                    onPaymentSuccess(paymentData);
                  }
                  handleModalClose();
                  
                  // Se temos purchase_ids, ir para página de processamento para garantir
                  // que o webhook processou tudo corretamente antes de mostrar as fotos
                  const purchaseIds = paymentData.purchase_ids || paymentData.purchaseIds || [];
                  
                  if (purchaseIds.length > 0) {
                    // PIX pendente ou cartão aprovado - ir para processamento para confirmar
                    if (paymentData.status === 'pending' || paymentData.status === 'approved') {
                      navigate(`/checkout/processando?ref=${purchaseIds.join(',')}`);
                    } else {
                      // Status já final (completed pelo backend) - ir direto para compras
                      setTimeout(() => {
                        navigate('/dashboard/purchases');
                      }, 1000);
                    }
                  } else {
                    // Fallback: ir para minhas compras
                    setTimeout(() => {
                      navigate('/dashboard/purchases');
                    }, 1500);
                  }
                }}
                onError={(error) => {
                  // Determinar tipo de erro para mensagem mais clara
                  let title = "Erro no pagamento";
                  let description = error;

                  if (error.toLowerCase().includes('sessão') || error.toLowerCase().includes('login') || error.toLowerCase().includes('autentica')) {
                    title = "Sessão expirada";
                    description = "Faça login novamente para concluir sua compra.";
                    handleModalClose();
                    navigate('/auth');
                  }
                  
                  if (error.includes('CPF') || error.includes('documento')) {
                    title = "CPF inválido";
                    description = "Por favor, verifique o número do CPF informado.";
                  } else if (error.includes('cartão') || error.includes('card')) {
                    title = "Problema com o cartão";
                    description = "Verifique os dados do cartão ou tente outro método de pagamento.";
                  } else if (error.includes('valor') || error.includes('limite') || error.includes('amount')) {
                    title = "Valor muito alto";
                    description = "Para valores altos, recomendamos usar PIX.";
                  } else if (error.includes('recusado') || error.includes('rejected')) {
                    title = "Pagamento recusado";
                    description = "Seu banco recusou a transação. Tente outro cartão ou use PIX.";
                  } else if (error.includes('network') || error.includes('timeout')) {
                    title = "Erro de conexão";
                    description = "Verifique sua conexão e tente novamente.";
                  }
                  
                  toast({
                    title: title,
                    description: description,
                    variant: "destructive",
                  });
                }}
                onCancel={handleBack}
              />
            ) : (
              /* Checkout Pro antigo - Widget do MP (fallback) */
              <>
                <div className="bg-success/10 border border-success/20 p-4 rounded-lg">
                  <p className="text-sm text-foreground mb-2">
                    <strong>Passo 2 de 2:</strong> Complete o pagamento usando o formulário abaixo
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Use PIX para aprovação instantânea</li>
                    <li>• Após o pagamento, você receberá um e-mail de confirmação</li>
                    <li>• A foto estará disponível em "Minhas Compras"</li>
                  </ul>
                </div>

                <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">
                      {totalItems === 1 ? itemsToProcess[0].title || 'Foto' : `${totalItems} fotos`}
                    </h4>
                    {progressiveDiscountEnabled && progressiveDiscount.discountPercentage > 0 && (
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <Percent className="h-3 w-3" />
                        {progressiveDiscount.discountPercentage}% de desconto aplicado
                      </p>
                    )}
                    <p className="text-xl font-bold text-primary">
                      {formatCurrency(totalPrice)}
                    </p>
                  </div>
                </div>

                <div ref={checkoutContainerRef} className="cho-container min-h-[400px]"></div>
                
                <div className="text-center text-xs text-muted-foreground">
                  Ambiente seguro do Mercado Pago. Seus dados estão protegidos.
                </div>
              </>
            )}
          </div>
        )}
    </ResponsiveModal>
  );
}
