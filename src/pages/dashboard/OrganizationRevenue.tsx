import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DollarSign, 
  Calendar, 
  TrendingUp, 
  Building2, 
  Camera, 
  User, 
  ShoppingCart,
  Clock,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Receipt,
  CalendarDays,
  ImageIcon,
  History
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface OrganizationData {
  id: string;
  name: string;
  admin_percentage: number;
}

interface SaleData {
  id: string;
  organization_amount: number;
  photographer_amount: number;
  created_at: string;
  purchase_id: string;
  photographer_name: string | null;
  buyer_name: string | null;
  photo_title: string | null;
  campaign_title: string | null;
  event_date: string | null;
  purchase_amount: number;
}

interface EventRevenue {
  campaignId: string;
  campaignTitle: string;
  eventDate: string;
  totalRevenue: number;
  salesCount: number;
  sales: SaleData[];
}

interface CycleData {
  cycleStart: Date;
  cycleEnd: Date;
  paymentDate: Date;
  daysUntilPayment: number;
  label: string;
  isCurrentCycle: boolean;
  isPast: boolean;
  sales: SaleData[];
}

interface AllTimeTotals {
  totalRevenue: number;
  totalSales: number;
  allSales: SaleData[];
}

const OrganizationRevenue = () => {
  const { user, profile } = useAuth();
  const [organization, setOrganization] = useState<OrganizationData | null>(null);
  const [cycles, setCycles] = useState<CycleData[]>([]);
  const [allTimeTotals, setAllTimeTotals] = useState<AllTimeTotals>({ totalRevenue: 0, totalSales: 0, allSales: [] });
  const [loading, setLoading] = useState(true);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [selectedCycle, setSelectedCycle] = useState<string>('0');

  useEffect(() => {
    if (user && profile?.role === 'organization') {
      fetchOrganizationData();
    }
  }, [user, profile]);

  const calculateCycles = (): Omit<CycleData, 'sales'>[] => {
    const now = new Date();
    const currentDay = now.getDate();
    const cyclesData: Omit<CycleData, 'sales'>[] = [];

    // Calcular 6 ciclos para cobrir mais histórico
    for (let i = 0; i < 6; i++) {
      let cycleStart: Date;
      let cycleEnd: Date;
      let paymentDate: Date;

      if (currentDay < 5) {
        cycleStart = new Date(now.getFullYear(), now.getMonth() - 2 - i, 5, 0, 0, 0);
        cycleEnd = new Date(now.getFullYear(), now.getMonth() - 1 - i, 4, 23, 59, 59);
        paymentDate = new Date(now.getFullYear(), now.getMonth() - 1 - i, 5);
      } else {
        cycleStart = new Date(now.getFullYear(), now.getMonth() - 1 - i, 5, 0, 0, 0);
        cycleEnd = new Date(now.getFullYear(), now.getMonth() - i, 4, 23, 59, 59);
        paymentDate = new Date(now.getFullYear(), now.getMonth() - i, 5);
      }

      const daysUntilPayment = Math.ceil((paymentDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const isPast = daysUntilPayment < 0;
      
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const label = i === 0 
        ? 'Ciclo Atual' 
        : `${monthNames[cycleStart.getMonth()]}/${cycleStart.getFullYear()}`;

      cyclesData.push({
        cycleStart,
        cycleEnd,
        paymentDate,
        daysUntilPayment,
        label,
        isCurrentCycle: i === 0,
        isPast
      });
    }

    return cyclesData;
  };

  const fetchOrganizationData = async () => {
    try {
      setLoading(true);

      // 1. Buscar organização do usuário
      const { data: orgUser, error: orgUserError } = await supabase
        .from('organization_users')
        .select('organization_id, organizations(*)')
        .eq('user_id', user?.id)
        .single();

      if (orgUserError) throw orgUserError;
      if (!orgUser) throw new Error('Organization not found');

      const org = orgUser.organizations as unknown as OrganizationData;
      setOrganization(org);

      console.log('📊 Buscando dados da organização:', org.name, 'ID:', org.id);

      // 2. PRIMEIRO: Buscar TODAS as vendas (sem filtro de data) para mostrar histórico total
      const { data: allSalesData, error: allSalesError } = await supabase
        .from('revenue_shares')
        .select(`
          id,
          organization_amount,
          photographer_amount,
          created_at,
          purchase_id,
          photographer_id,
          purchases (
            amount,
            buyer_id,
            photo_id,
            photos (
              title,
              campaign_id,
              campaigns (
                title,
                event_date
              )
            )
          )
        `)
        .eq('organization_id', org.id)
        .order('created_at', { ascending: false });

      if (allSalesError) {
        console.error('❌ Erro ao buscar todas as vendas:', allSalesError);
        throw allSalesError;
      }

      console.log('✅ Total de vendas encontradas:', allSalesData?.length || 0);

      // Processar todas as vendas
      const processedAllSales: SaleData[] = [];
      for (const sale of allSalesData || []) {
        let photographerName = null;
        if (sale.photographer_id) {
          const { data: photographer } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', sale.photographer_id)
            .single();
          photographerName = photographer?.full_name || 'Fotógrafo';
        }

        let buyerName = null;
        const purchase = sale.purchases as any;
        if (purchase?.buyer_id) {
          const { data: buyer } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', purchase.buyer_id)
            .single();
          buyerName = buyer?.full_name || 'Cliente';
        }

        processedAllSales.push({
          id: sale.id,
          organization_amount: Number(sale.organization_amount),
          photographer_amount: Number(sale.photographer_amount),
          created_at: sale.created_at,
          purchase_id: sale.purchase_id,
          photographer_name: photographerName,
          buyer_name: buyerName,
          photo_title: purchase?.photos?.title || 'Foto',
          campaign_title: purchase?.photos?.campaigns?.title || 'Evento',
          event_date: purchase?.photos?.campaigns?.event_date,
          purchase_amount: Number(purchase?.amount || 0),
        });
      }

      const totalAllTimeRevenue = processedAllSales.reduce((sum, sale) => sum + sale.organization_amount, 0);
      console.log('💰 Total histórico:', totalAllTimeRevenue);

      setAllTimeTotals({
        totalRevenue: totalAllTimeRevenue,
        totalSales: processedAllSales.length,
        allSales: processedAllSales
      });

      // 3. Calcular os ciclos
      const cyclesInfo = calculateCycles();

      // 4. Distribuir vendas nos ciclos
      const cyclesWithSales: CycleData[] = cyclesInfo.map(cycle => {
        const cycleSales = processedAllSales.filter(sale => {
          const saleDate = new Date(sale.created_at);
          return saleDate >= cycle.cycleStart && saleDate <= cycle.cycleEnd;
        });
        
        return {
          ...cycle,
          sales: cycleSales
        };
      });

      // Filtrar apenas ciclos com vendas ou os 3 primeiros
      const relevantCycles = cyclesWithSales.filter((cycle, index) => 
        cycle.sales.length > 0 || index < 3
      ).slice(0, 6);

      setCycles(relevantCycles);

    } catch (error) {
      console.error('Error fetching organization data:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados da organização.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTotalRevenue = (sales: SaleData[]) => {
    return sales.reduce((sum, sale) => sum + sale.organization_amount, 0);
  };

  const getEventRevenues = (sales: SaleData[]): EventRevenue[] => {
    const eventMap = new Map<string, EventRevenue>();

    sales.forEach(sale => {
      const campaignTitle = sale.campaign_title || 'Evento';
      const campaignId = sale.campaign_title || 'unknown';
      
      if (!eventMap.has(campaignId)) {
        eventMap.set(campaignId, {
          campaignId,
          campaignTitle,
          eventDate: sale.event_date || '',
          totalRevenue: 0,
          salesCount: 0,
          sales: []
        });
      }

      const event = eventMap.get(campaignId)!;
      event.totalRevenue += sale.organization_amount;
      event.salesCount += 1;
      event.sales.push(sale);
    });

    return Array.from(eventMap.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);
  };

  const toggleEventExpanded = (eventId: string) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
    }
    setExpandedEvents(newExpanded);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Use allTimeTotals from state instead of calculating from cycles
  const displayAllTimeRevenue = allTimeTotals.totalRevenue;
  const displayAllTimeSales = allTimeTotals.totalSales;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary"></div>
          <Building2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-primary" />
        </div>
        <p className="text-muted-foreground animate-pulse">Carregando dados da organização...</p>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="p-6 rounded-full bg-destructive/10">
          <Building2 className="h-12 w-12 text-destructive" />
        </div>
        <h2 className="text-2xl font-bold">Organização não encontrada</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Não foi possível encontrar sua organização. Entre em contato com o suporte se o problema persistir.
        </p>
      </div>
    );
  }

  const currentCycle = cycles[parseInt(selectedCycle)] || cycles[0];
  const currentCycleSales = currentCycle?.sales || [];
  const currentCycleRevenue = getTotalRevenue(currentCycleSales);
  const currentCycleEvents = getEventRevenues(currentCycleSales);

  return (
    <div className="space-y-8 pb-8">
      {/* Header com Gradiente */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border p-6 md:p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{organization.name}</h1>
              <p className="text-muted-foreground">
                Relatório Financeiro Transparente
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
              <TrendingUp className="h-3 w-3 mr-1" />
              Participação: {organization.admin_percentage}%
            </Badge>
            <Badge variant="outline" className="bg-background/50">
              <History className="h-3 w-3 mr-1" />
              Últimos 3 ciclos
            </Badge>
          </div>
        </div>
      </div>

      {/* Resumo Geral - Todos os ciclos */}
      <Card className="bg-gradient-to-r from-emerald-500/5 via-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            Resumo dos Últimos 3 Meses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-background/50 border">
              <p className="text-sm text-muted-foreground mb-1">Receita Total</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(displayAllTimeRevenue)}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-background/50 border">
              <p className="text-sm text-muted-foreground mb-1">Total de Vendas</p>
              <p className="text-2xl font-bold">{displayAllTimeSales}</p>
            </div>
            <div className="p-4 rounded-lg bg-background/50 border">
              <p className="text-sm text-muted-foreground mb-1">Média por Ciclo</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {formatCurrency(displayAllTimeRevenue / Math.max(cycles.length, 1))}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-background/50 border">
              <p className="text-sm text-muted-foreground mb-1">Ciclos Analisados</p>
              <p className="text-2xl font-bold">{cycles.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs para alternar entre ciclos */}
      <Tabs value={selectedCycle} onValueChange={setSelectedCycle} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 h-auto p-1">
          {cycles.map((cycle, index) => (
            <TabsTrigger 
              key={index} 
              value={index.toString()}
              className="flex flex-col gap-1 py-3 px-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <span className="font-semibold text-sm">{cycle.label}</span>
              <span className="text-xs opacity-80">
                {formatCurrency(getTotalRevenue(cycle.sales))}
              </span>
              {cycle.isCurrentCycle && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 mt-1">
                  Atual
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {cycles.map((cycle, cycleIndex) => (
          <TabsContent key={cycleIndex} value={cycleIndex.toString()} className="space-y-6">
            {/* Card de Ciclo de Pagamento */}
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-b">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-amber-500/10">
                        <CalendarDays className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{cycle.label}</CardTitle>
                        <CardDescription className="mt-0.5">
                          {formatDate(cycle.cycleStart.toISOString())} até {formatDate(cycle.cycleEnd.toISOString())}
                        </CardDescription>
                      </div>
                    </div>
                    {cycle.isPast ? (
                      <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20">
                        ✓ Pago
                      </Badge>
                    ) : cycle.daysUntilPayment === 0 ? (
                      <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 animate-pulse">
                        Pagamento Hoje!
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1">
                        <Clock className="h-3 w-3" />
                        {cycle.daysUntilPayment} dias para pagamento
                      </Badge>
                    )}
                  </div>
                </CardHeader>
              </div>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground mb-1">
                      {cycle.isPast ? 'Pago em' : 'Pagamento previsto'}
                    </p>
                    <p className="text-xl font-semibold">
                      {cycle.paymentDate.toLocaleDateString('pt-BR', { 
                        day: '2-digit', 
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                  <Separator orientation="vertical" className="h-12" />
                  <div className="flex-1 text-right">
                    <p className="text-sm text-muted-foreground mb-1">
                      {cycle.isPast ? 'Valor Recebido' : 'Valor a Receber'}
                    </p>
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(getTotalRevenue(cycle.sales))}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cards de Métricas do Ciclo */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
              <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 hover:border-emerald-500/50">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Receita do Ciclo</CardTitle>
                  <div className="p-2 rounded-lg bg-emerald-500/10">
                    <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(getTotalRevenue(cycle.sales))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Sua participação neste ciclo
                  </p>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 hover:border-blue-500/50">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Fotos Vendidas</CardTitle>
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <ShoppingCart className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{cycle.sales.length}</div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Vendas concluídas
                  </p>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 hover:border-purple-500/50">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Eventos</CardTitle>
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <BarChart3 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{getEventRevenues(cycle.sales).length}</div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Com vendas no período
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Vendas por Evento */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">Vendas por Evento</h2>
              </div>
              
              {getEventRevenues(cycle.sales).length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
                    <div className="p-4 rounded-full bg-muted">
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div className="text-center">
                      <p className="font-medium">Nenhuma venda neste ciclo</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        As vendas aparecerão aqui quando ocorrerem
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {getEventRevenues(cycle.sales).map((event) => (
                    <Collapsible
                      key={`${cycleIndex}-${event.campaignId}`}
                      open={expandedEvents.has(`${cycleIndex}-${event.campaignId}`)}
                      onOpenChange={() => toggleEventExpanded(`${cycleIndex}-${event.campaignId}`)}
                    >
                      <Card className="overflow-hidden transition-all duration-300 hover:shadow-md">
                        <CollapsibleTrigger className="w-full text-left">
                          <CardContent className="p-4 md:p-6">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-start gap-4 flex-1 min-w-0">
                                <div className="p-3 rounded-xl bg-primary/10 shrink-0">
                                  <Calendar className="h-5 w-5 text-primary" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h3 className="font-semibold text-lg truncate">{event.campaignTitle}</h3>
                                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                                    {event.eventDate && (
                                      <span className="flex items-center gap-1.5">
                                        <CalendarDays className="h-3.5 w-3.5" />
                                        {formatDate(event.eventDate)}
                                      </span>
                                    )}
                                    <span className="flex items-center gap-1.5">
                                      <ImageIcon className="h-3.5 w-3.5" />
                                      {event.salesCount} {event.salesCount === 1 ? 'foto' : 'fotos'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <p className="text-xs text-muted-foreground mb-0.5">Sua receita</p>
                                  <p className="text-xl md:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                    {formatCurrency(event.totalRevenue)}
                                  </p>
                                </div>
                                <div className="p-2 rounded-lg bg-muted">
                                  {expandedEvents.has(`${cycleIndex}-${event.campaignId}`) ? (
                                    <ChevronUp className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </CollapsibleTrigger>
                        
                        <CollapsibleContent>
                          <div className="border-t bg-muted/30">
                            <div className="p-4 md:p-6">
                              <div className="flex items-center gap-2 mb-4">
                                <Receipt className="h-4 w-4 text-muted-foreground" />
                                <h4 className="font-medium text-sm text-muted-foreground">
                                  Detalhes das Vendas
                                </h4>
                              </div>
                              
                              <div className="rounded-lg border overflow-hidden bg-background">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="bg-muted/50">
                                      <TableHead className="font-semibold">Data/Hora</TableHead>
                                      <TableHead className="font-semibold">
                                        <div className="flex items-center gap-1.5">
                                          <Camera className="h-3.5 w-3.5" />
                                          Fotógrafo
                                        </div>
                                      </TableHead>
                                      <TableHead className="font-semibold">
                                        <div className="flex items-center gap-1.5">
                                          <User className="h-3.5 w-3.5" />
                                          Comprador
                                        </div>
                                      </TableHead>
                                      <TableHead className="text-right font-semibold">Valor Total</TableHead>
                                      <TableHead className="text-right font-semibold">Sua Receita</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {event.sales.map((sale, index) => (
                                      <TableRow 
                                        key={sale.id}
                                        className={index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}
                                      >
                                        <TableCell>
                                          <div>
                                            <p className="font-medium">{formatDate(sale.created_at)}</p>
                                            <p className="text-xs text-muted-foreground">{formatTime(sale.created_at)}</p>
                                          </div>
                                        </TableCell>
                                        <TableCell>
                                          <span className="text-sm">{sale.photographer_name || 'N/A'}</span>
                                        </TableCell>
                                        <TableCell>
                                          <span className="text-sm">{sale.buyer_name || 'N/A'}</span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                          <span className="text-sm text-muted-foreground">
                                            {formatCurrency(sale.purchase_amount)}
                                          </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                            {formatCurrency(sale.organization_amount)}
                                          </span>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                              
                              {/* Resumo do Evento */}
                              <div className="mt-4 p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-muted-foreground">
                                    Total do evento ({event.salesCount} {event.salesCount === 1 ? 'venda' : 'vendas'})
                                  </span>
                                  <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                    {formatCurrency(event.totalRevenue)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  ))}
                </div>
              )}
            </div>

            {/* Histórico Completo do Ciclo */}
            {cycle.sales.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold">Histórico Completo - {cycle.label}</h2>
                </div>
                
                <Card>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="font-semibold min-w-[120px]">Data</TableHead>
                            <TableHead className="font-semibold min-w-[150px]">Evento</TableHead>
                            <TableHead className="font-semibold min-w-[130px]">Fotógrafo</TableHead>
                            <TableHead className="font-semibold min-w-[130px]">Comprador</TableHead>
                            <TableHead className="text-right font-semibold min-w-[100px]">Valor Venda</TableHead>
                            <TableHead className="text-right font-semibold min-w-[100px]">Sua Receita</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cycle.sales.map((sale, index) => (
                            <TableRow 
                              key={sale.id}
                              className={index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}
                            >
                              <TableCell>
                                <div>
                                  <p className="font-medium">{formatDate(sale.created_at)}</p>
                                  <p className="text-xs text-muted-foreground">{formatTime(sale.created_at)}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium truncate max-w-[180px]">{sale.campaign_title}</p>
                                  {sale.event_date && (
                                    <p className="text-xs text-muted-foreground">
                                      Evento: {formatDate(sale.event_date)}
                                    </p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Camera className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="text-sm">{sale.photographer_name || 'N/A'}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="text-sm">{sale.buyer_name || 'N/A'}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(sale.purchase_amount)}
                              </TableCell>
                              <TableCell className="text-right">
                                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                  {formatCurrency(sale.organization_amount)}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    
                    {/* Rodapé com Total */}
                    <div className="p-4 border-t bg-muted/30">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                          <span className="font-medium">{cycle.sales.length}</span> vendas neste ciclo
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground">Total:</span>
                          <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(getTotalRevenue(cycle.sales))}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Rodapé com informações de transparência */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="py-6">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold mb-1">Transparência Total</h4>
              <p className="text-sm text-muted-foreground">
                Todas as vendas são registradas automaticamente e você pode acompanhar 
                em tempo real o detalhamento de cada transação. O pagamento é realizado 
                no dia 5 de cada mês referente ao ciclo anterior. Este relatório mostra 
                os últimos 3 ciclos de pagamento para maior transparência.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrganizationRevenue;
