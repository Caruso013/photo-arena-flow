import { useAuth } from '@/contexts/AuthContext';
import FinancialDashboard from '@/components/dashboard/FinancialDashboard';
import AdminLayout from '@/components/dashboard/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, DollarSign, BarChart3, Wallet, Activity } from 'lucide-react';
import { SalesChart } from '@/components/dashboard/SalesChart';
import { useSalesData } from '@/hooks/useSalesData';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { FinancialHealthCheck } from '@/components/dashboard/FinancialHealthCheck';

const AdminFinancial = () => {
  const { profile } = useAuth();
  const { data: salesData, loading } = useSalesData(30);

  if (profile?.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-2">Acesso Negado</h2>
        <p className="text-muted-foreground">Apenas administradores podem acessar esta página</p>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financeiro</h1>
          <p className="text-muted-foreground">Visualize dados financeiros e transações</p>
        </div>

        {/* Aviso sobre período de segurança */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Período de Segurança:</strong> Vendas ficam disponíveis para repasse após 12 horas para processamento de estornos e verificação antifraude.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="health" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="health" className="gap-2">
              <Activity className="h-4 w-4" />
              Saúde
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="overview" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="payouts" className="gap-2">
              <Wallet className="h-4 w-4" />
              Repasses
            </TabsTrigger>
            <TabsTrigger value="balance" className="gap-2">
              <DollarSign className="h-4 w-4" />
              Saldos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="health">
            <FinancialHealthCheck />
          </TabsContent>

          <TabsContent value="analytics">
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-[300px] w-full" />
              </div>
            ) : (
              <SalesChart 
                data={salesData} 
                title="Vendas dos Últimos 30 Dias"
                description="Evolução de receita e vendas no último mês"
                type="area"
              />
            )}
          </TabsContent>

          <TabsContent value="overview">
            <FinancialDashboard userRole="admin" view="overview" />
          </TabsContent>

          <TabsContent value="payouts">
            <FinancialDashboard userRole="admin" view="payouts" />
          </TabsContent>

          <TabsContent value="balance">
            <FinancialDashboard userRole="admin" view="earnings" />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminFinancial;
