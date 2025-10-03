import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';

interface Photo {
  id: string;
  title: string | null;
  price: number;
  watermarked_url: string;
  thumbnail_url: string | null;
}

interface CartContextType {
  items: Photo[];
  addToCart: (photo: Photo) => void;
  removeFromCart: (photoId: string) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<Photo[]>(() => {
    const saved = localStorage.getItem('cart');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items));
  }, [items]);

  const addToCart = (photo: Photo) => {
    setItems(current => {
      if (current.find(item => item.id === photo.id)) {
        toast({
          title: "Foto já está no carrinho",
          variant: "destructive"
        });
        return current;
      }
      toast({
        title: "Foto adicionada ao carrinho",
        description: photo.title || "Sem título"
      });
      return [...current, photo];
    });
  };

  const removeFromCart = (photoId: string) => {
    setItems(current => current.filter(item => item.id !== photoId));
    toast({
      title: "Foto removida do carrinho"
    });
  };

  const clearCart = () => {
    setItems([]);
    localStorage.removeItem('cart');
  };

  const totalItems = items.length;
  const totalPrice = items.reduce((sum, item) => sum + Number(item.price), 0);

  return (
    <CartContext.Provider value={{ items, addToCart, removeFromCart, clearCart, totalItems, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart deve ser usado dentro de um CartProvider');
  }
  return context;
};
