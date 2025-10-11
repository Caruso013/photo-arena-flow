import { useAuth } from '@/contexts/AuthContext';
import FinancialDashboard from '@/components/dashboard/FinancialDashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, DollarSign } from 'lucide-react';

const Financial = () => {
  const { profile } = useAuth();

  if (profile?.role !== 'photographer' && profile?.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-2">Acesso Negado</h2>
        <p className="text-muted-foreground">
          Apenas fotógrafos e administradores podem acessar esta página
        </p>
      </div>
    );
  }

  if (profile.role === 'photographer') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financeiro</h1>
          <p className="text-muted-foreground">Acompanhe suas vendas e receitas</p>
        </div>

        <Tabs defaultValue="earnings" className="space-y-6">
          <TabsList>
            <TabsTrigger value="earnings" className="gap-2">
              <DollarSign className="h-4 w-4" />
              Minhas Receitas
            </TabsTrigger>
            <TabsTrigger value="overview" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Desempenho
            </TabsTrigger>
          </TabsList>

          <TabsContent value="earnings">
            <FinancialDashboard userRole="photographer" view="earnings" />
          </TabsContent>

          <TabsContent value="overview">
            <FinancialDashboard userRole="photographer" view="overview" />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return <FinancialDashboard userRole={profile.role as 'admin' | 'photographer'} />;
};

export default Financial;
