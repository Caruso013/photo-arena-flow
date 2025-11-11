import { useAuth } from '@/contexts/AuthContext';
import FinancialDashboard from '@/components/dashboard/FinancialDashboard';
import AdminLayout from '@/components/dashboard/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, DollarSign, BarChart3 } from 'lucide-react';
import { SalesChart } from '@/components/dashboard/SalesChart';
import { useSalesData } from '@/hooks/useSalesData';
import { Skeleton } from '@/components/ui/skeleton';

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

        <Tabs defaultValue="analytics" className="space-y-6">
          <TabsList>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="overview" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="payouts" className="gap-2">
              <DollarSign className="h-4 w-4" />
              Repasses
            </TabsTrigger>
          </TabsList>

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
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminFinancial;
