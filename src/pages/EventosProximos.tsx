import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Calendar, MapPin, Users, Camera, Clock } from 'lucide-react';
import { Navigate } from 'react-router-dom';

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
  organization?: {
    name: string;
  };
}

interface Application {
  id: string;
  campaign_id: string;
  status: string;
  message?: string;
  applied_at: string;
}

const EventosProximos = () => {
  const { user, profile, loading } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [message, setMessage] = useState('');
  const [applying, setApplying] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user && profile?.role === 'photographer') {
      fetchData();
    }
  }, [user, profile]);

  const fetchData = async () => {
    try {
      setLoadingData(true);
      
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('campaigns')
        .select(`
          *,
          organization:organizations(name)
        `)
        .eq('is_active', true)
        .is('photographer_id', null)
        .order('event_date', { ascending: true });

      if (campaignsError) throw campaignsError;
      setCampaigns(campaignsData || []);

      const { data: applicationsData, error: applicationsError } = await supabase
        .from('event_applications')
        .select('*')
        .eq('photographer_id', user!.id);

      if (applicationsError) throw applicationsError;
      setApplications(applicationsData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar eventos",
        variant: "destructive",
      });
    } finally {
      setLoadingData(false);
    }
  };

  const handleApply = async () => {
    if (!selectedCampaign || !user) return;

    try {
      setApplying(true);
      
      const { error } = await supabase
        .from('event_applications')
        .insert({
          campaign_id: selectedCampaign.id,
          photographer_id: user.id,
          message: message.trim() || null,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Candidatura enviada com sucesso!",
      });

      setMessage('');
      setSelectedCampaign(null);
      fetchData();
    } catch (error: any) {
      console.error('Error applying:', error);
      toast({
        title: "Erro",
        description: "Falha ao enviar candidatura",
        variant: "destructive",
      });
    } finally {
      setApplying(false);
    }
  };

  const getApplicationStatus = (campaignId: string) => {
    return applications.find(app => app.campaign_id === campaignId);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user || profile?.role !== 'photographer') {
    return <Navigate to="/auth" />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Próximos Eventos</h1>
          <p className="text-muted-foreground text-lg">
            Encontre e se candidate para eventos de fotografia
          </p>
        </div>

        {loadingData ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-3 bg-muted rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Camera className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Nenhum evento disponível</h3>
              <p className="text-muted-foreground">
                Não há eventos abertos para candidatura no momento.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map((campaign) => {
              const application = getApplicationStatus(campaign.id);
              
              return (
                <Card key={campaign.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">{campaign.title}</CardTitle>
                    <CardDescription>
                      {campaign.organization?.name || 'Plataforma'}
                    </CardDescription>
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
                          <Calendar className="h-4 w-4 text-primary" />
                          <span>
                            {new Date(campaign.event_date).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      )}
                      
                      {campaign.location && (
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-primary" />
                          <span>{campaign.location}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2">
                      {application ? (
                        <Button variant="outline" disabled className="w-full">
                          {application.status === 'pending' && 'Candidatura Enviada'}
                          {application.status === 'approved' && 'Aprovado!'}
                          {application.status === 'rejected' && 'Rejeitado'}
                        </Button>
                      ) : (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              className="w-full" 
                              onClick={() => setSelectedCampaign(campaign)}
                            >
                              <Camera className="h-4 w-4 mr-2" />
                              Candidatar-se
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Candidatar-se para {campaign.title}</DialogTitle>
                              <DialogDescription>
                                Envie sua candidatura para fotografar este evento
                              </DialogDescription>
                            </DialogHeader>
                            
                            <div className="space-y-4">
                              <div>
                                <label className="text-sm font-medium mb-2 block">
                                  Mensagem (opcional)
                                </label>
                                <Textarea
                                  value={message}
                                  onChange={(e) => setMessage(e.target.value)}
                                  placeholder="Conte sobre sua experiência..."
                                  rows={4}
                                />
                              </div>
                              
                              <div className="flex justify-end gap-3">
                                <Button variant="outline" onClick={() => setSelectedCampaign(null)}>
                                  Cancelar
                                </Button>
                                <Button onClick={handleApply} disabled={applying}>
                                  {applying ? "Enviando..." : "Enviar Candidatura"}
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
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