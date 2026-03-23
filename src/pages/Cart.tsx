import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, ArrowLeft, Trash2, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { CouponInput, CouponDiscountLine } from "@/components/cart/CouponInput";
import { ProgressiveDiscountDisplay } from "@/components/cart/ProgressiveDiscountDisplay";
import { useProgressiveDiscount } from "@/hooks/useProgressiveDiscount";
import PaymentModal from "@/components/modals/PaymentModal";
import { Badge } from "@/components/ui/badge";
import { CouponValidationResult } from "@/hooks/useCoupons";
import { formatCurrency } from "@/lib/utils";
import AntiScreenshotProtection from "@/components/security/AntiScreenshotProtection";
import WatermarkedPhoto from "@/components/WatermarkedPhoto";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Cart = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const haptic = useHapticFeedback();
  const { toast } = useToast();
  const { items, removeFromCart, clearCart, totalItems, totalPrice } = useCart();
  const [showPayment, setShowPayment] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidationResult | null>(null);
  const [processingFree, setProcessingFree] = useState(false);

  // Calcular desconto progressivo
  // IMPORTANTE: Se pelo menos UMA foto do carrinho tem desconto progressivo habilitado,
  // aplicamos o desconto para TODAS as fotos do carrinho (comportamento padrão de e-commerce)
  // Tratamos undefined e null como TRUE (habilitado por padrão) para compatibilidade
  const hasDiscountEnabled = items.length > 0 && items.every(item => 
    item.progressive_discount_enabled !== false // Apenas FALSE desabilita explicitamente
  );
  
  // Calcular preço médio por foto
  const averagePrice = totalItems > 0 ? totalPrice / totalItems : 0;
  
  // Usar o hook para calcular o desconto
  const progressiveDiscount = useProgressiveDiscount(totalItems, averagePrice, hasDiscountEnabled);
  
  const progressiveDiscountAmount = progressiveDiscount.discountAmount;
  const progressiveDiscountPercent = progressiveDiscount.discountPercentage;

  // Subtotal após desconto progressivo
  const subtotalAfterProgressiveDiscount = progressiveDiscount.total;

  // Desconto do cupom
  const couponDiscountAmount = appliedCoupon?.valid ? appliedCoupon.discount_amount : 0;

  // Total final
  const finalTotal = Math.max(0, subtotalAfterProgressiveDiscount - couponDiscountAmount);

  // Não redirecionar automaticamente - deixar usuário ver carrinho mesmo deslogado
  // O redirecionamento acontece apenas ao tentar finalizar a compra

  const handleCheckout = async () => {
    if (totalItems === 0) return;
    if (!user) {
      navigate("/auth");
      return;
    }

    // Se o total é R$0 (cupom 100%), fazer compra gratuita direto
    if (finalTotal <= 0) {
      await handleFreeCheckout();
      return;
    }

    setShowPayment(true);
  };

  const handleFreeCheckout = async () => {
    if (processingFree) return;
    setProcessingFree(true);

    try {
      // Chamar edge function com action especial para compra gratuita
      const { data, error } = await supabase.functions.invoke('mercadopago-checkout', {
        body: {
          action: 'free_purchase',
          photos: items.map(item => ({
            id: item.id,
            title: item.title || 'Foto',
            price: Number(item.price),
          })),
          buyer: { email: user.email, cpf: '00000000000' },
          discount: progressiveDiscountPercent > 0 ? {
            percentage: progressiveDiscountPercent,
            amount: progressiveDiscountAmount,
          } : null,
          coupon: appliedCoupon?.valid ? {
            coupon_id: appliedCoupon.coupon_id,
            code: appliedCoupon.code || '',
            amount: appliedCoupon.discount_amount,
          } : null,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast({ title: "✅ Compra gratuita realizada!", description: "Suas fotos já estão disponíveis." });
        clearCart();
        navigate('/dashboard/purchases');
      } else {
        throw new Error(data?.error || 'Erro ao processar compra gratuita');
      }
    } catch (err: any) {
      console.error('Erro na compra gratuita:', err);
      toast({ title: "Erro", description: err.message || "Erro ao processar compra gratuita", variant: "destructive" });
    } finally {
      setProcessingFree(false);
    }
  };

  const handleContinueShopping = () => {
    navigate("/events");
  };

  const handleCouponApplied = (result: CouponValidationResult) => {
    setAppliedCoupon(result);
  };

  const handleCouponRemoved = () => {
    setAppliedCoupon(null);
  };

  // Se não houver itens no carrinho
  if (totalItems === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container mx-auto px-4 py-12">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>

          <Card className="max-w-2xl mx-auto">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="bg-muted rounded-full p-6 mb-6">
                <ShoppingCart className="h-16 w-16 text-muted-foreground" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Seu carrinho está vazio</h2>
              <p className="text-muted-foreground mb-8">
                Adicione fotos ao carrinho para continuar com a compra
              </p>
              <Button onClick={handleContinueShopping} size="lg" className="min-h-[44px]">
                <ShoppingBag className="h-5 w-5 mr-2" />
                Explorar Eventos
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 pb-32 lg:pb-0">
      <div className="container mx-auto px-4 py-6 sm:py-12">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-4 sm:mb-6 min-h-[44px]"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Coluna esquerda - Lista de itens */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold mb-2">Carrinho de Compras</h1>
                <p className="text-sm sm:text-base text-muted-foreground">
                  {totalItems} {totalItems === 1 ? 'foto selecionada' : 'fotos selecionadas'}
                </p>
              </div>
              <Button 
                variant="outline" 
                onClick={clearCart}
                className="text-destructive hover:text-destructive w-full sm:w-auto"
                size="sm"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Limpar Carrinho
              </Button>
            </div>

            {/* Cupom de Desconto - Mobile (acima dos itens) */}
            <div className="lg:hidden mb-4">
              <CouponInput
                purchaseAmount={subtotalAfterProgressiveDiscount}
                onCouponApplied={handleCouponApplied}
                onCouponRemoved={handleCouponRemoved}
                appliedCoupon={appliedCoupon}
              />
            </div>

            {/* Desconto Progressivo Badge */}
            {progressiveDiscountPercent > 0 && (
              <div className="mb-4">
                <ProgressiveDiscountDisplay 
                  quantity={totalItems} 
                  unitPrice={averagePrice}
                  isEnabled={hasDiscountEnabled}
                  compact={true}
                />
              </div>
            )}

            <div className="space-y-4">
              {items.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-2 sm:p-4">
                    <div className="flex gap-2 sm:gap-4 items-center">
                      <AntiScreenshotProtection>
                        <div className="w-14 h-14 sm:w-24 sm:h-24 md:w-32 md:h-32 flex-shrink-0">
                          <WatermarkedPhoto
                            src={item.watermarked_url}
                            alt={item.title || "Foto"}
                            imgClassName="w-full h-full object-cover rounded-lg"
                          />
                        </div>
                      </AntiScreenshotProtection>
                      <div className="flex-1 min-w-0 flex flex-row sm:flex-col items-center sm:items-start gap-1 sm:gap-0">
                        <h3 className="font-semibold text-xs sm:text-base lg:text-lg truncate">
                          {item.title || "Foto sem título"}
                        </h3>
                        <p className="text-sm sm:text-2xl font-bold text-primary sm:mb-4">
                          {formatCurrency(Number(item.price))}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          haptic.light();
                          removeFromCart(item.id);
                        }}
                        className="text-destructive hover:text-destructive flex-shrink-0 h-9 w-9 sm:h-10 sm:w-10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Coluna direita - Resumo e checkout (desktop) */}
          <div className="hidden lg:block space-y-4">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Resumo do Pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Subtotal */}
                <div className="flex justify-between text-lg">
                  <span>Subtotal ({totalItems} {totalItems === 1 ? 'foto' : 'fotos'})</span>
                  <span className="font-semibold">{formatCurrency(totalPrice)}</span>
                </div>

                {/* Desconto Progressivo */}
                {progressiveDiscountPercent > 0 && (
                  <>
                    <Separator />
                    <div className="flex justify-between items-center text-green-600 dark:text-green-400">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">Desconto Progressivo</span>
                        <Badge variant="secondary" className="text-xs">
                          {progressiveDiscountPercent}% OFF
                        </Badge>
                      </div>
                      <span className="font-semibold">-{formatCurrency(progressiveDiscountAmount)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <ProgressiveDiscountDisplay 
                        quantity={totalItems} 
                        unitPrice={averagePrice}
                        isEnabled={hasDiscountEnabled}
                        showIncentive={true}
                        compact={true}
                      />
                    </div>
                  </>
                )}

                {/* Linha de desconto do cupom */}
                {appliedCoupon && (
                  <>
                    <Separator />
                    <CouponDiscountLine appliedCoupon={appliedCoupon} />
                  </>
                )}

                <Separator />

                {/* Total Final */}
                <div className="flex justify-between text-xl sm:text-2xl font-bold">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(finalTotal)}</span>
                </div>

                {/* Economia total */}
                {(progressiveDiscountAmount > 0 || couponDiscountAmount > 0) && (
                  <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                    <p className="text-sm text-green-900 dark:text-green-100 font-medium">
                      🎉 Você está economizando {formatCurrency(progressiveDiscountAmount + couponDiscountAmount)}!
                    </p>
                  </div>
                )}

                <Separator />

                <Button 
                  onClick={() => {
                    haptic.medium();
                    handleCheckout();
                  }}
                  className="w-full min-h-[44px]" 
                  size="lg"
                >
                  <ShoppingBag className="h-5 w-5 mr-2" />
                  Finalizar Compra
                </Button>

                <Button 
                  variant="outline" 
                  onClick={handleContinueShopping}
                  className="w-full min-h-[44px]"
                >
                  Continuar Comprando
                </Button>
              </CardContent>
            </Card>

            {/* Cupom de Desconto - Desktop */}
            <CouponInput
              purchaseAmount={subtotalAfterProgressiveDiscount}
              onCouponApplied={handleCouponApplied}
              onCouponRemoved={handleCouponRemoved}
              appliedCoupon={appliedCoupon}
            />

            {/* Informações adicionais */}
            <Card>
              <CardContent className="p-4 space-y-2 text-sm text-muted-foreground">
                <p>✅ Fotos em alta resolução</p>
                <p>✅ Download ilimitado</p>
                <p>✅ Sem marca d'água</p>
                <p>✅ Pagamento seguro via Mercado Pago</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Barra fixa no mobile para finalizar compra */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 lg:hidden z-50 shadow-lg">
        <div className="container mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-muted-foreground">{totalItems} {totalItems === 1 ? 'foto' : 'fotos'}</p>
              {progressiveDiscountPercent > 0 && (
                <p className="text-xs text-green-600 dark:text-green-400">
                  {progressiveDiscountPercent}% de desconto aplicado
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-primary">{formatCurrency(finalTotal)}</p>
              {progressiveDiscountAmount > 0 && (
                <p className="text-xs text-muted-foreground line-through">{formatCurrency(totalPrice)}</p>
              )}
            </div>
          </div>
          <Button 
            onClick={() => {
              haptic.medium();
              handleCheckout();
            }}
            className="w-full min-h-[48px]" 
            size="lg"
          >
            <ShoppingBag className="h-5 w-5 mr-2" />
            Finalizar Compra
          </Button>
        </div>
      </div>

      {/* Modal de Pagamento */}
      <PaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        photos={items}
        onPaymentSuccess={(paymentData) => {
          clearCart();
          setShowPayment(false);
          // O PaymentModal já lida com o redirecionamento internamente
          // Não precisamos fazer nada aqui - o modal navega para /checkout/processando com ref
        }}
        appliedCoupon={appliedCoupon}
      />
    </div>
  );
};

export default Cart;
