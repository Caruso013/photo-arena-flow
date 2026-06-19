import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { 
  Settings, 
  Building2, 
  Users, 
  Camera,
  Shield,
  TrendingUp,
  UserCheck,
  Activity,
  DollarSign,
  Image,
  Clock,
  RefreshCw,
  CheckCircle,
  Loader2,
  ArrowRight,
  Sparkles,
  SlidersHorizontal
} from 'lucide-react';
import type { ActivityItem } from './RecentActivity';
import LatestSalesPanel from './LatestSalesPanel';
import FinancialDashboard from './FinancialDashboard';
import { OrganizationManager } from './OrganizationManager';
import { CampaignManager } from './CampaignManager';
import { ProfileEditor } from '../profile/ProfileEditor';
import { PhotographerApplicationsManager } from './PhotographerApplicationsManager';
import { UserRoleManager } from './UserRoleManager';

interface Organization {
  id: string;
  name: string;
  description: string | null;
  admin_percentage: number;
  logo_url: string | null;
  primary_color: string | null;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  created_at: string;
  avatar_url?: string | null;
  updated_at: string;
}

interface Campaign {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  event_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  organization_id: string | null;
  platform_percentage: number;
  photographer_percentage: number;
  organization_percentage: number;
}

interface Stats {
  totalRevenue: number;
  platformRevenue: number;
  photosSold: number;
  pendingPayouts: number;
  pendingApplications: number;
  photographerCount: number;
}

// Função para agrupar vendas do mesmo comprador em intervalo de 1 hora (clone do fotógrafo)
const groupSalesByBuyer = (sales: any[]): ActivityItem[] => {
  const groups: Map<string, any[]> = new Map();
  
  sales.forEach(sale => {
    const timestamp = new Date(sale.created_at).getTime();
    // Agrupar por comprador + janela de 1 hora
    const windowKey = `${sale.buyer_id}-${Math.floor(timestamp / (60 * 60 * 1000))}`;
    
    if (!groups.has(windowKey)) {
      groups.set(windowKey, []);
    }
    groups.get(windowKey)!.push(sale);
  });
  
  // Converter grupos em ActivityItems
  return Array.from(groups.values()).map(group => {
    const first = group[0];
    // Somar os valores totais das vendas
    const totalAmount = group.reduce((sum, s) => sum + Number(s.amount), 0);
    const photoCount = group.length;
    
    // Coletar todas as fotos do grupo para download
    const allPhotos = group.map(sale => ({
      id: sale.photo?.id,
      title: sale.photo?.title,
      thumbnail_url: sale.photo?.thumbnail_url,
      watermarked_url: sale.photo?.watermarked_url,
      original_url: sale.photo?.original_url,
    })).filter(p => p.id);
    
    return {
      id: first.id,
      type: 'sale' as const,
      title: first.buyer?.full_name || 'Cliente',
      description: photoCount > 1 
        ? `${photoCount} fotos` 
        : (first.photo?.title || 'Foto vendida'),
      timestamp: first.created_at,
      amount: totalAmount,
      photoCount,
      photoUrl: first.photo?.thumbnail_url || first.photo?.watermarked_url,
      photoId: first.photo?.id,
      photos: allPhotos,
      buyerEmail: first.buyer?.email,
    };
  }).sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
};

const AdminDashboard = () => {
  const { user, profile } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalRevenue: 0,
    platformRevenue: 0,
    photosSold: 0,
    pendingPayouts: 0,
    pendingApplications: 0,
    photographerCount: 0,
  });
  const [loading, setLoading] = useState(true);
  
  // Estado de reconciliação
  const [reconciling, setReconciling] = useState(false);
  const [lastReconciliation, setLastReconciliation] = useState<{
    reconciled: number;
    failed: number;
    skipped: number;
    timestamp: Date;
  } | null>(null);
  const hasRunAutoReconciliation = useRef(false);

  // Função de reconciliação de pagamentos
  const runReconciliation = async () => {
    setReconciling(true);
    try {
      const { data, error } = await supabase.functions.invoke('reconcile-pending-purchases');
      
      if (error) throw error;
      
      if (data?.success) {
        const results = data.results;
        setLastReconciliation({
          reconciled: results.reconciled,
          failed: results.failed,
          skipped: results.skipped,
          timestamp: new Date(),
        });
        
        if (results.reconciled > 0) {
          toast({
            title: "✅ Reconciliação concluída",
            description: `${results.reconciled} compra(s) liberada(s) automaticamente.`,
          });
          // Recarregar dados para refletir mudanças
          fetchAdminData();
        } else {
          toast({
            title: "Reconciliação concluída",
            description: "Nenhuma compra pendente para liberar.",
          });
        }
      }
    } catch (error: any) {
      console.error('Erro na reconciliação:', error);
      toast({
        title: "Erro na reconciliação",
        description: error.message || "Falha ao verificar pagamentos pendentes.",
        variant: "destructive",
      });
    } finally {
      setReconciling(false);
    }
  };

  useEffect(() => {
    if (user && profile?.role === 'admin') {
      fetchAdminData();
      
      // Auto-reconciliação ao carregar (1x por sessão)
      if (!hasRunAutoReconciliation.current) {
        hasRunAutoReconciliation.current = true;
        // Aguardar 2s após carregar dados para rodar reconciliação
        setTimeout(() => {
          runReconciliation();
        }, 2000);
      }
    }
  }, [user, profile]);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      
      // Fetch organizations
      const { data: orgsData } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });
      setOrganizations(orgsData || []);

      // Fetch users
      const { data: usersData } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      setUsers(usersData || []);

      // Fetch campaigns
      const { data: campaignsData } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      setCampaigns(campaignsData || []);

      // Fetch ALL revenue stats with pagination (Supabase has 1000 record limit)
      let allRevenueData: any[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: revenueData } = await supabase
          .from('revenue_shares')
          .select('platform_amount, photographer_amount, organization_amount')
          .range(page * pageSize, (page + 1) * pageSize - 1);
        
        if (revenueData && revenueData.length > 0) {
          allRevenueData = [...allRevenueData, ...revenueData];
          page++;
          hasMore = revenueData.length === pageSize;
        } else {
          hasMore = false;
        }
      }
      
      const totalRevenue = allRevenueData.reduce((sum, r) => 
        sum + Number(r.platform_amount) + Number(r.photographer_amount) + Number(r.organization_amount), 0);
      const platformRevenue = allRevenueData.reduce((sum, r) => sum + Number(r.platform_amount), 0);

      // Fetch photo sales count
      const { count: photosSold } = await supabase
        .from('purchases')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed');

      // Fetch pending payouts
      const { data: pendingPayouts } = await supabase
        .from('payout_requests')
        .select('amount')
        .eq('status', 'pending');
      const pendingPayoutsTotal = pendingPayouts?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      // Fetch pending applications
      const { count: pendingApplications } = await supabase
        .from('photographer_applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Fetch photographer count directly (not from limited users list)
      const { count: photographerCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'photographer');

      setStats({
        totalRevenue,
        platformRevenue,
        photosSold: photosSold || 0,
        pendingPayouts: pendingPayoutsTotal,
        pendingApplications: pendingApplications || 0,
        photographerCount: photographerCount || 0,
      });

      // Fetch recent activities with buyer email, photo thumbnail and revenue_shares
      const { data: recentSales } = await supabase
        .from('purchases')
        .select(`
          id, 
          amount, 
          created_at,
          buyer_id,
          buyer:profiles!purchases_buyer_id_fkey(full_name, email),
          photo:photos(id, title, thumbnail_url, watermarked_url, original_url),
          revenue_shares(platform_amount, photographer_amount, organization_amount)
        `)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(100); // Buscar mais para permitir agrupamento

      // Agrupar vendas do mesmo comprador em janela de 1 hora (igual ao fotógrafo)
      const groupedActivities = groupSalesByBuyer(recentSales || []);
      setRecentActivities(groupedActivities.slice(0, 10));

    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados administrativos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user || profile?.role !== 'admin') {
    return (
      <div className="text-center p-8">
        <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Acesso Restrito</h2>
        <p className="text-muted-foreground">
          Esta área é exclusiva para administradores.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-28 md:pb-0">
      <div className="rounded-3xl border border-amber-200/60 bg-gradient-to-r from-amber-50 via-white to-yellow-50 p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-200 bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
              <Sparkles className="h-3.5 w-3.5" />
              Painel administrativo
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Olá, {profile?.full_name || 'Admin'}
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground sm:text-base">
                Controle fotógrafos, eventos, usuários e finanças da plataforma em um só lugar.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:flex lg:flex-row">
            <Button asChild variant="outline" className="w-full gap-2 rounded-xl border-amber-200 bg-white/80">
              <Link to="/dashboard/admin/photographers">
                <UserCheck className="h-4 w-4" />
                Aprovações
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full gap-2 rounded-xl border-amber-200 bg-white/80">
              <Link to="/dashboard/admin/financial">
                <DollarSign className="h-4 w-4" />
                Financeiro
              </Link>
            </Button>
            <Button asChild className="w-full gap-2 rounded-xl bg-amber-600 text-white hover:bg-amber-700">
              <Link to="/dashboard/admin/config/platform">
                <SlidersHorizontal className="h-4 w-4" />
                Personalizar Home
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Card className="border-amber-200/70 bg-gradient-to-br from-amber-50 to-white shadow-sm">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <TrendingUp className="h-4 w-4 text-amber-600" />
              Receita Total Bruta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700 sm:text-3xl">{formatCurrency(stats.totalRevenue)}</div>
            <p className="mt-1 text-xs text-muted-foreground">Todas as vendas</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-200/70 bg-gradient-to-br from-emerald-50 to-white shadow-sm">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <DollarSign className="h-4 w-4 text-emerald-600" />
              Receita Plataforma
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700 sm:text-3xl">{formatCurrency(stats.platformRevenue)}</div>
            <p className="mt-1 text-xs text-muted-foreground">{`${stats.totalRevenue > 0 ? ((stats.platformRevenue / stats.totalRevenue) * 100).toFixed(1) : 0}% do total`}</p>
          </CardContent>
        </Card>

        <Card className="border-sky-200/70 bg-gradient-to-br from-sky-50 to-white shadow-sm">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Image className="h-4 w-4 text-sky-600" />
              Fotos Vendidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-sky-700 sm:text-3xl">{stats.photosSold}</div>
            <p className="mt-1 text-xs text-muted-foreground">Compras completadas</p>
          </CardContent>
        </Card>

        <Card className="border-violet-200/70 bg-gradient-to-br from-violet-50 to-white shadow-sm">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Camera className="h-4 w-4 text-violet-600" />
              Fotógrafos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-violet-700 sm:text-3xl">{stats.photographerCount}</div>
            <p className="mt-1 text-xs text-muted-foreground">{stats.pendingApplications > 0 ? `${stats.pendingApplications} pendentes` : 'Ativos'}</p>
          </CardContent>
        </Card>

        <Card className="border-rose-200/70 bg-gradient-to-br from-rose-50 to-white shadow-sm">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Clock className="h-4 w-4 text-rose-600" />
              Repasses Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-700 sm:text-3xl">{formatCurrency(stats.pendingPayouts)}</div>
            <p className="mt-1 text-xs text-muted-foreground">Aguardando aprovação</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Ações rápidas</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Button asChild variant="outline" className="h-auto justify-start rounded-xl p-4 text-left">
            <Link to="/dashboard/admin/photographers">
              <UserCheck className="mr-2 h-4 w-4" />
              Aprovar fotógrafos ({stats.pendingApplications})
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto justify-start rounded-xl p-4 text-left">
            <Link to="/dashboard/admin/events">
              <Activity className="mr-2 h-4 w-4" />
              Gerenciar eventos ({campaigns.filter((c) => c.is_active).length} ativos)
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto justify-start rounded-xl p-4 text-left">
            <Link to="/dashboard/admin/organizations">
              <Building2 className="mr-2 h-4 w-4" />
              Organizações ({organizations.length})
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto justify-start rounded-xl p-4 text-left">
            <Link to="/dashboard/admin/config/platform">
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Banner da Home e configurações
            </Link>
          </Button>
        </div>
      </div>

      {/* Recent Activity and Reconciliation */}
      <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-1 space-y-4">
            {/* Botão de Reconciliação */}
            <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <RefreshCw className={`h-4 w-4 ${reconciling ? 'animate-spin' : ''}`} />
                      Reconciliar Pagamentos
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Verifica pagamentos aprovados no MP e libera fotos
                    </p>
                    {lastReconciliation && (
                      <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        Última: {lastReconciliation.reconciled} liberada(s)
                        {lastReconciliation.timestamp && (
                          <span>às {lastReconciliation.timestamp.toLocaleTimeString('pt-BR')}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={runReconciliation}
                    disabled={reconciling}
                    className="shrink-0"
                  >
                    {reconciling ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Executar'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <LatestSalesPanel 
              sales={recentActivities}
              title="Últimas Vendas"
              emptyMessage="Nenhuma venda recente"
            />
        </div>

        {/* Management Tabs */}
        <div className="lg:col-span-2">
            <Tabs defaultValue="photographer-apps" className="space-y-4">
              <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
                <TabsList className="inline-flex w-auto min-w-full sm:grid sm:w-full sm:grid-cols-6 text-xs gap-0.5 h-auto sm:h-10 p-1">
                  <TabsTrigger value="photographer-apps" className="flex items-center gap-1 px-3 py-2 h-9 whitespace-nowrap">
                    <Camera className="h-4 w-4 flex-shrink-0" />
                    <span className="text-[10px] sm:text-xs">Fotógrafos</span>
                  </TabsTrigger>
                  <TabsTrigger value="financial" className="flex items-center gap-1 px-3 py-2 h-9 whitespace-nowrap">
                    <TrendingUp className="h-4 w-4 flex-shrink-0" />
                    <span className="text-[10px] sm:text-xs">Financeiro</span>
                  </TabsTrigger>
                  <TabsTrigger value="organizations" className="flex items-center gap-1 px-3 py-2 h-9 whitespace-nowrap">
                    <Building2 className="h-4 w-4 flex-shrink-0" />
                    <span className="text-[10px] sm:text-xs">Orgs</span>
                  </TabsTrigger>
                  <TabsTrigger value="campaigns" className="flex items-center gap-1 px-3 py-2 h-9 whitespace-nowrap">
                    <Activity className="h-4 w-4 flex-shrink-0" />
                    <span className="text-[10px] sm:text-xs">Eventos</span>
                  </TabsTrigger>
                  <TabsTrigger value="users" className="flex items-center gap-1 px-3 py-2 h-9 whitespace-nowrap">
                    <Users className="h-4 w-4 flex-shrink-0" />
                    <span className="text-[10px] sm:text-xs">Usuários</span>
                  </TabsTrigger>
                  <TabsTrigger value="profile" className="flex items-center gap-1 px-3 py-2 h-9 whitespace-nowrap">
                    <Settings className="h-4 w-4 flex-shrink-0" />
                    <span className="text-[10px] sm:text-xs">Perfil</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="photographer-apps" className="space-y-4">
                <PhotographerApplicationsManager />
              </TabsContent>

              <TabsContent value="financial" className="space-y-4">
                <FinancialDashboard userRole="admin" />
              </TabsContent>

              <TabsContent value="organizations" className="space-y-4">
                <OrganizationManager organizations={organizations} onRefresh={fetchAdminData} />
              </TabsContent>

              <TabsContent value="campaigns" className="space-y-4">
                <CampaignManager campaigns={campaigns} onRefresh={fetchAdminData} />
              </TabsContent>

              <TabsContent value="users" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Usuários do Sistema
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {users.map((userItem) => (
                        <Card key={userItem.id} className="bg-muted/30">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start gap-4">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium truncate">{userItem.full_name || 'Nome não informado'}</h4>
                                <p className="text-sm text-muted-foreground truncate">{userItem.email}</p>
                                <div className="flex gap-2 mt-2">
                                  <UserRoleManager
                                    userId={userItem.id}
                                    currentRole={userItem.role}
                                    userName={userItem.full_name || userItem.email}
                                    onRoleUpdate={fetchAdminData}
                                  />
                                </div>
                              </div>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {new Date(userItem.created_at).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="profile" className="space-y-4">
                <Card className="border-amber-200/70 bg-gradient-to-r from-amber-50 to-white">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <SlidersHorizontal className="h-5 w-5 text-amber-600" />
                      Personalização da Home
                    </CardTitle>
                    <CardDescription>
                      Troque a imagem da seção "Encontre suas Fotos" direto nas configurações da plataforma.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button asChild>
                      <Link to="/dashboard/admin/config/platform">
                        Abrir personalização
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
                <ProfileEditor />
              </TabsContent>
            </Tabs>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
