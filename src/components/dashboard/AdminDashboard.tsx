import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
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
  CheckCircle2
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
}

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
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && profile?.role === 'admin') {
      fetchAdminData();
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

      // Fetch revenue stats
      const { data: revenueData } = await supabase
        .from('revenue_shares')
        .select('platform_amount, photographer_amount, organization_amount, created_at');
      
      const totalRevenue = revenueData?.reduce((sum, r) => 
        sum + Number(r.platform_amount) + Number(r.photographer_amount) + Number(r.organization_amount), 0) || 0;
      const platformRevenue = revenueData?.reduce((sum, r) => sum + Number(r.platform_amount), 0) || 0;

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

      setStats({
        totalRevenue,
        platformRevenue,
        photosSold: photosSold || 0,
        pendingPayouts: pendingPayoutsTotal,
        pendingApplications: pendingApplications || 0,
      });

      // Fetch recent activities
      const { data: recentSales } = await supabase
        .from('purchases')
        .select('id, amount, created_at, photo:photos(title)')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(5);

      const activities: ActivityItem[] = (recentSales || []).map((sale: any) => ({
        id: sale.id,
        type: 'sale' as const,
        title: 'Nova venda',
        description: sale.photo?.title || 'Foto vendida',
        timestamp: sale.created_at,
        amount: Number(sale.amount),
      }));

      setRecentActivities(activities);

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
      variant: 'purple',
      badge: stats.pendingApplications > 0 ? stats.pendingApplications : undefined,
    },
    {
      icon: DollarSign,
      label: 'Pagamentos',
      description: 'Gerenciar repasses',
      href: '/dashboard/admin/financial',
      variant: 'green',
    },
    {
      icon: Building2,
      label: 'Organizações',
      description: `${organizations.length} cadastradas`,
      href: '/dashboard/admin/organizations',
      variant: 'blue',
    },
    {
      icon: Camera,
      label: 'Eventos',
      description: `${campaigns.filter(c => c.is_active).length} ativos`,
      href: '/dashboard/admin/events',
      variant: 'yellow',
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
            value={users.filter(u => u.role === 'photographer').length}
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

        {/* Recent Activity and Management Tabs */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <div className="lg:col-span-1">
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
