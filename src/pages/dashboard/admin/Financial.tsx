import { useAuth } from '@/contexts/AuthContext';
import FinancialDashboard from '@/components/dashboard/FinancialDashboard';
import AdminLayout from '@/components/dashboard/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, DollarSign } from 'lucide-react';

const AdminFinancial = () => {
  const { profile } = useAuth();

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

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="payouts" className="gap-2">
              <DollarSign className="h-4 w-4" />
              Repasses
            </TabsTrigger>
          </TabsList>

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
