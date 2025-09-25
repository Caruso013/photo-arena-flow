import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import { 
  Settings, 
  Building2, 
  Users, 
  DollarSign,
  Save,
  BarChart3,
  Camera,
  Shield,
  TrendingUp,
  UserCheck,
  Activity
} from 'lucide-react';
import DashboardLayout from './DashboardLayout';
import AdminNavbar from './AdminNavbar';
import StatCard from './StatCard';

interface Organization {
  id: string;
  name: string;
  description: string | null;
  admin_percentage: number;
  is_active?: boolean; // Made optional to match database response
  created_at: string;
  updated_at: string;
}

interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  organization_role?: string | null; // Made optional
  organization_id?: string | null; // Made optional
  created_at: string;
  avatar_url?: string | null;
  payout_percentage?: number;
  updated_at: string;
}

interface Campaign {
  id: string;
  title: string;
  location: string | null;
  event_date: string | null;
  is_active: boolean;
  created_at: string;
}

interface EventApplication {
  id: string;
  photographer?: { full_name: string; email: string };
  campaign?: { title: string };
  status: string;
  applied_at: string;
}

const AdminDashboard = () => {
  const { user, profile } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [eventApplications, setEventApplications] = useState<EventApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingOrg, setEditingOrg] = useState<string | null>(null);
  const [newPercentages, setNewPercentages] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    console.log('AdminDashboard - User:', user?.email, 'Profile role:', profile?.role, 'Org role:', profile?.organization_role);
    
    if (user && (profile?.role === 'admin' || profile?.organization_role === 'admin')) {
      console.log('Admin access granted, loading admin data...');
      fetchAdminData();
    } else if (user && profile) {
      console.log('Access denied - not an admin user');
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

  const handleUpdateOrganizationPercentage = async (orgId: string, newPercentage: number) => {
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ admin_percentage: newPercentage })
        .eq('id', orgId);

      if (error) throw error;

      toast({
        title: "Porcentagem atualizada!",
        description: "A porcentagem da organização foi atualizada com sucesso.",
      });

      setEditingOrg(null);
      setNewPercentages({});
      fetchAdminData();
    } catch (error) {
      console.error('Error updating organization percentage:', error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar a porcentagem.",
        variant: "destructive",
      });
    }
  };

  const handleApplicationResponse = async (applicationId: string, action: 'approve' | 'reject') => {
    try {
      const { error } = await supabase
        .from('event_applications')
        .update({ status: action === 'approve' ? 'approved' : 'rejected' })
        .eq('id', applicationId);

      if (error) throw error;

      toast({
        title: action === 'approve' ? "Candidatura aprovada!" : "Candidatura rejeitada!",
        description: `A candidatura foi ${action === 'approve' ? 'aprovada' : 'rejeitada'} com sucesso.`,
      });

      // Refresh applications
      fetchAdminData();
    } catch (error) {
      console.error('Error updating application:', error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar a candidatura.",
        variant: "destructive",
      });
    }
  };

  if (!user || (profile?.role !== 'admin' && profile?.organization_role !== 'admin')) {
    return (
      <DashboardLayout>
        <div className="text-center p-8">
          <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Acesso Restrito</h2>
          <p className="text-muted-foreground">
            Esta área é exclusiva para administradores.
          </p>
        </div>
      </DashboardLayout>
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
      <div className="min-h-screen bg-gray-50/50">
        <AdminNavbar 
          currentUser={{
            id: user?.id || '',
            email: user?.email || '',
            full_name: profile?.full_name || undefined,
            avatar_url: profile?.avatar_url || undefined
          }}
          pendingApplications={eventApplications.filter(app => app.status === 'pending').length}
          eventApplications={eventApplications}
          onApplicationResponse={handleApplicationResponse}
        />
        
        <main className="container mx-auto px-4 py-8">
          <div className="space-y-8">
            {/* Welcome Section */}
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">
                Bem-vindo ao Painel Administrativo
              </h1>
              <p className="text-muted-foreground">
                Gerencie organizações, campanhas e fotógrafos da plataforma
              </p>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Organizações Ativas"
                value={organizations.filter(o => o.is_active).length}
                subtitle={`${organizations.length} total`}
                icon={Building2}
                iconColor="bg-blue-500 text-white"
                bgGradient="from-blue-50 to-blue-100"
                trend={{
                  value: 12,
                  isPositive: true
                }}
              />
              
              <StatCard
                title="Usuários Registrados"
                value={users.length}
                subtitle="Crescimento mensal"
                icon={Users}
                iconColor="bg-green-500 text-white"
                bgGradient="from-green-50 to-green-100"
                trend={{
                  value: 8,
                  isPositive: true
                }}
              />
              
              <StatCard
                title="Campanhas Ativas"
                value={campaigns.filter(c => c.is_active).length}
                subtitle={`${campaigns.length} total`}
                icon={Camera}
                iconColor="bg-purple-500 text-white"
                bgGradient="from-purple-50 to-purple-100"
                trend={{
                  value: 15,
                  isPositive: true
                }}
              />
              
              <StatCard
                title="Candidaturas Pendentes"
                value={eventApplications.filter(app => app.status === 'pending').length}
                subtitle="Requer aprovação"
                icon={UserCheck}
                iconColor="bg-orange-500 text-white"
                bgGradient="from-orange-50 to-orange-100"
                trend={{
                  value: eventApplications.filter(app => app.status === 'pending').length > 5 ? -3 : 5,
                  isPositive: eventApplications.filter(app => app.status === 'pending').length <= 5
                }}
              />
            </div>

            {/* Management Tabs */}
            <Tabs defaultValue="organizations" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="organizations" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Organizações
                </TabsTrigger>
                <TabsTrigger value="users" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Usuários
                </TabsTrigger>
                <TabsTrigger value="campaigns" className="flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Campanhas
                </TabsTrigger>
              </TabsList>

          <TabsContent value="organizations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Gerenciar Organizações
                </CardTitle>
                <CardDescription>
                  Defina a porcentagem que a administração recebe de cada organização
                </CardDescription>
              </CardHeader>
              <CardContent>
                {organizations.length === 0 ? (
                  <div className="text-center p-8">
                    <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Nenhuma organização encontrada</h3>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {organizations.map((org) => (
                      <Card key={org.id}>
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-medium text-lg">{org.name}</h4>
                              <p className="text-sm text-muted-foreground">{org.description}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant={org.is_active ? 'default' : 'secondary'}>
                                  {org.is_active ? 'Ativa' : 'Inativa'}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  {new Date(org.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                              {editingOrg === org.id ? (
                                <div className="flex items-center gap-2">
                                  <Label htmlFor={`percentage-${org.id}`} className="text-sm">
                                    Admin %:
                                  </Label>
                                  <Input
                                    id={`percentage-${org.id}`}
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    value={newPercentages[org.id] ?? org.admin_percentage}
                                    onChange={(e) => setNewPercentages({
                                      ...newPercentages,
                                      [org.id]: parseFloat(e.target.value) || 0
                                    })}
                                    className="w-20"
                                  />
                                  <Button
                                    size="sm"
                                    onClick={() => handleUpdateOrganizationPercentage(
                                      org.id, 
                                      newPercentages[org.id] ?? org.admin_percentage
                                    )}
                                    className="gap-1"
                                  >
                                    <Save className="h-4 w-4" />
                                    Salvar
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setEditingOrg(null);
                                      setNewPercentages({});
                                    }}
                                  >
                                    Cancelar
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="text-lg font-bold text-green-600">
                                    {org.admin_percentage}%
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setEditingOrg(org.id)}
                                    className="gap-1"
                                  >
                                    <Settings className="h-4 w-4" />
                                    Editar
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
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
                  {users.map((user) => (
                    <Card key={user.id}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-medium">{user.full_name || 'Nome não informado'}</h4>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                            <div className="flex gap-2 mt-1">
                              <Badge variant="outline">{user.role}</Badge>
                              {user.organization_role && (
                                <Badge variant="secondary">{user.organization_role}</Badge>
                              )}
                            </div>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {new Date(user.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="campaigns" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Campanhas Recentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {campaigns.map((campaign) => (
                    <Card key={campaign.id}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium">{campaign.title}</h4>
                            <p className="text-sm text-muted-foreground">{campaign.location}</p>
                            {campaign.event_date && (
                              <p className="text-sm text-muted-foreground">
                                {new Date(campaign.event_date).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          <Badge variant={campaign.is_active ? 'default' : 'secondary'}>
                            {campaign.is_active ? 'Ativa' : 'Inativa'}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
          </div>
        </main>
      </div>
    </>
  );
};

export default AdminDashboard;
