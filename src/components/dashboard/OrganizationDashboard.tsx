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
  logo_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  admin_percentage: number;
  is_active: boolean;
}

interface Campaign {
  id: string;
  title: string;
  description: string | null;
  event_date: string | null;
  location: string | null;
  cover_image_url: string | null;
  organization_percentage: number;
  is_active: boolean;
  created_at: string;
}

interface EventApplication {
  id: string;
  status: string;
  photographer_percentage: number;
  application_message: string | null;
  response_message: string | null;
  applied_at: string;
  responded_at: string | null;
  photographer: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
  campaign: {
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
    location: '',
    organization_percentage: 0
  });

  useEffect(() => {
    if (user && profile?.organization_id) {
      fetchOrganizationData();
    }
  }, [user, profile]);

  const fetchOrganizationData = async () => {
    try {
      setLoading(true);
      
      // Buscar dados da organização
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', profile!.organization_id!)
        .single();

      if (orgError) throw orgError;
      setOrganization(orgData);

      // Buscar campanhas da organização
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('organization_id', profile!.organization_id!)
        .order('created_at', { ascending: false });

      if (campaignsError) throw campaignsError;
      setCampaigns(campaignsData || []);

      // Buscar aplicações de fotógrafos
      const { data: applicationsData, error: applicationsError } = await supabase
        .from('event_applications')
        .select(`
          *,
          photographer:profiles!event_applications_photographer_id_fkey(id, full_name, email, avatar_url),
          campaign:campaigns!event_applications_campaign_id_fkey(id, title)
        `)
        .eq('organization_id', profile!.organization_id!)
        .order('applied_at', { ascending: false });

      if (applicationsError) throw applicationsError;
      setApplications(applicationsData || []);

      // Buscar membros da organização
      const { data: membersData, error: membersError } = await supabase
        .from('organization_members')
        .select(`
          *,
          user:profiles!organization_members_user_id_fkey(id, full_name, email, avatar_url)
        `)
        .eq('organization_id', profile!.organization_id!)
        .order('joined_at', { ascending: false });

      if (membersError) throw membersError;
      setMembers(membersData || []);

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
          organization_percentage: newCampaign.organization_percentage,
          photographer_id: user!.id, // Será atualizado quando fotógrafo for aprovado
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
        location: '',
        organization_percentage: 0
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
    responseMessage: string,
    photographerPercentage?: number
  ) => {
    try {
      const updateData: any = {
        status,
        response_message: responseMessage,
        responded_at: new Date().toISOString()
      };

      if (status === 'approved' && photographerPercentage !== undefined) {
        updateData.photographer_percentage = photographerPercentage;
      }

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
        <div className="bg-gradient-primary rounded-lg p-8 text-white">
          <div className="flex items-center gap-4 mb-4">
            <Building2 className="h-12 w-12" />
            <div>
              <h1 className="text-3xl font-bold">{organization.name}</h1>
              <p className="text-blue-100">{organization.description}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white/10 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-5 w-5" />
                <span className="text-sm">Eventos Criados</span>
              </div>
              <p className="text-2xl font-bold">{campaigns.length}</p>
            </div>
            
            <div className="bg-white/10 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-5 w-5" />
                <span className="text-sm">Fotógrafos Ativos</span>
              </div>
              <p className="text-2xl font-bold">{members.filter(m => m.is_active).length}</p>
            </div>
            
            <div className="bg-white/10 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-5 w-5" />
                <span className="text-sm">Aplicações Pendentes</span>
              </div>
              <p className="text-2xl font-bold">
                {applications.filter(a => a.status === 'pending').length}
              </p>
            </div>
            
            <div className="bg-white/10 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-5 w-5" />
                <span className="text-sm">Taxa Admin</span>
              </div>
              <p className="text-2xl font-bold">{organization.admin_percentage}%</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="events" className="space-y-4">
          <TabsList>
            <TabsTrigger value="events">Gerenciar Eventos</TabsTrigger>
            <TabsTrigger value="applications">Aplicações de Fotógrafos</TabsTrigger>
            <TabsTrigger value="members">Membros da Organização</TabsTrigger>
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
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <Label htmlFor="organization_percentage">Porcentagem da Organização (%)</Label>
                      <Input
                        id="organization_percentage"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={newCampaign.organization_percentage}
                        onChange={(e) => setNewCampaign({ 
                          ...newCampaign, 
                          organization_percentage: parseFloat(e.target.value) || 0 
                        })}
                        required
                      />
                    </div>
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
                              <span className="text-sm text-green-600 font-medium">
                                {campaign.organization_percentage}%
                              </span>
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
                              <h4 className="font-medium">{application.photographer.full_name}</h4>
                              <p className="text-sm text-muted-foreground">{application.photographer.email}</p>
                              <p className="text-sm font-medium mt-1">Evento: {application.campaign.title}</p>
                            </div>
                            <Badge 
                              variant={
                                application.status === 'approved' ? 'default' :
                                application.status === 'rejected' ? 'destructive' : 'secondary'
                              }
                            >
                              {application.status === 'approved' ? 'Aprovado' :
                               application.status === 'rejected' ? 'Rejeitado' : 'Pendente'}
                            </Badge>
                          </div>
                          
                          {application.application_message && (
                            <div className="mb-4">
                              <Label className="text-sm font-medium">Mensagem do Fotógrafo:</Label>
                              <p className="text-sm text-muted-foreground mt-1">
                                {application.application_message}
                              </p>
                            </div>
                          )}
                          
                          {application.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleApplicationResponse(
                                  application.id, 
                                  'approved', 
                                  'Aplicação aprovada',
                                  application.photographer_percentage || 50
                                )}
                                className="gap-1"
                              >
                                <UserCheck className="h-4 w-4" />
                                Aprovar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleApplicationResponse(
                                  application.id, 
                                  'rejected', 
                                  'Aplicação rejeitada'
                                )}
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

          <TabsContent value="members" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Membros da Organização</CardTitle>
                <CardDescription>
                  Visualize e gerencie os membros da sua organização
                </CardDescription>
              </CardHeader>
              <CardContent>
                {members.length === 0 ? (
                  <div className="text-center p-8">
                    <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Nenhum membro</h3>
                    <p className="text-muted-foreground">
                      Os membros da organização aparecerão aqui
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {members.map((member) => (
                      <Card key={member.id}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <h4 className="font-medium">{member.user.full_name}</h4>
                              <p className="text-sm text-muted-foreground">{member.user.email}</p>
                              <p className="text-sm">Função: {member.role}</p>
                            </div>
                            <div className="text-right">
                              <Badge variant={member.is_active ? 'default' : 'secondary'}>
                                {member.is_active ? 'Ativo' : 'Inativo'}
                              </Badge>
                              <p className="text-sm text-green-600 font-medium mt-1">
                                {member.photographer_percentage}%
                              </p>
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

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Configurações da Organização
                </CardTitle>
                <CardDescription>
                  Gerencie as configurações da sua organização
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label>Nome da Organização</Label>
                    <Input value={organization.name} disabled />
                  </div>
                  <div>
                    <Label>Descrição</Label>
                    <Textarea value={organization.description || ''} disabled />
                  </div>
                  <div>
                    <Label>Taxa do Administrador</Label>
                    <Input value={`${organization.admin_percentage}%`} disabled />
                    <p className="text-sm text-muted-foreground mt-1">
                      Esta porcentagem é definida pelo administrador principal
                    </p>
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