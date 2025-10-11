import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { CheckCircle2, XCircle, Calendar, User, Mail, MessageSquare, Clock, Camera } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Application {
  id: string;
  campaign_id: string;
  photographer_id: string;
  status: string;
  message: string | null;
  applied_at: string;
  campaigns?: {
    id: string;
    title: string;
    event_date: string | null;
    location: string | null;
  } | null;
  profiles?: {
    full_name: string;
    email: string;
    avatar_url: string | null;
  } | null;
}

export const ApplicationsManager = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      
      // Buscar candidaturas
      const { data: applicationsData, error: appsError } = await supabase
        .from('event_applications')
        .select('*')
        .order('applied_at', { ascending: false });

      if (appsError) throw appsError;

      if (!applicationsData || applicationsData.length === 0) {
        setApplications([]);
        setLoading(false);
        return;
      }

      // Buscar campanhas relacionadas
      const campaignIds = [...new Set(applicationsData.map(app => app.campaign_id))];
      const { data: campaignsData } = await supabase
        .from('campaigns')
        .select('id, title, event_date, location')
        .in('id', campaignIds);

      // Buscar perfis de fotógrafos
      const photographerIds = [...new Set(applicationsData.map(app => app.photographer_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', photographerIds);

      // Combinar dados
      const enrichedApplications = applicationsData.map(app => ({
        ...app,
        campaigns: campaignsData?.find(c => c.id === app.campaign_id) || null,
        profiles: profilesData?.find(p => p.id === app.photographer_id) || null,
      }));

      setApplications(enrichedApplications);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar candidaturas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApplicationResponse = async (applicationId: string, action: 'approve' | 'reject') => {
    try {
      setProcessingId(applicationId);
      
      const application = applications.find(app => app.id === applicationId);
      if (!application) return;

      const newStatus = action === 'approve' ? 'approved' : 'rejected';
      const { data: { user } } = await supabase.auth.getUser();

      // Atualizar status da candidatura
      const { error: updateError } = await supabase
        .from('event_applications')
        .update({
          status: newStatus,
          processed_at: new Date().toISOString(),
          processed_by: user?.id,
        })
        .eq('id', applicationId);

      if (updateError) throw updateError;

      // Se aprovado, adicionar em campaign_photographers (sistema de múltiplos fotógrafos)
      if (action === 'approve') {
        const { error: assignError } = await supabase
          .from('campaign_photographers')
          .insert({
            campaign_id: application.campaign_id,
            photographer_id: application.photographer_id,
            assigned_by: user?.id,
            is_active: true
          });

        if (assignError) throw assignError;

        // OPCIONAL: Também atualizar photographer_id para compatibilidade com código legado
        const { data: existingPhotogs } = await supabase
          .from('campaign_photographers')
          .select('id')
          .eq('campaign_id', application.campaign_id)
          .eq('is_active', true);
        
        if (existingPhotogs && existingPhotogs.length === 1) {
          // Se é o primeiro fotógrafo, atualizar photographer_id do evento
          await supabase
            .from('campaigns')
            .update({ photographer_id: application.photographer_id })
            .eq('id', application.campaign_id);
        }
      }

      // Enviar email de notificação
      try {
        await supabase.functions.invoke('send-application-notification', {
          body: {
            to: application.profiles?.email,
            photographerName: application.profiles?.full_name,
            campaignTitle: application.campaigns?.title,
            status: newStatus,
            eventDate: application.campaigns?.event_date,
            location: application.campaigns?.location
          }
        });
      } catch (emailError) {
        console.error('Error sending notification email:', emailError);
        // Não falhar a operação se o email não for enviado
      }

      toast({
        title: action === 'approve' ? "Candidatura Aprovada!" : "Candidatura Rejeitada",
        description: `A candidatura foi ${action === 'approve' ? 'aprovada' : 'rejeitada'} com sucesso.`,
      });

      await fetchApplications();
    } catch (error) {
      console.error('Error processing application:', error);
      toast({
        title: "Erro",
        description: "Falha ao processar candidatura",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">Pendente</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">Aprovado</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">Rejeitado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </CardContent>
      </Card>
    );
  }

  const pendingApplications = applications.filter(app => app.status === 'pending');
  const processedApplications = applications.filter(app => app.status !== 'pending');

  return (
    <div className="space-y-6">
      {/* Pending Applications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            Candidaturas Pendentes ({pendingApplications.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingApplications.length === 0 ? (
            <Alert>
              <AlertDescription>
                Nenhuma candidatura pendente no momento.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {pendingApplications.map((app) => (
                <Card key={app.id} className="border-l-4 border-l-yellow-500">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-6">
                      {/* Info do Fotógrafo */}
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold text-lg">
                              {app.profiles?.full_name || 'Nome não informado'}
                            </span>
                          </div>
                          {getStatusBadge(app.status)}
                        </div>

                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          <span>{app.profiles?.email}</span>
                        </div>

                        <div className="space-y-2">
                          <h4 className="font-medium text-primary">
                            {app.campaigns?.title || 'Evento'}
                          </h4>
                          
                          {app.campaigns?.event_date && (
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span>
                                {new Date(app.campaigns.event_date).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                          )}

                          {app.campaigns?.location && (
                            <div className="text-sm text-muted-foreground">
                              📍 {app.campaigns.location}
                            </div>
                          )}
                        </div>

                        {app.message && (
                          <div className="mt-3 p-3 bg-muted rounded-lg">
                            <div className="flex items-start gap-2">
                              <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                              <div>
                                <p className="text-sm font-medium mb-1">Mensagem do fotógrafo:</p>
                                <p className="text-sm text-muted-foreground">{app.message}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>
                            Candidatura enviada em {new Date(app.applied_at).toLocaleDateString('pt-BR')} às{' '}
                            {new Date(app.applied_at).toLocaleTimeString('pt-BR', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex md:flex-col gap-2 md:justify-center">
                        <Button
                          onClick={() => handleApplicationResponse(app.id, 'approve')}
                          disabled={processingId === app.id}
                          className="gap-2 bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Aprovar
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => handleApplicationResponse(app.id, 'reject')}
                          disabled={processingId === app.id}
                          className="gap-2"
                        >
                          <XCircle className="h-4 w-4" />
                          Rejeitar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Processed Applications */}
      {processedApplications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
              Candidaturas Processadas ({processedApplications.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {processedApplications.map((app) => (
                <Card key={app.id} className="border-l-4 border-l-muted">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {app.profiles?.full_name || 'Nome não informado'}
                          </span>
                          {getStatusBadge(app.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {app.campaigns?.title || 'Evento'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(app.applied_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
