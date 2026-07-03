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
 * Desconto progressivo (regra oficial validada no servidor):
 *   - 5 a 10 fotos  → 5%
 *   - 11 a 20 fotos → 10%
 *   - 21+ fotos     → 15%
 * Menos de 5 fotos: sem desconto.
 */
export function useProgressiveDiscount(
  quantity: number,
  unitPrice: number,
  isEnabled: boolean = true
): ProgressiveDiscount {
  return useMemo(() => {
    const round2 = (value: number) => Number(value.toFixed(2));
    const subtotal = round2(quantity * unitPrice);

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

    const discountAmount = round2(subtotal * (discountPercentage / 100));
    const total = round2(Math.max(0, subtotal - discountAmount));

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
    return '🎉 Desconto de 15% aplicado! (21+ fotos)';
  } else if (quantity >= 11) {
    return '🎉 Desconto de 10% aplicado! (11-20 fotos)';
  } else if (quantity >= 5) {
    return '🎉 Desconto de 5% aplicado! (5-10 fotos)';
  } else if (quantity >= 1) {
    const faltam = 5 - quantity;
    return `💡 Adicione mais ${faltam} foto${faltam > 1 ? 's' : ''} para ganhar 5% de desconto!`;
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
