import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import { 
  Building2, 
  Camera, 
  Users, 
  Calendar, 
  TrendingUp,
  UserCheck,
  UserX,
  DollarSign,
  Plus,
  Settings,
  FileText
} from 'lucide-react';
import DashboardLayout from './DashboardLayout';

interface Organization {
  id: string;
  name: string;
  description: string | null;
  admin_percentage: number;
  created_at: string;
  updated_at: string;
}

interface Campaign {
  id: string;
  title: string;
  description: string | null;
  event_date: string | null;
  location: string | null;
  cover_image_url: string | null;
  photographer_id: string | null;
  organization_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface EventApplication {
  id: string;
  campaign_id: string;
  photographer_id: string;
  status: string;
  message: string | null;
  applied_at: string;
  processed_at: string | null;
  processed_by: string | null;
  created_at: string;
  updated_at: string;
  photographer?: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
  campaign?: {
    id: string;
    title: string;
  };
}

interface OrganizationMember {
  id: string;
  role: string;
  photographer_percentage: number;
  is_active: boolean;
  joined_at: string;
  user: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

const OrganizationDashboard = () => {
  const { user, profile } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [applications, setApplications] = useState<EventApplication[]>([]);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCampaign, setNewCampaign] = useState({
    title: '',
    description: '',
    event_date: '',
    location: ''
  });

  // Simulando que o usuário é admin de uma organização para demo
  const mockOrgId = "demo-org-id";

  useEffect(() => {
    if (user && profile?.role === 'admin') {
      fetchOrganizationData();
    }
  }, [user, profile]);

  const fetchOrganizationData = async () => {
    try {
      setLoading(true);
      
      // Buscar organizações (admin pode ver todas)
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .limit(1)
        .single();

      if (orgError && orgError.code !== 'PGRST116') throw orgError;
      setOrganization(orgData);

      // Buscar campanhas
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (campaignsError) throw campaignsError;
      setCampaigns(campaignsData || []);

      // Buscar aplicações de fotógrafos
      const { data: applicationsData, error: applicationsError } = await supabase
        .from('event_applications')
        .select('*')
        .order('applied_at', { ascending: false });

      if (applicationsError) throw applicationsError;
      setApplications(applicationsData || []);

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

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!organization) return;

    try {
      const { error } = await supabase
        .from('campaigns')
        .insert({
          title: newCampaign.title,
          description: newCampaign.description,
          event_date: newCampaign.event_date,
          location: newCampaign.location,
          organization_id: organization.id,
          photographer_id: null, // Será atualizado quando fotógrafo for aprovado
          is_active: true
        });

      if (error) throw error;

      toast({
        title: "Evento criado!",
        description: "O evento foi criado com sucesso.",
      });

      setNewCampaign({
        title: '',
        description: '',
        event_date: '',
        location: ''
      });

      fetchOrganizationData();
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast({
        title: "Erro ao criar evento",
        description: "Não foi possível criar o evento.",
        variant: "destructive",
      });
    }
  };

  const handleApplicationResponse = async (
    applicationId: string, 
    status: 'approved' | 'rejected',
    responseMessage: string
  ) => {
    try {
      const updateData: any = {
        status,
        processed_at: new Date().toISOString(),
        processed_by: user!.id
      };

      const { error } = await supabase
        .from('event_applications')
        .update(updateData)
        .eq('id', applicationId);

      if (error) throw error;

      toast({
        title: status === 'approved' ? "Aplicação aprovada!" : "Aplicação rejeitada!",
        description: `A aplicação foi ${status === 'approved' ? 'aprovada' : 'rejeitada'} com sucesso.`,
      });

      fetchOrganizationData();
    } catch (error) {
      console.error('Error updating application:', error);
      toast({
        title: "Erro ao responder aplicação",
        description: "Não foi possível atualizar a aplicação.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!organization) {
    return (
      <DashboardLayout>
        <div className="text-center p-8">
          <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Organização não encontrada</h2>
          <p className="text-muted-foreground">
            Você não está associado a nenhuma organização ou ela não existe.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="relative overflow-hidden rounded-xl p-8 bg-gradient-primary text-white shadow-elegant">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-4">
              <Building2 className="h-12 w-12 drop-shadow-lg" />
              <div>
                <h1 className="text-3xl font-bold drop-shadow-lg">{organization.name}</h1>
                <p className="text-white/95 drop-shadow-md">{organization.description}</p>
              </div>
            </div>
          
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white/20 border border-white/30 rounded-lg p-4 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-5 w-5 drop-shadow" />
                  <span className="text-sm font-medium drop-shadow">Eventos Criados</span>
                </div>
                <p className="text-2xl font-bold drop-shadow-lg">{campaigns.length}</p>
              </div>
              
              <div className="bg-white/20 border border-white/30 rounded-lg p-4 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-5 w-5 drop-shadow" />
                  <span className="text-sm font-medium drop-shadow">Fotógrafos Ativos</span>
                </div>
                <p className="text-2xl font-bold drop-shadow-lg">{members.filter(m => m.is_active).length}</p>
              </div>
              
              <div className="bg-white/20 border border-white/30 rounded-lg p-4 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-5 w-5 drop-shadow" />
                  <span className="text-sm font-medium drop-shadow">Aplicações Pendentes</span>
                </div>
                <p className="text-2xl font-bold drop-shadow-lg">
                  {applications.filter(a => a.status === 'pending').length}
                </p>
              </div>
              
              <div className="bg-white/20 border border-white/30 rounded-lg p-4 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-5 w-5 drop-shadow" />
                  <span className="text-sm font-medium drop-shadow">Taxa Admin</span>
                </div>
                <p className="text-2xl font-bold drop-shadow-lg">{organization.admin_percentage}%</p>
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="events" className="space-y-4">
          <TabsList>
            <TabsTrigger value="events">Gerenciar Eventos</TabsTrigger>
            <TabsTrigger value="applications">Aplicações de Fotógrafos</TabsTrigger>
            <TabsTrigger value="settings">Configurações</TabsTrigger>
          </TabsList>

          <TabsContent value="events" className="space-y-6">
            {/* Criar Novo Evento */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Criar Novo Evento
                </CardTitle>
                <CardDescription>
                  Crie um novo evento para que fotógrafos possam se candidatar
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateCampaign} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="title">Título do Evento</Label>
                      <Input
                        id="title"
                        value={newCampaign.title}
                        onChange={(e) => setNewCampaign({ ...newCampaign, title: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="location">Local</Label>
                      <Input
                        id="location"
                        value={newCampaign.location}
                        onChange={(e) => setNewCampaign({ ...newCampaign, location: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="event_date">Data do Evento</Label>
                    <Input
                      id="event_date"
                      type="datetime-local"
                      value={newCampaign.event_date}
                      onChange={(e) => setNewCampaign({ ...newCampaign, event_date: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Descrição do Evento</Label>
                    <Textarea
                      id="description"
                      value={newCampaign.description}
                      onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
                      rows={4}
                    />
                  </div>
                  
                  <Button type="submit">Criar Evento</Button>
                </form>
              </CardContent>
            </Card>

            {/* Lista de Eventos */}
            <Card>
              <CardHeader>
                <CardTitle>Eventos Criados</CardTitle>
                <CardDescription>
                  Gerencie os eventos da sua organização
                </CardDescription>
              </CardHeader>
              <CardContent>
                {campaigns.length === 0 ? (
                  <div className="text-center p-8">
                    <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Nenhum evento criado</h3>
                    <p className="text-muted-foreground">
                      Crie seu primeiro evento usando o formulário acima
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {campaigns.map((campaign) => (
                      <Card key={campaign.id}>
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            <h4 className="font-medium">{campaign.title}</h4>
                            <p className="text-sm text-muted-foreground">{campaign.location}</p>
                            <p className="text-sm text-muted-foreground">
                              {campaign.event_date ? new Date(campaign.event_date).toLocaleDateString() : 'Data não definida'}
                            </p>
                            <div className="flex justify-between items-center">
                              <Badge variant={campaign.is_active ? 'default' : 'secondary'}>
                                {campaign.is_active ? 'Ativo' : 'Inativo'}
                              </Badge>
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

          <TabsContent value="applications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Aplicações de Fotógrafos</CardTitle>
                <CardDescription>
                  Gerencie as solicitações de participação nos seus eventos
                </CardDescription>
              </CardHeader>
              <CardContent>
                {applications.length === 0 ? (
                  <div className="text-center p-8">
                    <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Nenhuma aplicação</h3>
                    <p className="text-muted-foreground">
                      Quando fotógrafos se candidatarem aos seus eventos, aparecerão aqui
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {applications.map((application) => (
                      <Card key={application.id}>
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h4 className="font-medium">Fotógrafo: {application.photographer_id}</h4>
                              <p className="text-sm text-muted-foreground">
                                Evento ID: {application.campaign_id}
                              </p>
                            </div>
                            <Badge variant={
                              application.status === 'pending' ? 'secondary' :
                              application.status === 'approved' ? 'default' : 'destructive'
                            }>
                              {application.status === 'pending' && 'Pendente'}
                              {application.status === 'approved' && 'Aprovado'}
                              {application.status === 'rejected' && 'Rejeitado'}
                            </Badge>
                          </div>
                          
                          {application.message && (
                            <div className="mb-4">
                              <p className="text-sm font-medium mb-1">Mensagem:</p>
                              <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                                {application.message}
                              </p>
                            </div>
                          )}
                          
                          {application.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleApplicationResponse(application.id, 'approved', '')}
                                className="gap-1"
                              >
                                <UserCheck className="h-4 w-4" />
                                Aprovar
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleApplicationResponse(application.id, 'rejected', '')}
                                className="gap-1"
                              >
                                <UserX className="h-4 w-4" />
                                Rejeitar
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Configurações da Organização
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label>Nome da Organização</Label>
                    <Input value={organization.name} disabled />
                  </div>
                  <div>
                    <Label>Descrição</Label>
                    <Textarea value={organization.description || ''} disabled rows={3} />
                  </div>
                  <div>
                    <Label>Porcentagem Administrativa</Label>
                    <Input value={`${organization.admin_percentage}%`} disabled />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default OrganizationDashboard;