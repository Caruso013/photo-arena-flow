import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
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
  Loader2
} from 'lucide-react';
import AdminNavbar from './AdminNavbar';
import WelcomeHeader from './WelcomeHeader';
import MetricCard from './MetricCard';
import QuickActions, { QuickAction } from './QuickActions';
import RecentActivity, { ActivityItem } from './RecentActivity';
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

  const quickActions: QuickAction[] = [
    {
      icon: UserCheck,
      label: 'Aprovar Fotógrafos',
      description: `${stats.pendingApplications} pendentes`,
      href: '/dashboard/admin/photographers',
      badge: stats.pendingApplications > 0 ? stats.pendingApplications : undefined,
    },
    {
      icon: DollarSign,
      label: 'Pagamentos',
      description: 'Gerenciar repasses',
      href: '/dashboard/admin/financial',
    },
    {
      icon: Building2,
      label: 'Organizações',
      description: `${organizations.length} cadastradas`,
      href: '/dashboard/admin/organizations',
    },
    {
      icon: Camera,
      label: 'Eventos',
      description: `${campaigns.filter(c => c.is_active).length} ativos`,
      href: '/dashboard/admin/events',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <AdminNavbar 
        currentUser={{
          id: user?.id || '',
          email: user?.email || '',
          full_name: profile?.full_name || undefined,
          avatar_url: profile?.avatar_url || undefined
        }}
        pendingApplications={stats.pendingApplications}
        eventApplications={[]}
        onApplicationResponse={() => {}}
      />
      
      <main className="container mx-auto px-4 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Welcome Header */}
        <WelcomeHeader
          title="Painel Administrativo"
          subtitle="Gerencie a plataforma, fotógrafos, eventos e finanças"
          userName={profile?.full_name || undefined}
          avatarUrl={profile?.avatar_url || undefined}
          icon={Shield}
        />

        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <MetricCard
            title="Receita Total Bruta"
            value={formatCurrency(stats.totalRevenue)}
            subtitle="Todas as vendas"
            icon={TrendingUp}
            variant="primary"
            loading={loading}
          />
          <MetricCard
            title="Receita Plataforma"
            value={formatCurrency(stats.platformRevenue)}
            subtitle={`${stats.totalRevenue > 0 ? ((stats.platformRevenue / stats.totalRevenue) * 100).toFixed(1) : 0}% do total`}
            icon={DollarSign}
            variant="success"
            loading={loading}
          />
          <MetricCard
            title="Fotos Vendidas"
            value={stats.photosSold}
            subtitle="Compras completadas"
            icon={Image}
            variant="secondary"
            loading={loading}
          />
          <MetricCard
            title="Fotógrafos"
            value={stats.photographerCount}
            subtitle={stats.pendingApplications > 0 ? `${stats.pendingApplications} pendentes` : 'Ativos'}
            icon={Camera}
            variant="warning"
            loading={loading}
          />
          <MetricCard
            title="Repasses Pendentes"
            value={formatCurrency(stats.pendingPayouts)}
            subtitle="Aguardando aprovação"
            icon={Clock}
            variant="danger"
            loading={loading}
          />
        </div>

        {/* Quick Actions */}
        <QuickActions 
          actions={quickActions} 
          title="Ações Rápidas"
          columns={4}
        />

        {/* Recent Activity and Reconciliation */}
        <div className="grid lg:grid-cols-3 gap-6">
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
            
            <RecentActivity 
              activities={recentActivities}
              title="Últimas Vendas"
              emptyMessage="Nenhuma venda recente"
            />
          </div>

          {/* Management Tabs */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="photographer-apps" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 text-xs gap-1 h-auto sm:h-10 p-1">
                <TabsTrigger value="photographer-apps" className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1 py-2 sm:py-0 h-12 sm:h-9">
                  <Camera className="h-4 w-4 flex-shrink-0" />
                  <span className="text-[10px] sm:text-xs">Fotógrafos</span>
                </TabsTrigger>
                <TabsTrigger value="financial" className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1 py-2 sm:py-0 h-12 sm:h-9">
                  <TrendingUp className="h-4 w-4 flex-shrink-0" />
                  <span className="text-[10px] sm:text-xs">Financeiro</span>
                </TabsTrigger>
                <TabsTrigger value="organizations" className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1 py-2 sm:py-0 h-12 sm:h-9">
                  <Building2 className="h-4 w-4 flex-shrink-0" />
                  <span className="text-[10px] sm:text-xs">Orgs</span>
                </TabsTrigger>
                <TabsTrigger value="campaigns" className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1 py-2 sm:py-0 h-12 sm:h-9 hidden sm:flex">
                  <Activity className="h-4 w-4 flex-shrink-0" />
                  <span className="text-[10px] sm:text-xs">Eventos</span>
                </TabsTrigger>
                <TabsTrigger value="users" className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1 py-2 sm:py-0 h-12 sm:h-9 hidden sm:flex">
                  <Users className="h-4 w-4 flex-shrink-0" />
                  <span className="text-[10px] sm:text-xs">Usuários</span>
                </TabsTrigger>
                <TabsTrigger value="profile" className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1 py-2 sm:py-0 h-12 sm:h-9 hidden sm:flex">
                  <Settings className="h-4 w-4 flex-shrink-0" />
                  <span className="text-[10px] sm:text-xs">Perfil</span>
                </TabsTrigger>
              </TabsList>

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
                <ProfileEditor />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
