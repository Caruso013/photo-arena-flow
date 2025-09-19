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
  Shield
} from 'lucide-react';
import DashboardLayout from './DashboardLayout';

interface Organization {
  id: string;
  name: string;
  description: string | null;
  admin_percentage: number;
  is_active: boolean;
  created_at: string;
}

interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  organization_role: string | null;
  created_at: string;
}

interface Campaign {
  id: string;
  title: string;
  location: string | null;
  event_date: string | null;
  is_active: boolean;
  created_at: string;
}

const AdminDashboard = () => {
  const { user, profile } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingOrg, setEditingOrg] = useState<string | null>(null);
  const [newPercentages, setNewPercentages] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    if (user && profile?.organization_role === 'admin') {
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

  if (!user || profile?.organization_role !== 'admin') {
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
    <DashboardLayout>
      <div className="space-y-8">
        <div className="bg-gradient-primary rounded-lg p-8 text-white">
          <div className="flex items-center gap-4 mb-4">
            <Shield className="h-12 w-12" />
            <div>
              <h1 className="text-3xl font-bold">Painel Administrativo</h1>
              <p className="text-blue-100">Gerencie organizações e porcentagens do sistema</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white/10 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="h-5 w-5" />
                <span className="text-sm">Organizações</span>
              </div>
              <p className="text-2xl font-bold">{organizations.filter(o => o.is_active).length}</p>
            </div>
            
            <div className="bg-white/10 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-5 w-5" />
                <span className="text-sm">Usuários</span>
              </div>
              <p className="text-2xl font-bold">{users.length}</p>
            </div>
            
            <div className="bg-white/10 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Camera className="h-5 w-5" />
                <span className="text-sm">Campanhas</span>
              </div>
              <p className="text-2xl font-bold">{campaigns.length}</p>
            </div>
            
            <div className="bg-white/10 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-5 w-5" />
                <span className="text-sm">Total</span>
              </div>
              <p className="text-2xl font-bold">{organizations.length + users.length + campaigns.length}</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="organizations" className="space-y-4">
          <TabsList>
            <TabsTrigger value="organizations">Organizações</TabsTrigger>
            <TabsTrigger value="users">Usuários</TabsTrigger>
            <TabsTrigger value="campaigns">Campanhas</TabsTrigger>
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
    </DashboardLayout>
  );
};

export default AdminDashboard;
