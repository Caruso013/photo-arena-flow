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
      if (quantity >= 10) {
        discountPercentage = 20; // 20% para 10+ fotos
      } else if (quantity >= 5) {
        discountPercentage = 10; // 10% para 5-9 fotos
      } else if (quantity >= 2) {
        discountPercentage = 5; // 5% para 2-4 fotos
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
  if (quantity >= 10) {
    return '🎉 Desconto de 20% aplicado! (10+ fotos)';
  } else if (quantity >= 5) {
    return '🎉 Desconto de 10% aplicado! (5-9 fotos)';
  } else if (quantity >= 2) {
    return '🎉 Desconto de 5% aplicado! (2-4 fotos)';
  } else if (quantity === 1) {
    return '💡 Adicione mais 1 foto para ganhar 5% de desconto!';
  }
  return null;
}

export function getNextDiscountThreshold(quantity: number): { threshold: number; percentage: number } | null {
  if (quantity < 2) {
    return { threshold: 2, percentage: 5 };
  } else if (quantity < 5) {
    return { threshold: 5, percentage: 10 };
  } else if (quantity < 10) {
    return { threshold: 10, percentage: 20 };
  }
  return null;
}
