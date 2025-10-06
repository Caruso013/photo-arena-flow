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
  notes?: string;
  photographer: {
    full_name: string;
    email: string;
  };
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

  const handleProcess = async (requestId: string, newStatus: 'completed' | 'rejected') => {
    setProcessingId(requestId);
    try {
      const { error } = await supabase
        .from('payout_requests')
        .update({
          status: newStatus,
          processed_at: new Date().toISOString(),
          notes: notes[requestId] || null
        })
        .eq('id', requestId);

      if (error) throw error;

      toast.success(
        newStatus === 'completed' 
          ? 'Repasse aprovado com sucesso!' 
          : 'Repasse rejeitado'
      );
      
      fetchPayoutRequests();
    } catch (error) {
      console.error('Erro ao processar repasse:', error);
      toast.error('Erro ao processar solicitação');
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />Pendente</Badge>;
      case 'completed':
        return <Badge className="bg-green-600 gap-1"><CheckCircle2 className="h-3 w-3" />Concluído</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Rejeitado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const processedRequests = requests.filter(r => r.status !== 'pending');

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
      {/* Solicitações Pendentes */}
      <Card>
        <CardHeader className="bg-gradient-to-r from-yellow-50 to-transparent dark:from-yellow-950/20">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-600" />
            Solicitações Pendentes ({pendingRequests.length})
          </CardTitle>
          <CardDescription>
            Solicitações aguardando aprovação
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
                      onClick={() => handleProcess(request.id, 'completed')}
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

      {/* Histórico */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Repasses</CardTitle>
          <CardDescription>
            Repasses processados anteriormente
          </CardDescription>
        </CardHeader>
        <CardContent>
          {processedRequests.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhum repasse processado ainda
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
                        Processado em: {request.processed_at ? new Date(request.processed_at).toLocaleString('pt-BR') : '-'}
                      </div>
                      {request.notes && (
                        <div className="text-xs text-muted-foreground italic">
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
