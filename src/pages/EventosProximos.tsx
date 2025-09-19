import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { 
  Calendar, 
  MapPin, 
  Users, 
  Clock, 
  AlertCircle,
  Camera,
  Building2,
  Send,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface Campaign {
  id: string;
  title: string;
  description: string | null;
  event_date: string | null;
  location: string | null;
  organization_id: string | null;
  organization_percentage: number;
  is_active: boolean;
  created_at: string;
  organization?: {
    id: string;
    name: string;
    description: string | null;
  };
}

interface EventApplication {
  id: string;
  campaign_id: string;
  status: string;
  photographer_percentage: number;
  application_message: string | null;
  response_message: string | null;
  applied_at: string;
  responded_at: string | null;
}

const EventosProximos = () => {
  const { user, profile } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [applications, setApplications] = useState<EventApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [applicationMessage, setApplicationMessage] = useState('');
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    if (user && profile?.organization_role === 'photographer') {
      fetchCampaigns();
      fetchApplications();
    }
  }, [user, profile]);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('campaigns')
        .select(`
          *,
          organization:organizations!campaigns_organization_id_fkey(id, name, description)
        `)
        .eq('is_active', true)
        .not('organization_id', 'is', null)
        .gte('event_date', new Date().toISOString())
        .order('event_date', { ascending: true });

      if (campaignsError) throw campaignsError;
      setCampaigns((campaignsData as any) || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast({
        title: "Erro ao carregar eventos",
        description: "Não foi possível carregar os eventos disponíveis.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchApplications = async () => {
    if (!user) return;

    try {
      const { data: applicationsData, error: applicationsError } = await supabase
        .from('event_applications')
        .select('*')
        .eq('photographer_id', user.id);

      if (applicationsError) throw applicationsError;
      setApplications(applicationsData || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
    }
  };

  const handleApplyToEvent = async () => {
    if (!selectedCampaign || !user) return;

    setIsApplying(true);
    try {
      const { error } = await supabase
        .from('event_applications')
        .insert({
          campaign_id: selectedCampaign.id,
          photographer_id: user.id,
          organization_id: selectedCampaign.organization_id!,
          status: 'pending',
          application_message: applicationMessage,
          photographer_percentage: 0 // Será definido pela organização
        });

      if (error) throw error;

      toast({
        title: "Aplicação enviada!",
        description: "Sua candidatura foi enviada com sucesso. Aguarde a resposta da organização.",
      });

      setSelectedCampaign(null);
      setApplicationMessage('');
      fetchApplications();
    } catch (error: any) {
      console.error('Error applying to event:', error);
      
      if (error.code === '23505') {
        toast({
          title: "Aplicação já enviada",
          description: "Você já se candidatou a este evento.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro ao enviar aplicação",
          description: "Não foi possível enviar sua candidatura.",
          variant: "destructive",
        });
      }
    } finally {
      setIsApplying(false);
    }
  };

  const getApplicationStatus = (campaignId: string) => {
    return applications.find(app => app.campaign_id === campaignId);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Login Necessário</h2>
          <p className="text-muted-foreground mb-4">
            Você precisa fazer login para ver os eventos disponíveis.
          </p>
        </Card>
      </div>
    );
  }

  if (profile?.organization_role !== 'photographer') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
          <p className="text-muted-foreground mb-4">
            Esta área é exclusiva para fotógrafos.
          </p>
        </Card>
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Header */}
      <header className="border-b bg-white/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            <Camera className="h-6 w-6 md:h-8 md:w-8 text-primary" />
            <h1 className="text-lg font-semibold">Eventos Próximos</h1>
          </div>
          <Button variant="outline" size="sm">
            <Users className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Título e Descrição */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Eventos Disponíveis para Fotógrafos</h1>
          <p className="text-muted-foreground text-lg">
            Candidate-se aos eventos criados pelas organizações e participe como fotógrafo oficial.
          </p>
        </div>

        {/* Lista de Eventos */}
        {campaigns.length === 0 ? (
          <Card className="p-12 text-center">
            <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum evento disponível</h3>
            <p className="text-muted-foreground">
              No momento não há eventos abertos para candidatura de fotógrafos.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map((campaign) => {
              const application = getApplicationStatus(campaign.id);
              
              return (
                <Card key={campaign.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start mb-2">
                      <CardTitle className="text-lg">{campaign.title}</CardTitle>
                      {application && (
                        <Badge 
                          variant={
                            application.status === 'approved' ? 'default' :
                            application.status === 'rejected' ? 'destructive' : 'secondary'
                          }
                        >
                          {application.status === 'approved' ? 'Aprovado' :
                           application.status === 'rejected' ? 'Rejeitado' : 'Pendente'}
                        </Badge>
                      )}
                    </div>
                    
                    {campaign.organization && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Building2 className="h-4 w-4" />
                        {campaign.organization.name}
                      </div>
                    )}
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {campaign.description && (
                      <p className="text-sm text-muted-foreground">
                        {campaign.description}
                      </p>
                    )}
                    
                    <div className="space-y-2">
                      {campaign.event_date && (
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {new Date(campaign.event_date).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      )}
                      
                      {campaign.location && (
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          {campaign.location}
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 text-sm">
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">Organização:</span>
                          <span className="text-green-600 font-medium">
                            {campaign.organization_percentage}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Botão de Ação */}
                    <div className="pt-2">
                      {!application ? (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              className="w-full gap-2"
                              onClick={() => setSelectedCampaign(campaign)}
                            >
                              <Send className="h-4 w-4" />
                              Candidatar-se
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Candidatar-se ao Evento</DialogTitle>
                              <DialogDescription>
                                Envie sua candidatura para participar do evento "{campaign.title}"
                              </DialogDescription>
                            </DialogHeader>
                            
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="message">Mensagem (opcional)</Label>
                                <Textarea
                                  id="message"
                                  placeholder="Conte um pouco sobre sua experiência e por que gostaria de participar deste evento..."
                                  value={applicationMessage}
                                  onChange={(e) => setApplicationMessage(e.target.value)}
                                  rows={4}
                                />
                              </div>
                              
                              <div className="flex gap-2">
                                <Button 
                                  onClick={handleApplyToEvent}
                                  disabled={isApplying}
                                  className="flex-1"
                                >
                                  {isApplying ? 'Enviando...' : 'Enviar Candidatura'}
                                </Button>
                                <Button 
                                  variant="outline" 
                                  onClick={() => {
                                    setSelectedCampaign(null);
                                    setApplicationMessage('');
                                  }}
                                >
                                  Cancelar
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      ) : (
                        <div className="space-y-2">
                          <Button 
                            variant="outline" 
                            className="w-full gap-2" 
                            disabled
                          >
                            {application.status === 'approved' ? (
                              <>
                                <CheckCircle className="h-4 w-4" />
                                Candidatura Aprovada
                              </>
                            ) : application.status === 'rejected' ? (
                              <>
                                <XCircle className="h-4 w-4" />
                                Candidatura Rejeitada
                              </>
                            ) : (
                              <>
                                <Clock className="h-4 w-4" />
                                Aguardando Resposta
                              </>
                            )}
                          </Button>
                          
                          {application.status === 'approved' && application.photographer_percentage > 0 && (
                            <div className="text-center">
                              <Badge variant="default" className="text-xs">
                                Sua porcentagem: {application.photographer_percentage}%
                              </Badge>
                            </div>
                          )}
                          
                          {application.response_message && (
                            <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
                              <strong>Resposta:</strong> {application.response_message}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default EventosProximos;