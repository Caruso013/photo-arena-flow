import { ShoppingCart, Trash2, X, Percent, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useCart } from "@/contexts/CartContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
import PaymentModal from "@/components/modals/PaymentModal";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import WatermarkedPhoto from "@/components/WatermarkedPhoto";
import { useProgressiveDiscount, getDiscountMessage, getNextDiscountThreshold } from "@/hooks/useProgressiveDiscount";

export const CartDrawer = () => {
  const { items, removeFromCart, totalItems, totalPrice, clearCart } = useCart();
  const [showPayment, setShowPayment] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Verificar se desconto progressivo está habilitado para os itens do carrinho
  const progressiveDiscountEnabled = items.some(item => item.progressive_discount_enabled !== false);
  
  // Calcular preço médio por foto
  const averagePrice = totalItems > 0 ? totalPrice / totalItems : 0;
  
  // Usar hook de desconto progressivo
  const progressiveDiscount = useProgressiveDiscount(
    totalItems,
    averagePrice,
    progressiveDiscountEnabled
  );

  const handleCheckout = () => {
    setIsOpen(false);
    setShowPayment(true);
  };

  // Próximo threshold de desconto
  const nextThreshold = getNextDiscountThreshold(totalItems);
  const discountMessage = progressiveDiscountEnabled ? getDiscountMessage(totalItems) : null;

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="relative">
            <ShoppingCart className="h-5 w-5" />
            {totalItems > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
              >
                {totalItems}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Carrinho de Compras</SheetTitle>
            <SheetDescription>
              {totalItems === 0 ? "Seu carrinho está vazio" : `${totalItems} ${totalItems === 1 ? 'foto' : 'fotos'} no carrinho`}
            </SheetDescription>
          </SheetHeader>

          {totalItems > 0 && (
            <div className="mt-4 space-y-4">
              <ScrollArea className="h-[calc(100vh-420px)]">
                <div className="space-y-4 pr-4">
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-3 border rounded-lg p-3">
                      <div className="w-20 h-20 flex-shrink-0">
                        <WatermarkedPhoto
                          src={item.watermarked_url}
                          alt={item.title || "Foto"}
                          imgClassName="w-full h-full object-cover rounded"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.title || "Sem título"}</p>
                        <p className="text-lg font-bold text-primary">
                          {formatCurrency(Number(item.price))}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFromCart(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="border-t pt-4 space-y-3">
                {/* Subtotal */}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span>{formatCurrency(totalPrice)}</span>
                </div>

                {/* Desconto Progressivo */}
                {progressiveDiscountEnabled && progressiveDiscount.discountPercentage > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span className="flex items-center gap-1">
                      <Percent className="h-3 w-3" />
                      Desconto ({progressiveDiscount.discountPercentage}%):
                    </span>
                    <span>-{formatCurrency(progressiveDiscount.discountAmount)}</span>
                  </div>
                )}

                {/* Mensagem de desconto */}
                {discountMessage && (
                  <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-2 text-xs text-green-700 dark:text-green-400">
                    {discountMessage}
                  </div>
                )}

                {/* Próximo desconto */}
                {progressiveDiscountEnabled && nextThreshold && !progressiveDiscount.discountPercentage && (
                  <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-2 text-xs text-blue-700 dark:text-blue-400 flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    Adicione mais {nextThreshold.threshold - totalItems} foto(s) para ganhar {nextThreshold.percentage}% de desconto!
                  </div>
                )}

                {/* Total Final */}
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Total:</span>
                  <span className="text-primary">{formatCurrency(progressiveDiscount.total)}</span>
                </div>

                <div className="space-y-2">
                  <Button onClick={handleCheckout} className="w-full" size="lg">
                    Finalizar Compra
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={clearCart}
                    className="w-full"
                  >
                    Limpar Carrinho
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <PaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        photos={items}
        onPaymentSuccess={() => {
          clearCart();
          setShowPayment(false);
        }}
      />
    </>
  );
};
