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

/**
 * Calcula desconto progressivo.
 * IMPORTANTE: As faixas DEVEM ser idênticas às do servidor (Edge Function + DB function calculate_progressive_discount):
 *   - 5 a 10 fotos → 5%
 *   - 11 a 20 fotos → 10%
 *   - Acima de 20 fotos → 15%
 *   - Menos de 5 → sem desconto
 */
export function useProgressiveDiscount(
  quantity: number, 
  unitPrice: number,
  isEnabled: boolean = true
): ProgressiveDiscount {
  return useMemo(() => {
    const subtotal = quantity * unitPrice;
    
    let discountPercentage = 0;
    
    if (isEnabled) {
      if (quantity > 20) {
        discountPercentage = 15;
      } else if (quantity >= 11) {
        discountPercentage = 10;
      } else if (quantity >= 5) {
        discountPercentage = 5;
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
  if (quantity > 20) {
    return '🎉 Desconto de 15% aplicado! (20+ fotos)';
  } else if (quantity >= 11) {
    return '🎉 Desconto de 10% aplicado! (11-20 fotos)';
  } else if (quantity >= 5) {
    return '🎉 Desconto de 5% aplicado! (5-10 fotos)';
  } else if (quantity >= 1 && quantity < 5) {
    return `💡 Adicione mais ${5 - quantity} foto(s) para ganhar 5% de desconto!`;
  }
  return null;
}

export function getNextDiscountThreshold(quantity: number): { threshold: number; percentage: number } | null {
  if (quantity < 5) {
    return { threshold: 5, percentage: 5 };
  } else if (quantity < 11) {
    return { threshold: 11, percentage: 10 };
  } else if (quantity <= 20) {
    return { threshold: 21, percentage: 15 };
  }
  return null;
}