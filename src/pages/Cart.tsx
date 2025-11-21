import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, ArrowLeft, Trash2, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { CouponInput, CouponDiscountLine } from "@/components/cart/CouponInput";
import { ProgressiveDiscountDisplay } from "@/components/cart/ProgressiveDiscountDisplay";
import PaymentModal from "@/components/modals/PaymentModal";
import { Badge } from "@/components/ui/badge";
import { CouponValidationResult } from "@/hooks/useCoupons";
import { formatCurrency } from "@/lib/utils";

const Cart = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, removeFromCart, clearCart, totalItems, totalPrice } = useCart();
  const [showPayment, setShowPayment] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidationResult | null>(null);

  // Calcular desconto progressivo
  // Verificar se TODAS as fotos do carrinho têm desconto progressivo habilitado
  const allPhotosHaveDiscountEnabled = items.length > 0 && items.every(item => item.progressive_discount_enabled === true);
  
  const progressiveDiscountPercent = allPhotosHaveDiscountEnabled
    ? (totalItems >= 10 ? 20 : totalItems >= 5 ? 10 : totalItems >= 2 ? 5 : 0)
    : 0;

  const progressiveDiscountAmount = (totalPrice * progressiveDiscountPercent) / 100;

  // Subtotal após desconto progressivo
  const subtotalAfterProgressiveDiscount = totalPrice - progressiveDiscountAmount;

  // Desconto do cupom
  const couponDiscountAmount = appliedCoupon?.valid ? appliedCoupon.discount_amount : 0;

  // Total final
  const finalTotal = Math.max(0, subtotalAfterProgressiveDiscount - couponDiscountAmount);

  useEffect(() => {
    // Redirecionar para login se não estiver autenticado
    if (!user) {
      navigate("/auth");
    }
  }, [user, navigate]);

  const handleCheckout = () => {
    if (totalItems === 0) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    setShowPayment(true);
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
              <Button onClick={handleContinueShopping} size="lg">
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

            {/* Desconto Progressivo Badge */}
            {progressiveDiscountPercent > 0 && (
              <div className="mb-4">
                <ProgressiveDiscountDisplay 
                  quantity={totalItems} 
                  unitPrice={totalPrice / totalItems}
                  compact={true}
                />
              </div>
            )}

            <div className="space-y-4">
              {items.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex gap-3 sm:gap-4">
                      <img
                        src={item.thumbnail_url || item.watermarked_url}
                        alt={item.title || "Foto"}
                        className="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 object-cover rounded-lg flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0 flex flex-col">
                        <h3 className="font-semibold text-sm sm:text-base lg:text-lg mb-1 sm:mb-2 truncate">
                          {item.title || "Foto sem título"}
                        </h3>
                        <p className="text-xl sm:text-2xl font-bold text-primary mb-2 sm:mb-4">
                          {formatCurrency(Number(item.price))}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeFromCart(item.id)}
                          className="text-destructive hover:text-destructive mt-auto"
                        >
                          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          <span className="text-xs sm:text-sm">Remover</span>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Coluna direita - Resumo e checkout */}
          <div className="space-y-4">
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
                        unitPrice={totalPrice / totalItems}
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
                  onClick={handleCheckout} 
                  className="w-full" 
                  size="lg"
                >
                  <ShoppingBag className="h-5 w-5 mr-2" />
                  Finalizar Compra
                </Button>

                <Button 
                  variant="outline" 
                  onClick={handleContinueShopping}
                  className="w-full"
                >
                  Continuar Comprando
                </Button>
              </CardContent>
            </Card>

            {/* Cupom de Desconto */}
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

      {/* Modal de Pagamento */}
      <PaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        photos={items}
        onPaymentSuccess={() => {
          clearCart();
          setShowPayment(false);
          navigate("/checkout/processando");
        }}
        appliedCoupon={appliedCoupon}
      />
    </div>
  );
};

export default Cart;
