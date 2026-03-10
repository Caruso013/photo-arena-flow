import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, Calendar, Download, Clock, Lock } from 'lucide-react';
import { SkeletonCard } from '@/components/ui/skeleton-card';
import { Button } from '@/components/ui/button';
import { usePhotographerBalance } from '@/hooks/usePhotographerBalance';
import { formatCurrency } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

const PhotographerEarnings = () => {
  const balance = usePhotographerBalance();
  const navigate = useNavigate();

  if (balance.loading) {
    return (
      <div className="p-6 space-y-6">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Financeiro</h1>
          <p className="text-muted-foreground mt-2">
            Acompanhe seus ganhos e vendas
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">
              Total de Ganhos
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatCurrency(balance.totalEarned)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Histórico completo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">
              Disponível para Saque
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(balance.availableAmount)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Após período de segurança
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">
              Fotos Vendidas
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {balance.totalPhotosSold}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {balance.monthlySales} este mês
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">
              Taxa de Conversão
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {balance.conversionRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {balance.totalPhotos} fotos enviadas
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">Resumo de Pagamentos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <div>
                <p className="text-sm text-muted-foreground">Pendente (período de segurança)</p>
                <p className="text-lg font-semibold text-yellow-600 dark:text-yellow-400">
                  {formatCurrency(balance.pendingAmount)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">
                Liberado após 12h da venda
              </p>
            </div>
          </div>

          {balance.blockedAmount > 0 && (
            <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Lock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                <div>
                  <p className="text-sm text-muted-foreground">Bloqueado em saques</p>
                  <p className="text-lg font-semibold text-orange-600 dark:text-orange-400">
                    {formatCurrency(balance.blockedAmount)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">
                  Aguardando processamento
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
            <div>
              <p className="text-sm text-green-900 dark:text-green-100">Disponível para Saque</p>
              <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                {formatCurrency(balance.availableAmount)}
              </p>
            </div>
            <Button 
              variant="default" 
              disabled={balance.availableAmount < 50}
              onClick={() => navigate('/dashboard/photographer/payout')}
            >
              <Download className="h-4 w-4 mr-2" />
              Solicitar Saque
            </Button>
          </div>

          <p className="text-xs text-muted-foreground mt-4">
            💡 Os ganhos ficam disponíveis 12h após a confirmação do pagamento.
            O saque pode ser solicitado quando atingir o valor mínimo de R$ 50,00.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PhotographerEarnings;
