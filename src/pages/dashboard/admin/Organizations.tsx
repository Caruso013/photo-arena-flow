import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { OrganizationManager } from '@/components/dashboard/OrganizationManager';
import { toast } from '@/components/ui/use-toast';
import AdminLayout from '@/components/dashboard/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Calendar, History, ChevronDown, ChevronUp, Building2, TrendingUp, Clock, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Organization {
  id: string;
  name: string;
  description: string | null;
  admin_percentage: number;
  logo_url: string | null;
  primary_color: string | null;
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

interface OrganizationPayment {
  id: string;
  organization_id: string;
  cycle_start: string;
  cycle_end: string;
  amount: number;
  status: string;
  paid_at: string | null;
  paid_by: string | null;
  notes: string | null;
}

interface FinancialSummary {
  totalBruto: number;
  platformRevenue: number;
  pendingToOrgs: number;
}

const AdminOrganizations = () => {
  const { profile, user } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [historicalRevenue, setHistoricalRevenue] = useState<MonthlyRevenue[]>([]);
  const [payments, setPayments] = useState<OrganizationPayment[]>([]);
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary>({ totalBruto: 0, platformRevenue: 0, pendingToOrgs: 0 });
  const [loading, setLoading] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [confirmingPayment, setConfirmingPayment] = useState<string | null>(null);

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
        .order('created_at', { ascending: false });

      if (orgsError) throw orgsError;

      // Calcular ciclo de pagamento ATUAL (do dia 5 do mês atual até dia 4 do próximo mês)
      // Isso mostra as vendas que estão acontecendo AGORA
      const now = new Date();
      const currentDay = now.getDate();
      
      let cycleStart: Date;
      let cycleEnd: Date;
      let paymentDate: Date;
      
      // Ciclo ANTERIOR (para pagamentos pendentes)
      let previousCycleStart: Date;
      let previousCycleEnd: Date;
      
      if (currentDay < 5) {
        // Antes do dia 5: ciclo atual é do mês passado (ex: 05/12 a 04/01)
        cycleStart = new Date(now.getFullYear(), now.getMonth() - 1, 5, 0, 0, 0);
        cycleEnd = new Date(now.getFullYear(), now.getMonth(), 4, 23, 59, 59);
        paymentDate = new Date(now.getFullYear(), now.getMonth(), 5);
        // Ciclo anterior (para pagamentos pendentes)
        previousCycleStart = new Date(now.getFullYear(), now.getMonth() - 2, 5, 0, 0, 0);
        previousCycleEnd = new Date(now.getFullYear(), now.getMonth() - 1, 4, 23, 59, 59);
      } else {
        // Após o dia 5: ciclo atual é deste mês (ex: 05/01 a 04/02)
        cycleStart = new Date(now.getFullYear(), now.getMonth(), 5, 0, 0, 0);
        cycleEnd = new Date(now.getFullYear(), now.getMonth() + 1, 4, 23, 59, 59);
        paymentDate = new Date(now.getFullYear(), now.getMonth() + 1, 5);
        // Ciclo anterior (para pagamentos pendentes)
        previousCycleStart = new Date(now.getFullYear(), now.getMonth() - 1, 5, 0, 0, 0);
        previousCycleEnd = new Date(now.getFullYear(), now.getMonth(), 4, 23, 59, 59);
      }
      
      const cycleStartISO = cycleStart.toISOString();
      const cycleEndISO = cycleEnd.toISOString();

      // Buscar pagamentos existentes
      const { data: paymentsData } = await supabase
        .from('organization_payments')
        .select('*');
      
      setPayments(paymentsData || []);

      // Buscar todos os revenue_shares para calcular resumo financeiro
      const { data: allRevenueData } = await supabase
        .from('revenue_shares')
        .select('platform_amount, organization_amount, photographer_amount, organization_id, created_at');

      let totalBruto = 0;
      let platformRevenue = 0;
      let pendingToOrgs = 0;

      (allRevenueData || []).forEach(rev => {
        const total = Number(rev.platform_amount) + Number(rev.organization_amount) + Number(rev.photographer_amount);
        totalBruto += total;
        platformRevenue += Number(rev.platform_amount);
      });

      // Calcular últimos 3 meses de histórico (ciclos anteriores ao atual)
      const historicalData: MonthlyRevenue[] = [];
      
      for (let monthOffset = 1; monthOffset <= 3; monthOffset++) {
        let histCycleStart: Date;
        let histCycleEnd: Date;
        let histPaymentDate: Date;
        
        if (currentDay < 5) {
          // Antes do dia 5: histórico começa do ciclo anterior ao atual
          histCycleStart = new Date(now.getFullYear(), now.getMonth() - 1 - monthOffset, 5, 0, 0, 0);
          histCycleEnd = new Date(now.getFullYear(), now.getMonth() - monthOffset, 4, 23, 59, 59);
          histPaymentDate = new Date(now.getFullYear(), now.getMonth() - monthOffset, 5);
        } else {
          // Após o dia 5: histórico começa do ciclo anterior ao atual
          histCycleStart = new Date(now.getFullYear(), now.getMonth() - monthOffset, 5, 0, 0, 0);
          histCycleEnd = new Date(now.getFullYear(), now.getMonth() + 1 - monthOffset, 4, 23, 59, 59);
          histPaymentDate = new Date(now.getFullYear(), now.getMonth() + 1 - monthOffset, 5);
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

          // Verificar se pagamento já foi feito para este ciclo
          const payment = (paymentsData || []).find(p => 
            p.organization_id === org.id && 
            p.cycle_start === cycleStart.toISOString().split('T')[0] &&
            p.status === 'paid'
          );

          if (!payment && cycleRevenue > 0) {
            pendingToOrgs += cycleRevenue;
          }

          return { 
            ...org, 
            monthly_revenue: cycleRevenue,
            cycle_start: cycleStart,
            cycle_end: cycleEnd,
            payment_date: paymentDate
          };
        })
      );

      setFinancialSummary({ totalBruto, platformRevenue, pendingToOrgs });
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

  const handleConfirmPayment = async (org: Organization) => {
    if (!org.cycle_start || !org.cycle_end) return;
    
    setConfirmingPayment(org.id);
    
    try {
      const cycleStartStr = org.cycle_start.toISOString().split('T')[0];
      const cycleEndStr = org.cycle_end.toISOString().split('T')[0];

      // Verificar se já existe registro de pagamento
      const { data: existingPayment } = await supabase
        .from('organization_payments')
        .select('*')
        .eq('organization_id', org.id)
        .eq('cycle_start', cycleStartStr)
        .single();

      if (existingPayment) {
        // Atualizar para pago
        const { error } = await supabase
          .from('organization_payments')
          .update({
            status: 'paid',
            paid_at: new Date().toISOString(),
            paid_by: user?.id
          })
          .eq('id', existingPayment.id);

        if (error) throw error;
      } else {
        // Criar novo registro
        const { error } = await supabase
          .from('organization_payments')
          .insert({
            organization_id: org.id,
            cycle_start: cycleStartStr,
            cycle_end: cycleEndStr,
            amount: org.monthly_revenue || 0,
            status: 'paid',
            paid_at: new Date().toISOString(),
            paid_by: user?.id
          });

        if (error) throw error;
      }

      toast({
        title: "Pagamento confirmado!",
        description: `Pagamento de R$ ${(org.monthly_revenue || 0).toFixed(2)} para ${org.name} foi registrado.`,
      });

      fetchOrganizations();
    } catch (error) {
      console.error('Error confirming payment:', error);
      toast({
        title: "Erro ao confirmar pagamento",
        description: "Não foi possível registrar o pagamento.",
        variant: "destructive",
      });
    } finally {
      setConfirmingPayment(null);
    }
  };

  const getPaymentStatus = (org: Organization) => {
    if (!org.cycle_start) return null;
    
    const cycleStartStr = org.cycle_start.toISOString().split('T')[0];
    const payment = payments.find(p => 
      p.organization_id === org.id && 
      p.cycle_start === cycleStartStr
    );

    return payment;
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
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organizações</h1>
          <p className="text-muted-foreground">Gerencie organizações, pagamentos e receitas</p>
        </div>

        {/* Resumo Financeiro */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita Total Bruta</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                R$ {financialSummary.totalBruto.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">Total de vendas na plataforma</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita da Plataforma</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                R$ {financialSummary.platformRevenue.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">Taxa da plataforma (site)</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendente às Organizações</CardTitle>
              <Building2 className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">
                R$ {financialSummary.pendingToOrgs.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">A pagar no ciclo atual</p>
            </CardContent>
          </Card>
        </div>

        {/* Ciclo de Pagamento Atual */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Ciclo de Pagamento Atual</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {organizations.map((org) => {
              const payment = getPaymentStatus(org);
              const isPaid = payment?.status === 'paid';
              const hasRevenue = (org.monthly_revenue || 0) > 0;
              
              return (
                <Card key={org.id} className={`border-l-4 ${isPaid ? 'border-l-green-500' : 'border-l-amber-500'}`}>
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {org.name}
                    </CardTitle>
                    {isPaid ? (
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                        <Check className="h-3 w-3 mr-1" />
                        Pago
                      </Badge>
                    ) : hasRevenue ? (
                      <Badge variant="outline" className="border-amber-500 text-amber-600">
                        <Clock className="h-3 w-3 mr-1" />
                        Pendente
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        Sem receita
                      </Badge>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      R$ {(org.monthly_revenue || 0).toFixed(2)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Ciclo: {org.cycle_start?.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} - {org.cycle_end?.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </p>
                    
                    {isPaid && payment?.paid_at && (
                      <p className="text-xs text-green-600 mt-2">
                        ✓ Pago em {format(new Date(payment.paid_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    )}

                    {!isPaid && hasRevenue && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            className="w-full mt-3" 
                            variant="default"
                            disabled={confirmingPayment === org.id}
                          >
                            {confirmingPayment === org.id ? (
                              <span className="animate-spin">⏳</span>
                            ) : (
                              <>
                                <Check className="h-4 w-4 mr-2" />
                                Confirmar Pagamento
                              </>
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar Pagamento</AlertDialogTitle>
                            <AlertDialogDescription>
                              Você está confirmando o pagamento de <strong>R$ {(org.monthly_revenue || 0).toFixed(2)}</strong> para <strong>{org.name}</strong>.
                              <br /><br />
                              Esta ação registrará o pagamento como realizado. Certifique-se de que o valor foi transferido antes de confirmar.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleConfirmPayment(org)}>
                              Confirmar Pagamento
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
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
                    {Array.from(new Set(historicalRevenue.map(h => h.month_label))).map(monthLabel => {
                      const monthRevenues = historicalRevenue.filter(h => h.month_label === monthLabel);
                      const firstItem = monthRevenues[0];
                      
                      return (
                        <div key={monthLabel}>
                          <h4 className="font-medium text-sm text-muted-foreground mb-2 capitalize">{monthLabel}</h4>
                          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                            {monthRevenues.map((item, idx) => {
                              // Verificar status de pagamento para histórico
                              const cycleStartStr = item.cycle_start.toISOString().split('T')[0];
                              const payment = payments.find(p => 
                                p.organization_id === item.organization_id && 
                                p.cycle_start === cycleStartStr
                              );
                              const isPaid = payment?.status === 'paid';

                              return (
                                <Card key={`${item.organization_id}-${idx}`} className={`border-l-4 ${isPaid ? 'border-l-green-500' : 'border-l-blue-500'}`}>
                                  <CardContent className="p-4">
                                    <div className="flex justify-between items-center">
                                      <span className="font-medium">{item.organization_name}</span>
                                      <span className="text-lg font-bold">
                                        R$ {item.revenue.toFixed(2)}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between mt-2">
                                      <p className="text-xs text-muted-foreground">
                                        {item.cycle_start.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} - {item.cycle_end.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                      </p>
                                      {isPaid ? (
                                        <Badge className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                                          <Check className="h-3 w-3 mr-1" />
                                          Pago
                                        </Badge>
                                      ) : item.revenue > 0 ? (
                                        <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">
                                          <AlertCircle className="h-3 w-3 mr-1" />
                                          Não pago
                                        </Badge>
                                      ) : null}
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
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