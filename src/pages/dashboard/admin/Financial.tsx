import { useAuth } from '@/contexts/AuthContext';
import FinancialDashboard from '@/components/dashboard/FinancialDashboard';
import AdminLayout from '@/components/dashboard/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, DollarSign, BarChart3, Wallet, Activity, ShieldCheck } from 'lucide-react';
import { SalesChart } from '@/components/dashboard/SalesChart';
import { useSalesData } from '@/hooks/useSalesData';
import { Skeleton } from '@/components/ui/skeleton';
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
      <div className="space-y-6">
        {/* Hero header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#D4AF37] via-[#F4D03F] to-[#D4AF37] p-6 shadow-md">
          <div className="absolute inset-0 opacity-10 [background-image:radial-gradient(circle_at_70%_50%,white_1px,transparent_1px)] [background-size:24px_24px]" />
          <div className="relative">
            <h1 className="text-3xl font-bold tracking-tight text-black/90">Financeiro</h1>
            <p className="mt-1 text-black/60 text-sm">Visualize dados financeiros e transações em tempo real</p>
          </div>
        </div>

        {/* Security notice card */}
        <div className="flex items-start gap-3 rounded-xl border border-amber-200/80 bg-amber-50/60 px-4 py-3 text-sm text-amber-900/80 shadow-sm">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <span>
            <strong>Período de Segurança:</strong> Vendas ficam disponíveis para repasse após 12 horas para processamento de estornos e verificação antifraude.
          </span>
        </div>

        <Tabs defaultValue="health" className="space-y-5">
          <TabsList className="flex w-full flex-wrap gap-1 rounded-xl border bg-muted/40 p-1 h-auto">
            <TabsTrigger
              value="health"
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black data-[state=active]:shadow-sm"
            >
              <Activity className="h-4 w-4" />
              <span>Saúde</span>
            </TabsTrigger>
            <TabsTrigger
              value="analytics"
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black data-[state=active]:shadow-sm"
            >
              <BarChart3 className="h-4 w-4" />
              <span>Analytics</span>
            </TabsTrigger>
            <TabsTrigger
              value="overview"
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black data-[state=active]:shadow-sm"
            >
              <TrendingUp className="h-4 w-4" />
              <span>Visão Geral</span>
            </TabsTrigger>
            <TabsTrigger
              value="payouts"
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black data-[state=active]:shadow-sm"
            >
              <Wallet className="h-4 w-4" />
              <span>Repasses</span>
            </TabsTrigger>
            <TabsTrigger
              value="balance"
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black data-[state=active]:shadow-sm"
            >
              <DollarSign className="h-4 w-4" />
              <span>Saldos</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="health" className="mt-0">
            <FinancialHealthCheck />
          </TabsContent>

          <TabsContent value="analytics" className="mt-0">
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-[300px] w-full rounded-xl" />
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

          <TabsContent value="overview" className="mt-0">
            <FinancialDashboard userRole="admin" view="overview" />
          </TabsContent>

          <TabsContent value="payouts" className="mt-0">
            <FinancialDashboard userRole="admin" view="payouts" />
          </TabsContent>

          <TabsContent value="balance" className="mt-0">
            <FinancialDashboard userRole="admin" view="earnings" />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminFinancial;
