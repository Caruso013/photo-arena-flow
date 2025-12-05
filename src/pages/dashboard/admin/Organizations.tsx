import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { OrganizationManager } from '@/components/dashboard/OrganizationManager';
import { toast } from '@/components/ui/use-toast';
import AdminLayout from '@/components/dashboard/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Calendar, History, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface Organization {
  id: string;
  name: string;
  description: string | null;
  admin_percentage: number;
  created_at: string;
  updated_at: string;
  monthly_revenue?: number;
  cycle_start?: Date;
  cycle_end?: Date;
  payment_date?: Date;
}

interface MonthlyRevenue {
  organization_id: string;
  organization_name: string;
  month_label: string;
  cycle_start: Date;
  cycle_end: Date;
  payment_date: Date;
  revenue: number;
}

const AdminOrganizations = () => {
  const { profile } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [historicalRevenue, setHistoricalRevenue] = useState<MonthlyRevenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      
      // Buscar organizações
      const { data: orgsData, error: orgsError } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false});

      if (orgsError) throw orgsError;

      // Calcular ciclo de pagamento de 30 dias (do dia 5 do mês passado até dia 4 do mês atual)
      const now = new Date();
      const currentDay = now.getDate();
      
      let cycleStart: Date;
      let cycleEnd: Date;
      let paymentDate: Date;
      
      if (currentDay < 5) {
        cycleStart = new Date(now.getFullYear(), now.getMonth() - 2, 5, 0, 0, 0);
        cycleEnd = new Date(now.getFullYear(), now.getMonth() - 1, 4, 23, 59, 59);
        paymentDate = new Date(now.getFullYear(), now.getMonth() - 1, 5);
      } else {
        cycleStart = new Date(now.getFullYear(), now.getMonth() - 1, 5, 0, 0, 0);
        cycleEnd = new Date(now.getFullYear(), now.getMonth(), 4, 23, 59, 59);
        paymentDate = new Date(now.getFullYear(), now.getMonth(), 5);
      }
      
      const cycleStartISO = cycleStart.toISOString();
      const cycleEndISO = cycleEnd.toISOString();

      // Calcular últimos 2 meses de histórico (incluindo o atual)
      const historicalData: MonthlyRevenue[] = [];
      
      for (let monthOffset = 0; monthOffset < 2; monthOffset++) {
        let histCycleStart: Date;
        let histCycleEnd: Date;
        let histPaymentDate: Date;
        
        if (currentDay < 5) {
          histCycleStart = new Date(now.getFullYear(), now.getMonth() - 2 - monthOffset, 5, 0, 0, 0);
          histCycleEnd = new Date(now.getFullYear(), now.getMonth() - 1 - monthOffset, 4, 23, 59, 59);
          histPaymentDate = new Date(now.getFullYear(), now.getMonth() - 1 - monthOffset, 5);
        } else {
          histCycleStart = new Date(now.getFullYear(), now.getMonth() - 1 - monthOffset, 5, 0, 0, 0);
          histCycleEnd = new Date(now.getFullYear(), now.getMonth() - monthOffset, 4, 23, 59, 59);
          histPaymentDate = new Date(now.getFullYear(), now.getMonth() - monthOffset, 5);
        }

        const monthLabel = histPaymentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

        for (const org of orgsData || []) {
          const { data: revenueData } = await supabase
            .from('revenue_shares')
            .select('organization_amount')
            .eq('organization_id', org.id)
            .gte('created_at', histCycleStart.toISOString())
            .lte('created_at', histCycleEnd.toISOString());

          const revenue = (revenueData || []).reduce(
            (sum, rev) => sum + Number(rev.organization_amount), 
            0
          );

          if (monthOffset > 0) { // Apenas adiciona ao histórico os meses anteriores
            historicalData.push({
              organization_id: org.id,
              organization_name: org.name,
              month_label: monthLabel,
              cycle_start: histCycleStart,
              cycle_end: histCycleEnd,
              payment_date: histPaymentDate,
              revenue
            });
          }
        }
      }

      setHistoricalRevenue(historicalData);

      const orgsWithRevenue = await Promise.all(
        (orgsData || []).map(async (org) => {
          const { data: revenueData } = await supabase
            .from('revenue_shares')
            .select('organization_amount')
            .eq('organization_id', org.id)
            .gte('created_at', cycleStartISO)
            .lte('created_at', cycleEndISO);

          const cycleRevenue = (revenueData || []).reduce(
            (sum, rev) => sum + Number(rev.organization_amount), 
            0
          );

          return { 
            ...org, 
            monthly_revenue: cycleRevenue,
            cycle_start: cycleStart,
            cycle_end: cycleEnd,
            payment_date: paymentDate
          };
        })
      );

      setOrganizations(orgsWithRevenue);
    } catch (error) {
      console.error('Error fetching organizations:', error);
      toast({
        title: "Erro ao carregar organizações",
        description: "Não foi possível carregar a lista de organizações.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (profile?.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-2">Acesso Negado</h2>
        <p className="text-muted-foreground">Apenas administradores podem acessar esta página</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organizações</h1>
          <p className="text-muted-foreground">Gerencie organizações e suas configurações</p>
        </div>

        {/* Receita do Ciclo Atual */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Ciclo de Pagamento Atual</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {organizations.map((org) => {
              const daysUntilPayment = org.payment_date 
                ? Math.ceil((org.payment_date.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                : 0;
              const isPaid = daysUntilPayment < 0;
              
              return (
                <Card key={org.id} className="border-l-4 border-l-green-500">
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {org.name}
                    </CardTitle>
                    <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      R$ {(org.monthly_revenue || 0).toFixed(2)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Ciclo: {org.cycle_start?.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} - {org.cycle_end?.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs font-medium">
                        Pagamento: {org.payment_date?.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      </span>
                      {!isPaid && daysUntilPayment >= 0 && (
                        <Badge variant="outline" className="text-xs">
                          {daysUntilPayment === 0 ? 'Hoje' : `${daysUntilPayment}d`}
                        </Badge>
                      )}
                      {isPaid && (
                        <Badge variant="secondary" className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                          Pago
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Histórico de 2 Meses */}
        {historicalRevenue.length > 0 && (
          <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
            <Card>
              <CardHeader className="pb-3">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full flex items-center justify-between p-0 h-auto">
                    <div className="flex items-center gap-2">
                      <History className="h-5 w-5" />
                      <CardTitle className="text-lg">Histórico de Receitas (Últimos 2 Meses)</CardTitle>
                    </div>
                    {historyOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CardDescription>
                  Dados guardados para discussão e análise
                </CardDescription>
              </CardHeader>
              <CollapsibleContent>
                <CardContent>
                  <div className="space-y-4">
                    {/* Agrupar por mês */}
                    {Array.from(new Set(historicalRevenue.map(h => h.month_label))).map(monthLabel => (
                      <div key={monthLabel}>
                        <h4 className="font-medium text-sm text-muted-foreground mb-2 capitalize">{monthLabel}</h4>
                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                          {historicalRevenue
                            .filter(h => h.month_label === monthLabel)
                            .map((item, idx) => (
                              <Card key={`${item.organization_id}-${idx}`} className="border-l-4 border-l-blue-500">
                                <CardContent className="p-4">
                                  <div className="flex justify-between items-center">
                                    <span className="font-medium">{item.organization_name}</span>
                                    <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                      R$ {item.revenue.toFixed(2)}
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {item.cycle_start.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} - {item.cycle_end.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                  </p>
                                </CardContent>
                              </Card>
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}

        <OrganizationManager organizations={organizations} onRefresh={fetchOrganizations} />
      </div>
    </AdminLayout>
  );
};

export default AdminOrganizations;
