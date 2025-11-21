import React from 'react';
import { useProgressiveDiscount, getDiscountMessage, getNextDiscountThreshold } from '@/hooks/useProgressiveDiscount';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, TrendingUp, Gift } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface ProgressiveDiscountDisplayProps {
  quantity: number;
  unitPrice: number;
  isEnabled?: boolean; // Se o fotógrafo ativou descontos progressivos nesta campanha
  showIncentive?: boolean;
  compact?: boolean;
}

export const ProgressiveDiscountDisplay: React.FC<ProgressiveDiscountDisplayProps> = ({
  quantity,
  unitPrice,
  isEnabled = true,
  showIncentive = true,
  compact = false,
}) => {
  const discount = useProgressiveDiscount(quantity, unitPrice, isEnabled);
  const message = getDiscountMessage(quantity);
  const nextThreshold = getNextDiscountThreshold(quantity);

  // Se descontos progressivos estão desativados pelo fotógrafo
  if (!isEnabled) {
    return null;
  }

  // Sem desconto e não mostrar incentivo
  if (discount.discountPercentage === 0 && !showIncentive) {
    return null;
  }

  // Versão compacta (para header do carrinho)
  if (compact && discount.discountPercentage > 0) {
    return (
      <Badge variant="outline" className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 gap-1">
        <Gift className="h-3 w-3" />
        -{discount.discountPercentage}% ({formatCurrency(discount.discountAmount)})
      </Badge>
    );
  }

  // Versão completa
  return (
    <div className="space-y-3">
      {/* Desconto Ativo */}
      {discount.discountPercentage > 0 && (
        <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-green-500 dark:bg-green-600 p-2 rounded-full">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-green-900 dark:text-green-100">
                    Desconto Progressivo Ativo!
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    {discount.discountPercentage}% de desconto aplicado
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  -{formatCurrency(discount.discountAmount)}
                </p>
                <p className="text-xs text-green-700 dark:text-green-300">
                  de {formatCurrency(discount.subtotal)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mensagem de Incentivo */}
      {showIncentive && message && (
        <Alert className={
          discount.discountPercentage > 0
            ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
            : 'bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800'
        }>
          <TrendingUp className={`h-4 w-4 ${
            discount.discountPercentage > 0
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-purple-600 dark:text-purple-400'
          }`} />
          <AlertDescription className={
            discount.discountPercentage > 0
              ? 'text-blue-900 dark:text-blue-100'
              : 'text-purple-900 dark:text-purple-100'
          }>
            {message}
          </AlertDescription>
        </Alert>
      )}

      {/* Próximo Nível de Desconto */}
      {showIncentive && nextThreshold && discount.discountPercentage < 15 && (
        <div className="p-3 bg-muted rounded-lg border">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                Adicione {nextThreshold.threshold - quantity} foto{nextThreshold.threshold - quantity > 1 ? 's' : ''}
              </span>
            </div>
            <Badge variant="outline">
              {nextThreshold.percentage}% de desconto
            </Badge>
          </div>
          {/* Barra de Progresso */}
          <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-primary rounded-full h-2 transition-all duration-300"
              style={{
                width: `${(quantity / nextThreshold.threshold) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Tabela de Descontos (se não tiver desconto ativo) */}
      {discount.discountPercentage === 0 && showIncentive && (
        <Card>
          <CardContent className="p-4">
            <p className="font-semibold mb-3 text-sm">🎁 Descontos Progressivos Disponíveis:</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between p-2 rounded bg-muted/50">
                <span className="text-muted-foreground">5-10 fotos</span>
                <Badge variant="outline">5% OFF</Badge>
              </div>
              <div className="flex justify-between p-2 rounded bg-muted/50">
                <span className="text-muted-foreground">11-20 fotos</span>
                <Badge variant="outline">10% OFF</Badge>
              </div>
              <div className="flex justify-between p-2 rounded bg-muted/50">
                <span className="text-muted-foreground">21+ fotos</span>
                <Badge variant="outline" className="bg-primary/10">15% OFF</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Componente minimalista para linha de resumo no checkout
export const ProgressiveDiscountLine: React.FC<{ 
  quantity: number; 
  unitPrice: number;
  isEnabled?: boolean;
}> = ({
  quantity,
  unitPrice,
  isEnabled = true,
}) => {
  const discount = useProgressiveDiscount(quantity, unitPrice, isEnabled);

  if (!isEnabled || discount.discountPercentage === 0) {
    return null;
  }

  return (
    <div className="flex justify-between items-center py-2 text-green-600 dark:text-green-400">
      <div className="flex items-center gap-2">
        <Gift className="h-4 w-4" />
        <span className="text-sm">Desconto Progressivo ({discount.discountPercentage}%)</span>
      </div>
      <span className="font-semibold">-{formatCurrency(discount.discountAmount)}</span>
    </div>
  );
};
