import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Calendar, TrendingUp, FileText } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/lib/utils';
import AdminLayout from '@/components/dashboard/AdminLayout';

interface OrganizationData {
  id: string;
  name: string;
  admin_percentage: number;
}

interface RevenueData {
  organization_amount: number;
  created_at: string;
  purchase_id: string;
  purchases: {
    amount: number;
    photo_id: string;
    photos: {
      campaign_id: string;
      campaigns: {
        title: string;
        event_date: string;
      };
    };
  };
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
  const [revenues, setRevenues] = useState<RevenueData[]>([]);
  const [loading, setLoading] = useState(true);
  const [cycleInfo, setCycleInfo] = useState({
    cycleStart: new Date(),
    cycleEnd: new Date(),
    paymentDate: new Date(),
    daysUntilPayment: 0
  });

  useEffect(() => {
    if (user && profile?.role === 'organizer') {
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

      // 3. Buscar receitas do ciclo
      const { data: revenuesData, error: revenuesError } = await supabase
        .from('revenue_shares')
        .select(`
          organization_amount,
          created_at,
          purchase_id,
          purchases (
            amount,
            photo_id,
            photos (
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

      if (revenuesError) throw revenuesError;

      setRevenues(revenuesData || []);

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
    return revenues.reduce((sum, rev) => sum + Number(rev.organization_amount), 0);
  };

  const getEventRevenues = (): EventRevenue[] => {
    const eventMap = new Map<string, EventRevenue>();

    revenues.forEach(rev => {
      const campaign = rev.purchases?.photos?.campaigns;
      if (!campaign) return;

      const campaignId = rev.purchases.photos.campaign_id;
      
      if (!eventMap.has(campaignId)) {
        eventMap.set(campaignId, {
          campaignId,
          campaignTitle: campaign.title,
          eventDate: campaign.event_date,
          totalRevenue: 0,
          salesCount: 0
        });
      }

      const event = eventMap.get(campaignId)!;
      event.totalRevenue += Number(rev.organization_amount);
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
            Dashboard de Receitas • Participação: {organization.admin_percentage}%
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
              <div className="text-2xl font-bold">{revenues.length}</div>
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

        {/* Lista de Eventos e Receitas */}
        <div>
          <h2 className="text-xl font-semibold mb-4">📊 Receita por Evento</h2>
          
          {eventRevenues.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-muted-foreground">
                  Nenhuma venda registrada neste ciclo de pagamento.
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
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(event.eventDate).toLocaleDateString('pt-BR')}
                          </span>
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