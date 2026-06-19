import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

const EVENTS_PAGE_SIZE = 5;

const OrganizationRevenue = () => {
  const { user, profile } = useAuth();
  const [organization, setOrganization] = useState<OrganizationData | null>(null);
  const [cycles, setCycles] = useState<CycleData[]>([]);
  const [allTimeTotals, setAllTimeTotals] = useState<AllTimeTotals>({ totalRevenue: 0, totalSales: 0, allSales: [] });
  const [loading, setLoading] = useState(true);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [selectedCycle, setSelectedCycle] = useState<string>('0');
  const [currentEventPage, setCurrentEventPage] = useState(1);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    if (!profile) {
      return;
    }

    if (profile.role !== 'organization') {
      setLoading(false);
      return;
    }

    fetchOrganizationData();
  }, [user?.id, profile?.role]);

  const calculateCycles = (): Omit<CycleData, 'sales'>[] => {
    const now = new Date();
    const currentDay = now.getDate();
    const cyclesData: Omit<CycleData, 'sales'>[] = [];

    // Calcular ciclos baseado no dia 5 de cada mês
    // Ciclo: dia 5 do mês X até dia 4 do mês X+1
    // Se hoje é dia 23/12/2025:
    // - Ciclo atual: 05/12/2025 a 04/01/2026 (ainda não fechou)
    // - Ciclo anterior: 05/11/2025 a 04/12/2025 (já fechou, pago em 05/12)
    
    for (let i = 0; i < 6; i++) {
      let cycleStart: Date;
      let cycleEnd: Date;
      let paymentDate: Date;

      if (currentDay >= 5) {
        // Estamos após o dia 5, então o ciclo atual começou este mês
        // Ciclo 0 (atual): mês atual dia 5 até próximo mês dia 4
        cycleStart = new Date(now.getFullYear(), now.getMonth() - i, 5, 0, 0, 0);
        cycleEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 4, 23, 59, 59);
        paymentDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 5);
      } else {
        // Estamos antes do dia 5, então o ciclo atual começou mês passado
        cycleStart = new Date(now.getFullYear(), now.getMonth() - 1 - i, 5, 0, 0, 0);
        cycleEnd = new Date(now.getFullYear(), now.getMonth() - i, 4, 23, 59, 59);
        paymentDate = new Date(now.getFullYear(), now.getMonth() - i, 5);
      }

      const daysUntilPayment = Math.ceil((paymentDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const isPast = paymentDate < now;
      
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

  // Helper para paginação (evitar limite de 1000 registros do Supabase)
  const fetchAllFromTable = async (buildQuery: (from: number, to: number) => any) => {
    const PAGE_SIZE = 1000;
    let all: any[] = [];
    let from = 0;
    while (true) {
      const { data, error } = await buildQuery(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      all = [...all, ...(data || [])];
      if (!data || data.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }
    return all;
  };

  const fetchOrganizationData = async () => {
    try {
      setLoading(true);
      
      console.log('🔍 Buscando dados de organização para usuário:', user?.id, 'Role:', profile?.role);

      // 1. Buscar organização do usuário
      const { data: orgUser, error: orgUserError } = await supabase
        .from('organization_users')
        .select('organization_id, organizations(*)')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (orgUserError) {
        console.error('❌ Erro ao buscar vínculo organização:', orgUserError);
        console.error('Código do erro:', orgUserError.code, 'Detalhes:', orgUserError.details);
        
        if (orgUserError.code === 'PGRST301' || orgUserError.message?.includes('permission')) {
          toast({
            title: "Erro de permissão",
            description: "Você não tem permissão para acessar os dados da organização. Entre em contato com o suporte.",
            variant: "destructive",
          });
        }
        throw orgUserError;
      }
      
      console.log('📋 Resultado da busca de vínculo:', orgUser);
      
      if (!orgUser || !orgUser.organizations) {
        console.log('⚠️ Usuário não está vinculado a nenhuma organização. User ID:', user?.id);
        setOrganization(null);
        setLoading(false);
        return;
      }

      const org = orgUser.organizations as unknown as OrganizationData;
      setOrganization(org);

      console.log('📊 Buscando dados da organização:', org.name, 'ID:', org.id);

      // 2. Buscar TODAS as vendas COM PAGINAÇÃO (apenas compras completed)
      const allSalesData = await fetchAllFromTable((from, to) =>
        supabase
          .from('revenue_shares')
          .select(`
            id,
            organization_amount,
            photographer_amount,
            platform_amount,
            created_at,
            purchase_id,
            photographer_id,
            purchases!inner (
              amount,
              status,
              created_at,
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
          .eq('purchases.status', 'completed')
          .gt('organization_amount', 0)
          .order('created_at', { ascending: false })
          .range(from, to)
      );

      console.log('✅ Total de vendas encontradas:', allSalesData?.length || 0);

      console.log('✅ Total de vendas encontradas:', allSalesData?.length || 0);

      // Buscar todos os fotógrafos e compradores de uma vez (performance)
      const photographerIds = [...new Set((allSalesData || []).map(s => s.photographer_id).filter(Boolean))];
      const buyerIds = [...new Set((allSalesData || []).map(s => (s.purchases as any)?.buyer_id).filter(Boolean))];
      
      const [photographersResult, buyersResult] = await Promise.all([
        photographerIds.length > 0 
          ? supabase.from('profiles').select('id, full_name, email').in('id', photographerIds)
          : Promise.resolve({ data: [] }),
        buyerIds.length > 0 
          ? supabase.from('profiles').select('id, full_name, email').in('id', buyerIds)
          : Promise.resolve({ data: [] })
      ]);
      
      const photographerMap = new Map((photographersResult.data || []).map(p => [p.id, p]));
      const buyerMap = new Map((buyersResult.data || []).map(b => [b.id, b]));

      // Processar todas as vendas (usar data da compra para ciclos)
      const processedAllSales: SaleData[] = [];
      for (const sale of allSalesData || []) {
        const purchase = sale.purchases as any;
        if (!purchase) continue; // Skip if no purchase (shouldn't happen with !inner)
        
        const photographerName = sale.photographer_id 
          ? (photographerMap.get(sale.photographer_id)?.full_name || photographerMap.get(sale.photographer_id)?.email || 'Fotógrafo')
          : null;
        const buyerName = purchase?.buyer_id 
          ? (buyerMap.get(purchase.buyer_id)?.full_name || buyerMap.get(purchase.buyer_id)?.email?.split('@')[0] || 'Cliente')
          : null;

        // Calcular valor total da venda (soma de todas as partes)
        const purchaseAmount = Number(purchase?.amount || 0);
        const totalSaleValue = purchaseAmount > 0 
          ? purchaseAmount 
          : (Number(sale.organization_amount) + Number(sale.photographer_amount) + Number(sale.platform_amount || 0));

        processedAllSales.push({
          id: sale.id,
          organization_amount: Number(sale.organization_amount),
          photographer_amount: Number(sale.photographer_amount),
          // Usar data da compra (não do revenue_share) para agrupar em ciclos
          created_at: purchase.created_at || sale.created_at,
          purchase_id: sale.purchase_id,
          photographer_name: photographerName,
          buyer_name: buyerName,
          photo_title: purchase?.photos?.title || 'Foto',
          campaign_title: purchase?.photos?.campaigns?.title || 'Evento',
          event_date: purchase?.photos?.campaigns?.event_date,
          purchase_amount: totalSaleValue,
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
  const currentCycleIndex = Number(selectedCycle);

  const currentCycle = useMemo(() => cycles[currentCycleIndex] || cycles[0], [cycles, currentCycleIndex]);
  const currentCycleSales = currentCycle?.sales || [];
  const currentCycleRevenue = useMemo(() => getTotalRevenue(currentCycleSales), [currentCycleSales]);
  const currentCycleEvents = useMemo(() => getEventRevenues(currentCycleSales), [currentCycleSales]);
  const totalEventPages = Math.max(Math.ceil(currentCycleEvents.length / EVENTS_PAGE_SIZE), 1);
  const paginatedEvents = useMemo(() => {
    const start = (currentEventPage - 1) * EVENTS_PAGE_SIZE;
    return currentCycleEvents.slice(start, start + EVENTS_PAGE_SIZE);
  }, [currentCycleEvents, currentEventPage]);

  useEffect(() => {
    if (currentEventPage > totalEventPages) {
      setCurrentEventPage(1);
    }
  }, [currentEventPage, totalEventPages]);

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

  if (profile && profile.role !== 'organization') {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="p-6 rounded-full bg-destructive/10">
          <Building2 className="h-12 w-12 text-destructive" />
        </div>
        <h2 className="text-2xl font-bold">Acesso restrito</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Esta área é exclusiva para contas de organização.
        </p>
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
          Não foi possível encontrar o vínculo com sua organização.
        </p>
        <div className="text-sm text-muted-foreground bg-muted p-4 rounded-lg max-w-md">
          <p className="mb-2"><strong>Possíveis causas:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li>Sua conta ainda não foi vinculada a uma organização</li>
            <li>O vínculo foi removido pelo administrador</li>
            <li>Houve um problema técnico temporário</li>
          </ul>
        </div>
        <div className="flex gap-3 mt-4">
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()}
          >
            Tentar novamente
          </Button>
          <Button asChild>
            <a href="mailto:suporte@stafotos.com">Contatar Suporte</a>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          ID do usuário: {user?.id?.slice(0, 8)}...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-28 md:pb-0">
      <div className="rounded-3xl border border-emerald-200/60 bg-gradient-to-r from-emerald-50 via-white to-sky-50 p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
              <Building2 className="h-3.5 w-3.5" />
              Financeiro da organização
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{organization.name}</h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground sm:text-base">
                Acompanhe repasses, eventos com vendas e o período de pagamento em uma visão mais direta.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border bg-white/80 px-4 py-3 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Participação da organização</p>
            <p className="mt-1 text-2xl font-bold text-emerald-700">{organization.admin_percentage}%</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-emerald-200/70 bg-gradient-to-br from-emerald-50 to-white shadow-sm">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <DollarSign className="h-4 w-4 text-emerald-600" />
              Receita total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700 sm:text-3xl">{formatCurrency(displayAllTimeRevenue)}</div>
            <p className="mt-1 text-xs text-muted-foreground">Soma dos ciclos carregados</p>
          </CardContent>
        </Card>

        <Card className="border-sky-200/70 bg-gradient-to-br from-sky-50 to-white shadow-sm">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <ShoppingCart className="h-4 w-4 text-sky-600" />
              Total de vendas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-sky-700 sm:text-3xl">{displayAllTimeSales}</div>
            <p className="mt-1 text-xs text-muted-foreground">Compras concluídas com repasse</p>
          </CardContent>
        </Card>

        <Card className="border-amber-200/70 bg-gradient-to-br from-amber-50 to-white shadow-sm">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <TrendingUp className="h-4 w-4 text-amber-600" />
              Média por ciclo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700 sm:text-3xl">
              {formatCurrency(displayAllTimeRevenue / Math.max(cycles.length, 1))}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Referência para os ciclos exibidos</p>
          </CardContent>
        </Card>

        <Card className="border-violet-200/70 bg-gradient-to-br from-violet-50 to-white shadow-sm">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <BarChart3 className="h-4 w-4 text-violet-600" />
              Eventos no ciclo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-violet-700 sm:text-3xl">{currentCycleEvents.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">Com vendas no ciclo ativo</p>
          </CardContent>
        </Card>
      </div>

      <Tabs
        value={selectedCycle}
        onValueChange={(value) => {
          setSelectedCycle(value);
          setCurrentEventPage(1);
          setExpandedEvents(new Set());
        }}
        className="space-y-6"
      >
        <TabsList className="flex h-auto w-full flex-wrap rounded-2xl border bg-card p-1">
          {cycles.map((cycle, index) => (
            <TabsTrigger
              key={index}
              value={index.toString()}
              className="flex min-w-[120px] flex-1 flex-col gap-1 rounded-xl px-3 py-3 data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
            >
              <span className="text-sm font-semibold">{cycle.label}</span>
              <span className="text-xs opacity-80">{formatCurrency(getTotalRevenue(cycle.sales))}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedCycle} className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="border-b bg-gradient-to-r from-emerald-50 to-transparent p-4 sm:p-6">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl">
                    <CalendarDays className="h-5 w-5 text-emerald-600" />
                    {currentCycle?.label || 'Ciclo'}
                  </CardTitle>
                  <CardDescription className="mt-1 text-sm sm:text-base">
                    {currentCycle ? `${formatDate(currentCycle.cycleStart.toISOString())} até ${formatDate(currentCycle.cycleEnd.toISOString())}` : 'Sem período disponível'}
                  </CardDescription>
                </div>

                {currentCycle && (
                  currentCycle.isPast ? (
                    <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                      Pago em {formatDate(currentCycle.paymentDate.toISOString())}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1 border-amber-200 bg-amber-50 text-amber-700">
                      <Clock className="h-3.5 w-3.5" />
                      {currentCycle.daysUntilPayment === 0 ? 'Pagamento hoje' : `${currentCycle.daysUntilPayment} dias para pagamento`}
                    </Badge>
                  )
                )}
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4 sm:p-6">
              <div className="rounded-2xl border bg-muted/20 p-4">
                <p className="text-sm text-muted-foreground">Pagamento</p>
                <p className="mt-1 text-lg font-semibold">
                  {currentCycle?.paymentDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) || '—'}
                </p>
              </div>
              <div className="rounded-2xl border bg-muted/20 p-4">
                <p className="text-sm text-muted-foreground">Receita do ciclo</p>
                <p className="mt-1 text-lg font-semibold text-emerald-700">{formatCurrency(currentCycleRevenue)}</p>
              </div>
              <div className="rounded-2xl border bg-muted/20 p-4">
                <p className="text-sm text-muted-foreground">Vendas concluídas</p>
                <p className="mt-1 text-lg font-semibold">{currentCycleSales.length}</p>
              </div>
              <div className="rounded-2xl border bg-muted/20 p-4">
                <p className="text-sm text-muted-foreground">Eventos com vendas</p>
                <p className="mt-1 text-lg font-semibold">{currentCycleEvents.length}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="border-b bg-gradient-to-r from-sky-50 to-transparent p-4 sm:p-6">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl">
                    <BarChart3 className="h-5 w-5 text-sky-600" />
                    Vendas por evento
                  </CardTitle>
                  <CardDescription className="mt-1 text-sm sm:text-base">
                    Eventos mais recentes com detalhamento de comprador e fotógrafo
                  </CardDescription>
                </div>

                {currentCycleEvents.length > 0 && (
                  <div className="flex items-center gap-2 self-start lg:self-auto">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentEventPage((page) => Math.max(1, page - 1))}
                      disabled={currentEventPage === 1}
                    >
                      Anterior
                    </Button>
                    <Badge variant="secondary">
                      Página {currentEventPage} de {totalEventPages}
                    </Badge>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentEventPage((page) => Math.min(totalEventPages, page + 1))}
                      disabled={currentEventPage === totalEventPages}
                    >
                      Próxima
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {currentCycleEvents.length === 0 ? (
                <div className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
                  Nenhuma venda encontrada neste ciclo.
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Mostrando {Math.min((currentEventPage - 1) * EVENTS_PAGE_SIZE + 1, currentCycleEvents.length)}-{Math.min(currentEventPage * EVENTS_PAGE_SIZE, currentCycleEvents.length)} de {currentCycleEvents.length} eventos
                  </p>

                  {paginatedEvents.map((event) => {
                    const eventKey = `${selectedCycle}-${event.campaignId}`;
                    const isOpen = expandedEvents.has(eventKey);

                    return (
                      <Collapsible
                        key={eventKey}
                        open={isOpen}
                        onOpenChange={() => toggleEventExpanded(eventKey)}
                      >
                        <Card className="overflow-hidden rounded-2xl border shadow-sm">
                          <CollapsibleTrigger className="w-full text-left">
                            <CardContent className="p-4 sm:p-5">
                              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <div className="flex items-start gap-3 min-w-0">
                                  <div className="rounded-xl bg-primary/10 p-3">
                                    <Calendar className="h-5 w-5 text-primary" />
                                  </div>
                                  <div className="min-w-0">
                                    <h3 className="truncate text-base font-semibold sm:text-lg">{event.campaignTitle}</h3>
                                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                      {event.eventDate && <span>{formatDate(event.eventDate)}</span>}
                                      <span>{event.salesCount} {event.salesCount === 1 ? 'venda' : 'vendas'}</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between gap-3 lg:justify-end">
                                  <div className="text-left lg:text-right">
                                    <p className="text-xs text-muted-foreground">Sua receita</p>
                                    <p className="text-xl font-bold text-emerald-700">{formatCurrency(event.totalRevenue)}</p>
                                  </div>
                                  <div className="rounded-lg bg-muted p-2">
                                    {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </CollapsibleTrigger>

                          <CollapsibleContent>
                            <div className="border-t bg-muted/20 p-4 sm:p-5">
                              <div className="mb-4 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                <Receipt className="h-4 w-4" />
                                Detalhes das vendas
                              </div>

                              <div className="overflow-x-auto rounded-xl border bg-background">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="bg-muted/40">
                                      <TableHead>Data/Hora</TableHead>
                                      <TableHead>
                                        <div className="flex items-center gap-1.5">
                                          <Camera className="h-3.5 w-3.5" />
                                          Fotógrafo
                                        </div>
                                      </TableHead>
                                      <TableHead>
                                        <div className="flex items-center gap-1.5">
                                          <User className="h-3.5 w-3.5" />
                                          Cliente
                                        </div>
                                      </TableHead>
                                      <TableHead className="text-right">Valor total</TableHead>
                                      <TableHead className="text-right">Sua receita</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {event.sales.map((sale, index) => (
                                      <TableRow key={sale.id} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/10'}>
                                        <TableCell>
                                          <div>
                                            <p className="font-medium">{formatDate(sale.created_at)}</p>
                                            <p className="text-xs text-muted-foreground">{formatTime(sale.created_at)}</p>
                                          </div>
                                        </TableCell>
                                        <TableCell>{sale.photographer_name || 'N/A'}</TableCell>
                                        <TableCell>{sale.buyer_name || 'N/A'}</TableCell>
                                        <TableCell className="text-right text-muted-foreground">{formatCurrency(sale.purchase_amount)}</TableCell>
                                        <TableCell className="text-right font-semibold text-emerald-700">{formatCurrency(sale.organization_amount)}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          </CollapsibleContent>
                        </Card>
                      </Collapsible>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="border-dashed bg-muted/20 shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold">Transparência de repasse</h4>
              <p className="mt-1 text-sm text-muted-foreground">
                Cada venda concluída entra automaticamente no ciclo correspondente. Os valores exibidos mostram apenas compras finalizadas com repasse positivo para a organização.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrganizationRevenue;
