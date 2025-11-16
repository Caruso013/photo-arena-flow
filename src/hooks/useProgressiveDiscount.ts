import { useMemo } from 'react';

export interface ProgressiveDiscount {
  quantity: number;
  unitPrice: number;
  subtotal: number;
  discountPercentage: number;
  discountAmount: number;
  total: number;
  isEnabled: boolean;
}

export function useProgressiveDiscount(
  quantity: number, 
  unitPrice: number,
  isEnabled: boolean = true // Fotógrafo decide se ativa ou não
): ProgressiveDiscount {
  return useMemo(() => {
    const subtotal = quantity * unitPrice;
    
    // Calcular porcentagem de desconto baseado na quantidade
    // SOMENTE se o fotógrafo ativou os descontos progressivos
    let discountPercentage = 0;
    
    if (isEnabled) {
      if (quantity >= 5 && quantity <= 10) {
        discountPercentage = 5; // 5% para 5-10 fotos
      } else if (quantity >= 11 && quantity <= 20) {
        discountPercentage = 10; // 10% para 11-20 fotos
      } else if (quantity > 20) {
        discountPercentage = 15; // 15% para mais de 20 fotos
      }
    }
    
    const discountAmount = subtotal * (discountPercentage / 100);
    const total = subtotal - discountAmount;
    
    return {
      quantity,
      unitPrice,
      subtotal,
      discountPercentage,
      discountAmount,
      total,
      isEnabled,
    };
  }, [quantity, unitPrice, isEnabled]);
}

export function getDiscountMessage(quantity: number): string | null {
  if (quantity >= 5 && quantity <= 10) {
    return '🎉 Desconto de 5% aplicado! (5-10 fotos)';
  } else if (quantity >= 11 && quantity <= 20) {
    return '🎉 Desconto de 10% aplicado! (11-20 fotos)';
  } else if (quantity > 20) {
    return '🎉 Desconto de 15% aplicado! (20+ fotos)';
  } else if (quantity >= 3 && quantity < 5) {
    return '💡 Compre 2 fotos a mais e ganhe 5% de desconto!';
  } else if (quantity >= 1 && quantity < 3) {
    const needed = 5 - quantity;
    return `💡 Adicione mais ${needed} foto${needed > 1 ? 's' : ''} para ganhar 5% de desconto!`;
  }
  return null;
}

export function getNextDiscountThreshold(quantity: number): { threshold: number; percentage: number } | null {
  if (quantity < 5) {
    return { threshold: 5, percentage: 5 };
  } else if (quantity < 11) {
    return { threshold: 11, percentage: 10 };
  } else if (quantity < 21) {
    return { threshold: 21, percentage: 15 };
  }
  return null;
}
