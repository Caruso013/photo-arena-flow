import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency } from '@/lib/utils';
import { CheckCircle2, XCircle, Clock, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

interface PayoutRequest {
  id: string;
  photographer_id: string;
  amount: number;
  status: string;
  requested_at: string;
  processed_at?: string;
  completed_at?: string;
  notes?: string;
  photographer: {
    full_name: string;
    email: string;
  };
  pix_key?: string | null;
  recipient_name?: string | null;
  institution?: string | null;
}

export const PayoutRequestsManager = () => {
  const [requests, setRequests] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    fetchPayoutRequests();
  }, []);

  const fetchPayoutRequests = async () => {
    try {
      const { data: payoutData, error: payoutError } = await supabase
        .from('payout_requests')
        .select('*')
        .order('requested_at', { ascending: false });

      if (payoutError) throw payoutError;

      // Buscar dados dos fotógrafos separadamente
      if (payoutData && payoutData.length > 0) {
        const photographerIds = [...new Set(payoutData.map(p => p.photographer_id))];
        
        const { data: photographersData, error: photographersError } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', photographerIds);

        if (photographersError) throw photographersError;

        // Mapear dados do fotógrafo para cada solicitação
        const requestsWithPhotographer = payoutData.map(request => ({
          ...request,
          photographer: photographersData?.find(p => p.id === request.photographer_id) || {
            full_name: 'Fotógrafo Desconhecido',
            email: ''
          }
        }));

        setRequests(requestsWithPhotographer);
      } else {
        setRequests([]);
      }
    } catch (error) {
      console.error('Erro ao buscar solicitações:', error);
      toast.error('Erro ao carregar solicitações de repasse');
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async (requestId: string, newStatus: 'approved' | 'rejected' | 'completed') => {
    setProcessingId(requestId);
    try {
      const request = requests.find(r => r.id === requestId);
      if (!request) {
        throw new Error('Solicitação não encontrada');
      }

      console.log('🔄 Processando repasse:', {
        requestId,
        newStatus,
        amount: request.amount,
        photographer: request.photographer?.full_name
      });

      // Buscar user_id atual (admin que está processando)
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      const updateData: any = {
        status: newStatus,
        notes: notes[requestId] || null
      };

      // Se for aprovação, setar processed_at e processed_by
      if (newStatus === 'approved' || newStatus === 'rejected') {
        updateData.processed_at = new Date().toISOString();
        updateData.processed_by = currentUser?.id || null;
      }

      // Se for conclusão (pagamento efetivado), setar completed_at e completed_by
      if (newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString();
        updateData.completed_by = currentUser?.id || null;
      }
      
      const { error: updateError } = await supabase
        .from('payout_requests')
        .update(updateData)
        .eq('id', requestId);

      if (updateError) {
        console.error('❌ Erro ao atualizar status:', updateError);
        throw updateError;
      }

      console.log('✅ Status atualizado com sucesso');

      // Se aprovado, enviar email de notificação
      if (newStatus === 'approved') {
        console.log('📧 Enviando email de aprovação...');
        
        try {
          const { error: emailError } = await supabase.functions.invoke('send-payout-approved-email', {
            body: {
              photographerEmail: request.photographer?.email,
              photographerName: request.photographer?.full_name || 'Fotógrafo',
              amount: request.amount,
              requestedAt: request.requested_at,
              approvedAt: new Date().toISOString(),
              paymentMethod: 'PIX',
              estimatedDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() // +2 dias
            }
          });

          if (emailError) {
            console.warn('⚠️ Erro ao enviar email (não crítico):', emailError);
          } else {
            console.log('✅ Email enviado com sucesso');
          }
        } catch (emailError) {
          console.warn('⚠️ Erro ao enviar email:', emailError);
          // Não bloquear a aprovação por erro no email
        }
      }

      const messages = {
        approved: `Repasse de ${formatCurrency(request.amount)} aprovado!`,
        rejected: 'Repasse rejeitado',
        completed: `Repasse de ${formatCurrency(request.amount)} marcado como pago!`
      };
      
      toast.success(messages[newStatus] || 'Status atualizado');
      
      await fetchPayoutRequests();
      
    } catch (error: any) {
      console.error('❌ Erro ao processar repasse:', error);
      toast.error(error.message || 'Erro ao processar solicitação');
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />Pendente</Badge>;
      case 'approved':
        return <Badge className="bg-blue-600 gap-1"><Clock className="h-3 w-3" />Aprovado</Badge>;
      case 'completed':
        return <Badge className="bg-green-600 gap-1"><CheckCircle2 className="h-3 w-3" />Pago</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Rejeitado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const approvedRequests = requests.filter(r => r.status === 'approved');
  const processedRequests = requests.filter(r => r.status === 'completed' || r.status === 'rejected');

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 bg-muted rounded w-1/3 animate-pulse"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded animate-pulse"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Solicitações Pendentes de Aprovação */}
      <Card>
        <CardHeader className="bg-gradient-to-r from-yellow-50 to-transparent dark:from-yellow-950/20">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-600" />
            Aguardando Aprovação ({pendingRequests.length})
          </CardTitle>
          <CardDescription>
            Solicitações que precisam ser aprovadas ou rejeitadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhuma solicitação pendente
            </p>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="border rounded-lg p-4 space-y-4 bg-card hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="font-semibold text-lg">
                        {request.photographer?.full_name || 'Fotógrafo'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {request.photographer?.email}
                      </div>
                        {request.recipient_name && (
                          <div className="text-sm text-muted-foreground">
                            Beneficiário: {request.recipient_name}
                          </div>
                        )}
                        {request.pix_key && (
                          <div className="text-sm text-muted-foreground">
                            PIX: {request.pix_key}
                          </div>
                        )}
                        {request.institution && (
                          <div className="text-sm text-muted-foreground">
                            Instituição: {request.institution}
                          </div>
                        )}
                      <div className="text-xs text-muted-foreground">
                        Solicitado em: {new Date(request.requested_at).toLocaleString('pt-BR')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary flex items-center gap-1">
                        <DollarSign className="h-5 w-5" />
                        {formatCurrency(request.amount)}
                      </div>
                      {getStatusBadge(request.status)}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Observações (opcional)</label>
                    <Textarea
                      placeholder="Adicione observações sobre este repasse..."
                      value={notes[request.id] || ''}
                      onChange={(e) => setNotes({ ...notes, [request.id]: e.target.value })}
                      rows={2}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleProcess(request.id, 'approved')}
                      disabled={processingId === request.id}
                      className="flex-1 gap-2"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Aprovar Repasse
                    </Button>
                    <Button
                      onClick={() => handleProcess(request.id, 'rejected')}
                      disabled={processingId === request.id}
                      variant="destructive"
                      className="flex-1 gap-2"
                    >
                      <XCircle className="h-4 w-4" />
                      Rejeitar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Repasses Aprovados - Aguardando Pagamento */}
      <Card>
        <CardHeader className="bg-gradient-to-r from-blue-50 to-transparent dark:from-blue-950/20">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-blue-600" />
            Aprovados - Aguardando Pagamento ({approvedRequests.length})
          </CardTitle>
          <CardDescription>
            Repasses aprovados que precisam ser pagos ao fotógrafo
          </CardDescription>
        </CardHeader>
        <CardContent>
          {approvedRequests.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhum repasse aprovado aguardando pagamento
            </p>
          ) : (
            <div className="space-y-4">
              {approvedRequests.map((request) => (
                <div
                  key={request.id}
                  className="border rounded-lg p-4 space-y-4 bg-card hover:shadow-md transition-shadow border-blue-200 dark:border-blue-900"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="font-semibold text-lg">
                        {request.photographer?.full_name || 'Fotógrafo'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {request.photographer?.email}
                      </div>
                      {request.recipient_name && (
                        <div className="text-sm text-muted-foreground">
                          Beneficiário: {request.recipient_name}
                        </div>
                      )}
                      {request.pix_key && (
                        <div className="text-sm font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                          PIX: {request.pix_key}
                        </div>
                      )}
                      {request.institution && (
                        <div className="text-sm text-muted-foreground">
                          Instituição: {request.institution}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        Aprovado em: {request.processed_at ? new Date(request.processed_at).toLocaleString('pt-BR') : '-'}
                      </div>
                      {request.notes && (
                        <div className="text-xs text-muted-foreground italic mt-2 p-2 bg-muted rounded">
                          "{request.notes}"
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600 flex items-center gap-1">
                        <DollarSign className="h-5 w-5" />
                        {formatCurrency(request.amount)}
                      </div>
                      {getStatusBadge(request.status)}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleProcess(request.id, 'completed')}
                      disabled={processingId === request.id}
                      className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Marcar como Pago
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Histórico - Pagos e Rejeitados */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico Completo</CardTitle>
          <CardDescription>
            Repasses pagos e rejeitados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {processedRequests.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhum repasse no histórico ainda
            </p>
          ) : (
            <div className="space-y-3">
              {processedRequests.map((request) => (
                <div
                  key={request.id}
                  className="border rounded-lg p-4 bg-muted/30"
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="font-medium">
                        {request.photographer?.full_name || 'Fotógrafo'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {request.status === 'completed' ? (
                          <>
                            Pago em: {request.completed_at ? new Date(request.completed_at).toLocaleString('pt-BR') : '-'}
                          </>
                        ) : (
                          <>
                            Processado em: {request.processed_at ? new Date(request.processed_at).toLocaleString('pt-BR') : '-'}
                          </>
                        )}
                      </div>
                      {request.pix_key && request.status === 'completed' && (
                        <div className="text-xs font-mono text-muted-foreground">
                          PIX: {request.pix_key}
                        </div>
                      )}
                      {request.notes && (
                        <div className="text-xs text-muted-foreground italic mt-1">
                          "{request.notes}"
                        </div>
                      )}
                    </div>
                    <div className="text-right space-y-2">
                      <div className="font-semibold">
                        {formatCurrency(request.amount)}
                      </div>
                      {getStatusBadge(request.status)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
