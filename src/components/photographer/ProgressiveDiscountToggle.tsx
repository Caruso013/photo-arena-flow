import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Gift, TrendingUp, Info } from 'lucide-react';

interface ProgressiveDiscountToggleProps {
  campaignId: string;
  isEnabled: boolean;
  onToggle: (enabled: boolean) => Promise<void>;
  isLoading?: boolean;
}

export const ProgressiveDiscountToggle: React.FC<ProgressiveDiscountToggleProps> = ({
  campaignId,
  isEnabled,
  onToggle,
  isLoading = false,
}) => {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-full">
                <Gift className="h-5 w-5 text-primary" />
              </div>
              <div>
                <Label htmlFor={`discount-toggle-${campaignId}`} className="text-base font-semibold cursor-pointer">
                  Descontos Progressivos
                </Label>
                <p className="text-sm text-muted-foreground">
                  Incentive compras maiores com descontos automáticos
                </p>
              </div>
            </div>
            <Switch
              id={`discount-toggle-${campaignId}`}
              checked={isEnabled}
              onCheckedChange={onToggle}
              disabled={isLoading}
            />
          </div>

          {/* Info sobre os descontos */}
          {isEnabled && (
            <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="text-blue-900 dark:text-blue-100">
                <div className="space-y-2">
                  <p className="font-medium">Tabela de descontos ativa:</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>• 5 a 10 fotos</span>
                      <span className="font-semibold">5% de desconto</span>
                    </div>
                    <div className="flex justify-between">
                      <span>• 11 a 20 fotos</span>
                      <span className="font-semibold">10% de desconto</span>
                    </div>
                    <div className="flex justify-between">
                      <span>• 21 ou mais fotos</span>
                      <span className="font-semibold">15% de desconto</span>
                    </div>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Info quando desativado */}
          {!isEnabled && (
            <Alert>
              <TrendingUp className="h-4 w-4" />
              <AlertDescription>
                <p className="text-sm">
                  <strong>Dica:</strong> Ativar descontos progressivos pode aumentar suas vendas incentivando clientes a comprar mais fotos.
                </p>
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
