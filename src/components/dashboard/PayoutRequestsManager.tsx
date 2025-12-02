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
    // Prevenir múltiplos cliques
    if (processingId) {
      console.warn('⚠️ Já processando outra solicitação');
      return;
    }

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
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('❌ Erro ao buscar usuário:', userError);
        throw new Error('Erro ao verificar autenticação');
      }
      
      const updateData: any = {
        status: newStatus,
        notes: notes[requestId] || null
      };

      // Se for aprovação ou rejeição, setar processed_at e processed_by
      if (newStatus === 'approved' || newStatus === 'rejected') {
        updateData.processed_at = new Date().toISOString();
        updateData.processed_by = currentUser?.id || null;
      }

      // Se for conclusão (pagamento efetivado), setar completed_at e completed_by
      if (newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString();
        updateData.completed_by = currentUser?.id || null;
      }
      
      console.log('📤 Enviando update:', { requestId, updateData });
      
      const { error: updateError } = await supabase
        .from('payout_requests')
        .update(updateData)
        .eq('id', requestId);

      if (updateError) {
        console.error('❌ Erro ao atualizar status:', {
          error: updateError,
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint
        });
        throw new Error(updateError.message || 'Erro ao processar repasse');
      }

      console.log('✅ Update realizado com sucesso');

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
        approved: `Repasse de ${formatCurrency(request.amount)} aprovado com sucesso!`,
        rejected: 'Repasse rejeitado',
        completed: `Repasse de ${formatCurrency(request.amount)} marcado como pago!`
      };
      
      toast.success(messages[newStatus] || 'Status atualizado com sucesso');
      
      // Recarregar dados
      await fetchPayoutRequests();
      
    } catch (error: any) {
      console.error('❌ Erro ao processar repasse:', error);
      
      // Mensagem de erro mais amigável
      let errorMessage = 'Erro ao processar solicitação';
      if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
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
      {/* Informação sobre o Sistema */}
      <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-1">Sistema de Repasse Profissional</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Sistema completo de gerenciamento de repasses via PIX. Fotógrafos podem solicitar múltiplos repasses com saldo disponível mínimo de R$ 50,00. Processo em 3 etapas: <strong>Pendente</strong> → <strong>Aprovado</strong> → <strong>Pago</strong>.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

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
                  className="border-2 border-yellow-200 dark:border-yellow-900/50 rounded-xl p-5 space-y-4 bg-gradient-to-br from-yellow-50/50 to-orange-50/30 dark:from-yellow-950/20 dark:to-orange-950/10 hover:shadow-xl transition-all duration-300"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold text-lg text-foreground">
                          {request.photographer?.full_name || 'Fotógrafo'}
                        </div>
                        {getStatusBadge(request.status)}
                      </div>
                      
                      <div className="space-y-1 text-sm">
                        <div className="text-muted-foreground flex items-center gap-1">
                          <span className="font-medium">Email:</span>
                          {request.photographer?.email}
                        </div>
                        {request.recipient_name && (
                          <div className="text-muted-foreground flex items-center gap-1">
                            <span className="font-medium">Beneficiário:</span>
                            {request.recipient_name}
                          </div>
                        )}
                        {request.pix_key && (
                          <div className="text-muted-foreground flex items-center gap-1 font-mono bg-muted/50 px-2 py-1 rounded">
                            <span className="font-medium font-sans">PIX:</span>
                            {request.pix_key}
                          </div>
                        )}
                        {request.institution && (
                          <div className="text-muted-foreground flex items-center gap-1">
                            <span className="font-medium">Instituição:</span>
                            {request.institution}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground pt-1">
                          Solicitado em: {new Date(request.requested_at).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right space-y-1">
                      <div className="text-3xl font-bold text-yellow-700 dark:text-yellow-400 flex items-center gap-1 justify-end">
                        <DollarSign className="h-6 w-6" />
                        {formatCurrency(request.amount)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Valor solicitado
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Observações Administrativas (opcional)
                    </label>
                    <Textarea
                      placeholder="Ex: Transferência será feita via PIX no dia XX/XX..."
                      value={notes[request.id] || ''}
                      onChange={(e) => setNotes({ ...notes, [request.id]: e.target.value })}
                      rows={3}
                      className="resize-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      Esta nota será visível para o fotógrafo e ficará registrada no histórico
                    </p>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => handleProcess(request.id, 'approved')}
                      disabled={!!processingId}
                      className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white"
                      size="lg"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {processingId === request.id ? 'Processando...' : 'Aprovar Repasse'}
                    </Button>
                    <Button
                      onClick={() => handleProcess(request.id, 'rejected')}
                      disabled={!!processingId}
                      variant="destructive"
                      className="flex-1 gap-2"
                      size="lg"
                    >
                      <XCircle className="h-4 w-4" />
                      {processingId === request.id ? 'Processando...' : 'Rejeitar'}
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
                  className="border-2 border-blue-200 dark:border-blue-900/50 rounded-xl p-5 space-y-4 bg-gradient-to-br from-blue-50/50 to-cyan-50/30 dark:from-blue-950/20 dark:to-cyan-950/10 hover:shadow-xl transition-all duration-300"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold text-lg text-foreground">
                          {request.photographer?.full_name || 'Fotógrafo'}
                        </div>
                        {getStatusBadge(request.status)}
                      </div>
                      
                      <div className="space-y-1 text-sm">
                        <div className="text-muted-foreground flex items-center gap-1">
                          <span className="font-medium">Email:</span>
                          {request.photographer?.email}
                        </div>
                        {request.recipient_name && (
                          <div className="text-muted-foreground flex items-center gap-1">
                            <span className="font-medium">Beneficiário:</span>
                            {request.recipient_name}
                          </div>
                        )}
                        {request.pix_key && (
                          <div className="text-muted-foreground flex items-center gap-1 font-mono bg-blue-100 dark:bg-blue-950/50 px-3 py-1.5 rounded-md border border-blue-200 dark:border-blue-900">
                            <span className="font-medium font-sans text-blue-900 dark:text-blue-100">PIX:</span>
                            <span className="text-blue-900 dark:text-blue-100 select-all">{request.pix_key}</span>
                          </div>
                        )}
                        {request.institution && (
                          <div className="text-muted-foreground flex items-center gap-1">
                            <span className="font-medium">Instituição:</span>
                            {request.institution}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground pt-1 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-green-600" />
                          Aprovado em: {request.processed_at ? new Date(request.processed_at).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : '-'}
                        </div>
                        {request.notes && (
                          <div className="text-xs text-muted-foreground italic mt-2 p-2 bg-blue-100/50 dark:bg-blue-950/30 rounded border border-blue-200 dark:border-blue-900">
                            <span className="font-medium not-italic">Observação:</span> "{request.notes}"
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right space-y-1">
                      <div className="text-3xl font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1 justify-end">
                        <DollarSign className="h-6 w-6" />
                        {formatCurrency(request.amount)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        A ser transferido
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => handleProcess(request.id, 'completed')}
                      disabled={!!processingId}
                      className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg transition-all"
                      size="lg"
                    >
                      <CheckCircle2 className="h-5 w-5" />
                      {processingId === request.id ? 'Processando...' : 'Confirmar Pagamento Realizado'}
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
