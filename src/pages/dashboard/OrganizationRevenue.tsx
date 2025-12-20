import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Calendar, TrendingUp, FileText, User, Camera } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/lib/utils';
import AdminLayout from '@/components/dashboard/AdminLayout';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
}

const OrganizationRevenue = () => {
  const { user, profile } = useAuth();
  const [organization, setOrganization] = useState<OrganizationData | null>(null);
  const [sales, setSales] = useState<SaleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [cycleInfo, setCycleInfo] = useState({
    cycleStart: new Date(),
    cycleEnd: new Date(),
    paymentDate: new Date(),
    daysUntilPayment: 0
  });

  useEffect(() => {
    if (user && profile?.role === 'organization') {
      fetchOrganizationData();
    }
  }, [user, profile]);

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

      // 2. Calcular ciclo de pagamento (dia 5 ao dia 4)
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

      const daysUntilPayment = Math.ceil((paymentDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      setCycleInfo({
        cycleStart,
        cycleEnd,
        paymentDate,
        daysUntilPayment
      });

      // 3. Buscar vendas com nomes de fotógrafos e compradores
      const { data: salesData, error: salesError } = await supabase
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
        .gte('created_at', cycleStart.toISOString())
        .lte('created_at', cycleEnd.toISOString())
        .order('created_at', { ascending: false });

      if (salesError) throw salesError;

      // 4. Buscar nomes dos fotógrafos e compradores
      const salesWithNames: SaleData[] = [];
      
      for (const sale of salesData || []) {
        // Buscar nome do fotógrafo
        let photographerName = null;
        if (sale.photographer_id) {
          const { data: photographer } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', sale.photographer_id)
            .single();
          photographerName = photographer?.full_name || 'Fotógrafo';
        }

        // Buscar nome do comprador
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

        salesWithNames.push({
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

      setSales(salesWithNames);

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

  const getTotalRevenue = () => {
    return sales.reduce((sum, sale) => sum + sale.organization_amount, 0);
  };

  const getEventRevenues = (): EventRevenue[] => {
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
          salesCount: 0
        });
      }

      const event = eventMap.get(campaignId)!;
      event.totalRevenue += sale.organization_amount;
      event.salesCount += 1;
    });

    return Array.from(eventMap.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  if (!organization) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-2">Organização não encontrada</h2>
          <p className="text-muted-foreground">Não foi possível encontrar sua organização.</p>
        </div>
      </AdminLayout>
    );
  }

  const totalRevenue = getTotalRevenue();
  const eventRevenues = getEventRevenues();
  const isPaid = cycleInfo.daysUntilPayment < 0;

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">🏢 {organization.name}</h1>
          <p className="text-muted-foreground mt-1">
            Relatório de Vendas • Participação: {organization.admin_percentage}%
          </p>
        </div>

        {/* Ciclo e Pagamento */}
        <Card className="border-l-4 border-l-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Ciclo de Pagamento Atual
            </CardTitle>
            <CardDescription>
              {cycleInfo.cycleStart.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              {' - '}
              {cycleInfo.cycleEnd.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Próximo Pagamento</p>
                <p className="text-lg font-semibold">
                  {cycleInfo.paymentDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                </p>
              </div>
              {!isPaid && cycleInfo.daysUntilPayment >= 0 && (
                <Badge variant="outline" className="text-sm">
                  {cycleInfo.daysUntilPayment === 0 ? 'Hoje' : `${cycleInfo.daysUntilPayment} dias`}
                </Badge>
              )}
              {isPaid && (
                <Badge variant="secondary" className="text-sm bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                  Pago
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cards de Resumo */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(totalRevenue)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Neste ciclo de pagamento
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Vendas</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sales.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Fotos vendidas no período
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Eventos Ativos</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{eventRevenues.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Com vendas registradas
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabela de Vendas Detalhada */}
        <div>
          <h2 className="text-xl font-semibold mb-4">📋 Vendas Detalhadas</h2>
          
          {sales.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-muted-foreground">
                  Nenhuma venda registrada neste ciclo de pagamento.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Evento</TableHead>
                      <TableHead>
                        <div className="flex items-center gap-1">
                          <Camera className="h-3 w-3" />
                          Fotógrafo
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          Comprador
                        </div>
                      </TableHead>
                      <TableHead className="text-right">Valor Venda</TableHead>
                      <TableHead className="text-right">Sua Receita</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell className="whitespace-nowrap">
                          {new Date(sale.created_at).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{sale.campaign_title}</div>
                          {sale.event_date && (
                            <div className="text-xs text-muted-foreground">
                              {new Date(sale.event_date).toLocaleDateString('pt-BR')}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{sale.photographer_name || '-'}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{sale.buyer_name || '-'}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(sale.purchase_amount)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-green-600 dark:text-green-400">
                          {formatCurrency(sale.organization_amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Lista de Eventos e Receitas */}
        <div>
          <h2 className="text-xl font-semibold mb-4">📊 Receita por Evento</h2>
          
          {eventRevenues.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-muted-foreground">
                  Nenhum evento com vendas neste ciclo.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {eventRevenues.map((event) => (
                <Card key={event.campaignId} className="hover:border-primary transition-colors">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{event.campaignTitle}</h3>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          {event.eventDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(event.eventDate).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            {event.salesCount} {event.salesCount === 1 ? 'foto vendida' : 'fotos vendidas'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Receita da organização</p>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {formatCurrency(event.totalRevenue)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default OrganizationRevenue;