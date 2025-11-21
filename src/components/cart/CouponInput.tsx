import React, { useState } from 'react';
import { useCoupons, CouponValidationResult } from '@/hooks/useCoupons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Ticket, Check, X, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/utils';

interface CouponInputProps {
  purchaseAmount: number;
  onCouponApplied: (result: CouponValidationResult) => void;
  onCouponRemoved: () => void;
  appliedCoupon?: CouponValidationResult | null;
}

export const CouponInput: React.FC<CouponInputProps> = ({
  purchaseAmount,
  onCouponApplied,
  onCouponRemoved,
  appliedCoupon = null,
}) => {
  const [couponCode, setCouponCode] = useState('');
  const [validating, setValidating] = useState(false);
  const { validateCoupon } = useCoupons();
  const { user } = useAuth();

  const handleValidateCoupon = async () => {
    if (!couponCode.trim()) return;
    if (!user) return;

    setValidating(true);
    try {
      const result = await validateCoupon(
        couponCode,
        user.id,
        purchaseAmount
      );

      if (result.valid) {
        onCouponApplied(result);
        setCouponCode('');
      }
    } catch (error) {
      console.error('Erro ao validar cupom:', error);
    } finally {
      setValidating(false);
    }
  };

  const handleRemoveCoupon = () => {
    onCouponRemoved();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleValidateCoupon();
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        {/* Cupom já aplicado */}
        {appliedCoupon && appliedCoupon.valid ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 dark:bg-green-900 p-2 rounded-full">
                  <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-semibold text-green-900 dark:text-green-100">
                    Cupom Aplicado!
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    {appliedCoupon.message}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemoveCoupon}
                className="text-destructive hover:text-destructive"
              >
                <X className="h-4 w-4 mr-1" />
                Remover
              </Button>
            </div>

            <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
              <span className="text-green-900 dark:text-green-100 font-medium">
                Desconto do Cupom
              </span>
              <span className="text-xl font-bold text-green-600 dark:text-green-400">
                -{formatCurrency(appliedCoupon.discount_amount)}
              </span>
            </div>
          </div>
        ) : (
          /* Input para aplicar cupom */
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Ticket className="h-5 w-5 text-muted-foreground" />
              <label className="text-sm font-medium">Tem um cupom de desconto?</label>
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Digite o código (ex: PROMO2025)"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                onKeyPress={handleKeyPress}
                disabled={validating}
                className="flex-1 font-mono"
              />
              <Button
                onClick={handleValidateCoupon}
                disabled={!couponCode.trim() || validating}
                variant="outline"
              >
                {validating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Validando...
                  </>
                ) : (
                  'Aplicar'
                )}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              💡 Cupons promocionais podem ser aplicados para economizar ainda mais!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Componente minimalista para linha de resumo
export const CouponDiscountLine: React.FC<{ appliedCoupon: CouponValidationResult | null }> = ({
  appliedCoupon,
}) => {
  if (!appliedCoupon || !appliedCoupon.valid || appliedCoupon.discount_amount === 0) {
    return null;
  }

  return (
    <div className="flex justify-between items-center py-2 text-blue-600 dark:text-blue-400">
      <div className="flex items-center gap-2">
        <Ticket className="h-4 w-4" />
        <span className="text-sm">Cupom de Desconto</span>
        <Badge variant="outline" className="text-xs">
          Aplicado
        </Badge>
      </div>
      <span className="font-semibold">-{formatCurrency(appliedCoupon.discount_amount)}</span>
    </div>
  );
};
