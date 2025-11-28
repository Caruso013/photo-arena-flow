import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Database,
  DollarSign,
  Users,
  TrendingUp
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface HealthMetrics {
  totalRevenue: number;
  totalPurchases: number;
  totalRevenueShares: number;
  pendingPayouts: number;
  approvedPayouts: number;
  photographersWithBalance: number;
  orphanedRevenueShares: number;
  missingRevenueShares: number;
}

export const FinancialHealthCheck = () => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<HealthMetrics | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const runHealthCheck = async () => {
    try {
      setLoading(true);
      setErrors([]);
      
      console.log('🏥 Iniciando Health Check Financeiro...');

      // 1. Total de receita das purchases
      const { data: purchases, error: purchasesError } = await supabase
        .from('purchases')
        .select('id, amount, status')
        .eq('status', 'completed');

      if (purchasesError) throw purchasesError;

      const totalRevenue = purchases?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      // 2. Total de revenue_shares
      const { data: revenueShares, error: sharesError } = await supabase
        .from('revenue_shares')
        .select('photographer_amount, platform_amount, organization_amount, purchase_id');

      if (sharesError) throw sharesError;

      const totalRevenueShares = revenueShares?.reduce(
        (sum, s) => sum + Number(s.photographer_amount) + Number(s.platform_amount) + Number(s.organization_amount), 
        0
      ) || 0;

      // 3. Verificar revenue_shares órfãs (sem purchase)
      const purchaseIds = new Set(purchases?.map(p => p.id) || []);
      const orphanedShares = revenueShares?.filter(
        s => !purchaseIds.has(s.purchase_id)
      ).length || 0;

      // 4. Verificar purchases sem revenue_share
      const sharesPurchaseIds = new Set(revenueShares?.map(s => s.purchase_id) || []);
      const missingShares = purchases?.filter(
        p => !sharesPurchaseIds.has(p.id)
      ).length || 0;

      // 5. Payout requests pendentes e aprovados
      const { data: payouts, error: payoutsError } = await supabase
        .from('payout_requests')
        .select('status, amount');

      if (payoutsError) throw payoutsError;

      const pendingPayouts = payouts?.filter(p => p.status === 'pending').length || 0;
      const approvedPayouts = payouts?.filter(p => p.status === 'approved').length || 0;

      // 6. Fotógrafos com saldo disponível
      const { data: photographerBalances, error: balanceError } = await supabase
        .from('revenue_shares')
        .select('photographer_id, photographer_amount, purchase:purchases!inner(status, created_at)')
        .eq('purchase.status', 'completed');

      if (balanceError) throw balanceError;

      const now = new Date();
      const securityPeriod = 12 * 60 * 60 * 1000;

      const balanceMap = new Map<string, number>();
      photographerBalances?.forEach((share: any) => {
        const purchaseDate = new Date(share.purchase.created_at);
        const timeSince = now.getTime() - purchaseDate.getTime();
        
        if (timeSince >= securityPeriod) {
          const current = balanceMap.get(share.photographer_id) || 0;
          balanceMap.set(share.photographer_id, current + Number(share.photographer_amount));
        }
      });

      const photographersWithBalance = Array.from(balanceMap.values()).filter(b => b > 0).length;

      // Validações
      const newErrors: string[] = [];
      
      if (Math.abs(totalRevenue - totalRevenueShares) > 1) {
        newErrors.push(
          `Discrepância de ${formatCurrency(Math.abs(totalRevenue - totalRevenueShares))} entre purchases e revenue_shares`
        );
      }

      if (orphanedShares > 0) {
        newErrors.push(`${orphanedShares} revenue_shares órfãs (sem purchase correspondente)`);
      }

      if (missingShares > 0) {
        newErrors.push(`${missingShares} purchases sem revenue_share correspondente`);
      }

      setMetrics({
        totalRevenue,
        totalPurchases: purchases?.length || 0,
        totalRevenueShares: revenueShares?.length || 0,
        pendingPayouts,
        approvedPayouts,
        photographersWithBalance,
        orphanedRevenueShares: orphanedShares,
        missingRevenueShares: missingShares
      });

      setErrors(newErrors);

      console.log('✅ Health Check concluído:', {
        totalRevenue: formatCurrency(totalRevenue),
        totalRevenueShares: formatCurrency(totalRevenueShares),
        errors: newErrors.length
      });

    } catch (error) {
      console.error('❌ Erro no Health Check:', error);
      setErrors(['Erro ao executar verificação: ' + (error as Error).message]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runHealthCheck();
  }, []);

  const isHealthy = errors.length === 0 && metrics !== null;

  return (
    <Card className={isHealthy ? 'border-green-200 dark:border-green-900' : 'border-red-200 dark:border-red-900'}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Diagnóstico Financeiro
            </CardTitle>
            <CardDescription>
              Verificação de integridade dos dados financeiros
            </CardDescription>
          </div>
          <Button 
            onClick={runHealthCheck} 
            disabled={loading}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Geral */}
        <div className="flex items-center gap-2 p-4 rounded-lg bg-muted">
          {isHealthy ? (
            <>
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="font-semibold text-green-600">Sistema Financeiro Saudável</span>
            </>
          ) : (
            <>
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="font-semibold text-red-600">
                {errors.length} Problema{errors.length !== 1 ? 's' : ''} Detectado{errors.length !== 1 ? 's' : ''}
              </span>
            </>
          )}
        </div>

        {/* Erros */}
        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Métricas */}
        {metrics && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <DollarSign className="h-4 w-4" />
                Receita Total
              </div>
              <div className="text-2xl font-bold">{formatCurrency(metrics.totalRevenue)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {metrics.totalPurchases} vendas
              </div>
            </div>

            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <TrendingUp className="h-4 w-4" />
                Revenue Shares
              </div>
              <div className="text-2xl font-bold">{metrics.totalRevenueShares}</div>
              <div className="text-xs text-muted-foreground mt-1">
                registros criados
              </div>
            </div>

            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <Users className="h-4 w-4" />
                Fotógrafos c/ Saldo
              </div>
              <div className="text-2xl font-bold">{metrics.photographersWithBalance}</div>
              <div className="text-xs text-muted-foreground mt-1">
                com saldo disponível
              </div>
            </div>

            <div className="p-4 rounded-lg border bg-card">
              <div className="text-muted-foreground text-sm mb-1">Repasses Pendentes</div>
              <div className="text-2xl font-bold text-yellow-600">{metrics.pendingPayouts}</div>
              <Badge variant="outline" className="mt-1">Aguardando</Badge>
            </div>

            <div className="p-4 rounded-lg border bg-card">
              <div className="text-muted-foreground text-sm mb-1">Repasses Aprovados</div>
              <div className="text-2xl font-bold text-green-600">{metrics.approvedPayouts}</div>
              <Badge className="mt-1 bg-green-600">Processando</Badge>
            </div>

            <div className="p-4 rounded-lg border bg-card">
              <div className="text-muted-foreground text-sm mb-1">Integridade</div>
              <div className="text-2xl font-bold">
                {metrics.orphanedRevenueShares === 0 && metrics.missingRevenueShares === 0 ? '100%' : '⚠️'}
              </div>
              <Badge 
                variant={metrics.orphanedRevenueShares === 0 && metrics.missingRevenueShares === 0 ? 'default' : 'destructive'}
                className="mt-1"
              >
                {metrics.orphanedRevenueShares === 0 && metrics.missingRevenueShares === 0 ? 'OK' : 'Atenção'}
              </Badge>
            </div>
          </div>
        )}

        {/* Info de Segurança */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Período de Segurança:</strong> Vendas ficam disponíveis para repasse após 12 horas.
            Isso permite processamento de estornos e verificação antifraude.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};