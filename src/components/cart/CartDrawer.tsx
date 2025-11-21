import { ShoppingCart, Trash2, X } from "lucide-react";
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

export const CartDrawer = () => {
  const { items, removeFromCart, totalItems, totalPrice, clearCart } = useCart();
  const [showPayment, setShowPayment] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleCheckout = () => {
    setIsOpen(false);
    setShowPayment(true);
  };

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
              <ScrollArea className="h-[calc(100vh-300px)]">
                <div className="space-y-4 pr-4">
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-3 border rounded-lg p-3">
                      <img
                        src={item.thumbnail_url || item.watermarked_url}
                        alt={item.title || "Foto"}
                        className="w-20 h-20 object-cover rounded"
                      />
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

              <div className="border-t pt-4 space-y-4">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span className="text-primary">{formatCurrency(totalPrice)}</span>
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
