import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import { 
  Settings, 
  Building2, 
  Users, 
  Camera,
  Shield,
  TrendingUp,
  UserCheck,
  Activity
} from 'lucide-react';
import AdminNavbar from './AdminNavbar';
import StatCard from './StatCard';
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

const AdminDashboard = () => {
  const { user, profile } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && profile?.role === 'admin') {
      fetchAdminData();
    }
  }, [user, profile]);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      
      const { data: orgsData, error: orgsError } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (orgsError) throw orgsError;
      setOrganizations(orgsData || []);

      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (usersError) throw usersError;
      setUsers(usersData || []);

      const { data: campaignsData, error: campaignsError } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (campaignsError) throw campaignsError;
      setCampaigns(campaignsData || []);

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50/50 dark:bg-background">
        <AdminNavbar 
          currentUser={{
            id: user?.id || '',
            email: user?.email || '',
            full_name: profile?.full_name || undefined,
            avatar_url: profile?.avatar_url || undefined
          }}
          pendingApplications={0}
          eventApplications={[]}
          onApplicationResponse={() => {}}
        />
        
        <main className="container mx-auto px-4 py-8">
          <div className="space-y-8">
            {/* Welcome Section */}
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Bem-vindo ao Painel Administrativo
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Gerencie organizações, eventos e fotógrafos da plataforma
              </p>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Organizações"
                value={organizations.length}
                subtitle="Cadastradas"
                icon={Building2}
                iconColor="bg-primary text-primary-foreground"
                bgGradient="from-primary/10 to-primary/20"
              />
              
              <StatCard
                title="Usuários"
                value={users.length}
                subtitle="Registrados"
                icon={Users}
                iconColor="bg-accent text-accent-foreground"
                bgGradient="from-accent/10 to-accent/20"
              />
              
              <StatCard
                title="Eventos Ativos"
                value={campaigns.filter(c => c.is_active).length}
                subtitle={`${campaigns.length} total`}
                icon={Camera}
                iconColor="bg-secondary text-secondary-foreground"
                bgGradient="from-secondary/10 to-secondary/20"
              />
              
              <StatCard
                title="Fotógrafos"
                value={users.filter(u => u.role === 'photographer').length}
                subtitle="Ativos"
                icon={UserCheck}
                iconColor="bg-muted text-muted-foreground"
                bgGradient="from-muted/30 to-muted/50"
              />
            </div>

            {/* Management Tabs */}
            <Tabs defaultValue="photographer-apps" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 text-xs gap-1 h-auto sm:h-10 p-1">
                <TabsTrigger value="photographer-apps" className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1 py-2 sm:py-0 h-14 sm:h-9">
                  <Camera className="h-4 w-4 flex-shrink-0" />
                  <span className="text-[10px] sm:text-xs">Fotógrafos</span>
                </TabsTrigger>
                <TabsTrigger value="financial" className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1 py-2 sm:py-0 h-14 sm:h-9">
                  <TrendingUp className="h-4 w-4 flex-shrink-0" />
                  <span className="text-[10px] sm:text-xs hidden sm:inline">Financeiro</span>
                  <span className="text-[10px] sm:hidden">$</span>
                </TabsTrigger>
                <TabsTrigger value="organizations" className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1 py-2 sm:py-0 h-14 sm:h-9">
                  <Building2 className="h-4 w-4 flex-shrink-0" />
                  <span className="text-[10px] sm:text-xs">Orgs</span>
                </TabsTrigger>
                <TabsTrigger value="campaigns" className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1 py-2 sm:py-0 h-14 sm:h-9 hidden sm:flex">
                  <Activity className="h-4 w-4 flex-shrink-0" />
                  <span className="text-[10px] sm:text-xs">Campanhas</span>
                </TabsTrigger>
                <TabsTrigger value="users" className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1 py-2 sm:py-0 h-14 sm:h-9 hidden sm:flex">
                  <Users className="h-4 w-4 flex-shrink-0" />
                  <span className="text-[10px] sm:text-xs">Usuários</span>
                </TabsTrigger>
                <TabsTrigger value="profile" className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1 py-2 sm:py-0 h-14 sm:h-9 hidden sm:flex">
                  <Settings className="h-4 w-4 flex-shrink-0" />
                  <span className="text-[10px] sm:text-xs">Perfil</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="photographer-apps" className="space-y-6">
                <PhotographerApplicationsManager />
              </TabsContent>

              <TabsContent value="financial" className="space-y-6">
                <FinancialDashboard userRole="admin" />
              </TabsContent>

              <TabsContent value="organizations" className="space-y-6">
                <OrganizationManager organizations={organizations} onRefresh={fetchAdminData} />
              </TabsContent>

              <TabsContent value="campaigns" className="space-y-6">
                <CampaignManager campaigns={campaigns} onRefresh={fetchAdminData} />
              </TabsContent>

              <TabsContent value="users" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Usuários do Sistema
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {users.map((userItem) => (
                        <Card key={userItem.id}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start gap-4">
                              <div className="flex-1">
                                <h4 className="font-medium">{userItem.full_name || 'Nome não informado'}</h4>
                                <p className="text-sm text-muted-foreground">{userItem.email}</p>
                                <div className="flex gap-2 mt-2">
                                  <UserRoleManager
                                    userId={userItem.id}
                                    currentRole={userItem.role}
                                    userName={userItem.full_name || userItem.email}
                                    onRoleUpdate={fetchAdminData}
                                  />
                                </div>
                              </div>
                              <span className="text-sm text-muted-foreground whitespace-nowrap">
                                {new Date(userItem.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="profile" className="space-y-6">
                <ProfileEditor />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </>
  );
};

export default AdminDashboard;