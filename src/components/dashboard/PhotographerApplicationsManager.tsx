import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { Camera, CheckCircle2, XCircle, Clock, ExternalLink, Mail, Calendar, Award } from 'lucide-react';

interface Application {
  id: string;
  user_id: string;
  status: string;
  message: string;
  portfolio_url: string | null;
  equipment: string | null;
  experience_years: number | null;
  created_at: string;
  rejection_reason: string | null;
  user: {
    email: string;
    full_name: string | null;
  };
}

export const PhotographerApplicationsManager = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('photographer_applications')
        .select(`
          *,
          user:profiles!photographer_applications_user_id_fkey (
            email,
            full_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications((data as Application[]) || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast({
        title: "Erro ao carregar",
        description: "Não foi possível carregar as solicitações.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (application: Application) => {
    try {
      setProcessing(true);

      // Update application status
      const { error: appError } = await (supabase as any)
        .from('photographer_applications')
        .update({ 
          status: 'approved',
          processed_at: new Date().toISOString()
        })
        .eq('id', application.id);

      if (appError) throw appError;

      // Update user role to photographer
      const { error: roleError } = await supabase
        .from('profiles')
        .update({ role: 'photographer' })
        .eq('id', application.user_id);

      if (roleError) throw roleError;

      toast({
        title: "Solicitação aprovada!",
        description: `${application.user.full_name || application.user.email} agora é um fotógrafo.`,
      });

      fetchApplications();
      setSelectedApp(null);
    } catch (error: any) {
      console.error('Error approving application:', error);
      toast({
        title: "Erro ao aprovar",
        description: error.message || "Não foi possível aprovar a solicitação.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApp || !rejectionReason.trim()) {
      toast({
        title: "Motivo obrigatório",
        description: "Por favor, informe o motivo da rejeição.",
        variant: "destructive",
      });
      return;
    }

    try {
      setProcessing(true);

      const { error } = await (supabase as any)
        .from('photographer_applications')
        .update({ 
          status: 'rejected',
          rejection_reason: rejectionReason,
          processed_at: new Date().toISOString()
        })
        .eq('id', selectedApp.id);

      if (error) throw error;

      toast({
        title: "Solicitação rejeitada",
        description: "O usuário foi notificado sobre a rejeição.",
      });

      fetchApplications();
      setShowRejectDialog(false);
      setSelectedApp(null);
      setRejectionReason('');
    } catch (error: any) {
      console.error('Error rejecting application:', error);
      toast({
        title: "Erro ao rejeitar",
        description: error.message || "Não foi possível rejeitar a solicitação.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500"><Clock className="h-3 w-3 mr-1" /> Pendente</Badge>;
      case 'approved':
        return <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" /> Aprovada</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Rejeitada</Badge>;
      default:
        return null;
    }
  };

  const pendingApps = applications.filter(app => app.status === 'pending');
  const processedApps = applications.filter(app => app.status !== 'pending');

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Applications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Solicitações Pendentes ({pendingApps.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {pendingApps.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma solicitação pendente no momento
            </p>
          ) : (
            pendingApps.map((app) => (
              <Card key={app.id} className="border-2 border-yellow-200 bg-yellow-50/50">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-lg">
                            {app.user.full_name || 'Nome não informado'}
                          </h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {app.user.email}
                          </div>
                        </div>
                        {getStatusBadge(app.status)}
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Award className="h-4 w-4 text-primary" />
                          <span>{app.experience_years} anos de experiência</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-primary" />
                          <span>{new Date(app.created_at).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Mensagem:</Label>
                        <p className="text-sm text-muted-foreground bg-white p-3 rounded-md border">
                          {app.message}
                        </p>
                      </div>

                      {app.portfolio_url && (
                        <div className="flex items-center gap-2">
                          <Label className="text-sm font-medium">Portfólio:</Label>
                          <a 
                            href={app.portfolio_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline flex items-center gap-1"
                          >
                            Ver portfólio <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}

                      {app.equipment && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Equipamento:</Label>
                          <p className="text-sm text-muted-foreground bg-white p-3 rounded-md border">
                            {app.equipment}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button
                      onClick={() => handleApprove(app)}
                      disabled={processing}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Aprovar
                    </Button>
                    <Button
                      onClick={() => {
                        setSelectedApp(app);
                        setShowRejectDialog(true);
                      }}
                      disabled={processing}
                      variant="destructive"
                      className="flex-1"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Rejeitar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>

      {/* Processed Applications */}
      {processedApps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Histórico de Solicitações ({processedApps.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {processedApps.map((app) => (
              <Card key={app.id} className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium">{app.user.full_name || 'Nome não informado'}</h4>
                      <p className="text-sm text-muted-foreground">{app.user.email}</p>
                    </div>
                    <div className="text-right space-y-1">
                      {getStatusBadge(app.status)}
                      <p className="text-xs text-muted-foreground">
                        {new Date(app.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  {app.status === 'rejected' && app.rejection_reason && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm">
                      <span className="font-medium">Motivo da rejeição:</span> {app.rejection_reason}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Solicitação</DialogTitle>
            <DialogDescription>
              Por favor, informe o motivo da rejeição. O usuário receberá esta mensagem.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rejection_reason">Motivo da rejeição *</Label>
              <Textarea
                id="rejection_reason"
                placeholder="Explique o motivo da rejeição de forma clara e construtiva..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setRejectionReason('');
                setSelectedApp(null);
              }}
              disabled={processing}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={processing || !rejectionReason.trim()}
            >
              {processing ? 'Processando...' : 'Confirmar Rejeição'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};