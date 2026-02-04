import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Clock, CheckCircle, XCircle, AlertCircle, Banknote, Key } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePhotographerBalance } from '@/hooks/usePhotographerBalance';
import { usePhotographerPix } from '@/hooks/usePhotographerPix';

interface PayoutRequest {
  id: string;
  amount: number;
  status: string;
  pix_key: string;
  recipient_name: string;
  institution: string | null;
  requested_at: string;
  processed_at: string | null;
  notes: string | null;
}

const PayoutRequestPage = () => {
  const { user } = useAuth();
  const balance = usePhotographerBalance();
  const pixStatus = usePhotographerPix();
  const [submitting, setSubmitting] = useState(false);
  const [requests, setRequests] = useState<PayoutRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

  useEffect(() => {
    if (user) {
      fetchRequests();
    }
  }, [user]);

  const fetchRequests = async () => {
    if (!user) return;
    
    try {
      setLoadingRequests(true);
      
      const { data: history, error: historyError } = await supabase
        .from('payout_requests')
        .select('*')
        .eq('photographer_id', user.id)
        .order('requested_at', { ascending: false })
        .limit(10);

      if (historyError) throw historyError;
      setRequests(history || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoadingRequests(false);
    }
  };

  const hasPendingRequest = requests.some(r => r.status === 'pending' || r.status === 'approved');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('Você precisa estar logado');
      return;
    }

    if (!pixStatus.hasPixKey) {
      toast.error('Você precisa cadastrar uma chave PIX antes de solicitar saque');
      return;
    }

    if (balance.availableAmount < 50) {
      toast.error('Valor mínimo para saque é R$ 50,00. Você tem apenas ' + formatCurrency(balance.availableAmount) + ' disponível.');
      return;
    }

    try {
      setSubmitting(true);

      // Buscar a chave PIX completa do perfil (não a mascarada)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('pix_key, pix_recipient_name, pix_institution')
        .eq('id', user.id)
        .single();

      if (profileError || !profile?.pix_key) {
        toast.error('Erro ao buscar dados do PIX. Verifique seu cadastro.');
        return;
      }

      console.log('📤 Criando solicitação de repasse com PIX cadastrado...', {
        photographer_id: user.id,
        amount: balance.availableAmount,
        recipient_name: profile.pix_recipient_name,
      });

      const { data: insertedData, error: insertError } = await supabase
        .from('payout_requests')
        .insert({
          photographer_id: user.id,
          amount: balance.availableAmount,
          pix_key: profile.pix_key,
          recipient_name: profile.pix_recipient_name || '',
          institution: profile.pix_institution || null,
          status: 'pending'
        })
        .select('id, amount, status')
        .single();

      if (insertError) {
        console.error('❌ Erro ao inserir payout_request:', insertError);
        throw insertError;
      }

      console.log('✅ Solicitação criada com sucesso:', insertedData);

      toast.success('Solicitação de saque enviada com sucesso!', {
        description: `${formatCurrency(balance.availableAmount)} será processado em até 2 dias úteis`
      });
      
      // Recarregar dados
      await Promise.all([fetchRequests(), balance.refetch()]);

    } catch (error: any) {
      console.error('❌ Erro ao solicitar repasse:', error);
      
      let errorMessage = 'Erro ao solicitar saque. Tente novamente.';
      
      if (error.message?.includes('recipient_name')) {
        errorMessage = 'Nome do beneficiário é obrigatório. Verifique seu cadastro de PIX.';
      } else if (error.message?.includes('pix_key')) {
        errorMessage = 'Chave PIX inválida. Verifique seu cadastro.';
      } else if (error.code === '23505') {
        errorMessage = 'Você já possui uma solicitação pendente';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />Pendente</Badge>;
      case 'approved':
        return <Badge variant="default" className="gap-1 bg-blue-500"><AlertCircle className="h-3 w-3" />Aprovado</Badge>;
      case 'completed':
        return <Badge variant="default" className="gap-1 bg-green-500"><CheckCircle className="h-3 w-3" />Pago</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Recusado</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (balance.loading || loadingRequests) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
          <Banknote className="h-6 w-6 sm:h-8 sm:w-8" />
          Solicitar Saque
        </h1>
        <p className="text-muted-foreground mt-2 text-sm sm:text-base">
          Solicite o repasse dos seus ganhos via PIX
        </p>
      </div>

      {/* Informação sobre Múltiplas Solicitações */}
      <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50/80 to-cyan-50/50 dark:border-blue-900 dark:from-blue-950/30 dark:to-cyan-950/20">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-blue-500/10 p-2 mt-0.5">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 space-y-2">
              <h3 className="font-semibold text-base">💰 Agora você pode fazer múltiplas solicitações!</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Não precisa mais esperar! Você pode solicitar novos saques sempre que tiver <strong>saldo disponível maior que R$ 50,00</strong>, mesmo com outras solicitações em andamento.
              </p>
              <div className="flex flex-wrap gap-2 text-xs pt-1">
                <span className="inline-flex items-center gap-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded-full">
                  <Clock className="h-3 w-3" />
                  Pendente
                </span>
                <span className="text-muted-foreground">→</span>
                <span className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full">
                  <CheckCircle className="h-3 w-3" />
                  Aprovado
                </span>
                <span className="text-muted-foreground">→</span>
                <span className="inline-flex items-center gap-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 px-2 py-1 rounded-full">
                  <DollarSign className="h-3 w-3" />
                  Pago
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card className="border-2 border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Disponível para Saque
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(balance.availableAmount)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Pode ser sacado agora</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Em Período de Segurança
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl sm:text-3xl font-bold">
              {formatCurrency(balance.pendingAmount)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Disponível em até 12h</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hasPendingRequest ? (
              <div className="space-y-2">
                <Badge variant="outline" className="gap-1">
                  <Clock className="h-3 w-3" />
                  Solicitação Pendente
                </Badge>
                <p className="text-xs text-muted-foreground">
                  Aguarde a aprovação para solicitar novo saque
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Badge variant="default" className="gap-1 bg-green-500">
                  <CheckCircle className="h-3 w-3" />
                  Pode Solicitar
                </Badge>
                <p className="text-xs text-muted-foreground">
                  Sem solicitações pendentes
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="solicitar" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="solicitar">Nova Solicitação</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="solicitar" className="space-y-6">
          {!pixStatus.hasPixKey ? (
            <Card className="border-2 border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="rounded-full bg-amber-100 dark:bg-amber-900/30 p-4">
                    <Key className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Chave PIX não cadastrada</h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      Você precisa cadastrar uma chave PIX antes de solicitar saques.
                    </p>
                    <Link to="/dashboard/photographer/pix">
                      <Button>Cadastrar Chave PIX</Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Solicitar Repasse via PIX</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Dados do PIX Cadastrado */}
                  <div className="p-4 bg-muted/50 rounded-lg border space-y-3">
                    <div className="flex items-center gap-2 mb-3">
                      <Key className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">Chave PIX Cadastrada</span>
                      <Link 
                        to="/dashboard/photographer/pix" 
                        className="ml-auto text-xs text-primary hover:underline"
                      >
                        Alterar
                      </Link>
                    </div>
                    
                    <div className="grid gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tipo:</span>
                        <span className="font-medium capitalize">{pixStatus.pixKeyType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Chave:</span>
                        <span className="font-medium">{pixStatus.pixKeyMasked}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Beneficiário:</span>
                        <span className="font-medium">{pixStatus.recipientName}</span>
                      </div>
                      {pixStatus.institution && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Instituição:</span>
                          <span className="font-medium">{pixStatus.institution}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Valor */}
                  <div className="space-y-2">
                    <span className="text-sm font-medium">Valor a Receber</span>
                    <div className="text-3xl sm:text-4xl font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(balance.availableAmount)}
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Este é o valor total disponível para saque
                    </p>
                  </div>

                  {/* Alertas */}
                  {balance.availableAmount < 50 && (
                    <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg">
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        ⚠️ Valor mínimo para saque: R$ 50,00
                      </p>
                    </div>
                  )}

                  {hasPendingRequest && balance.availableAmount >= 50 && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        ℹ️ Você tem solicitações em processamento. Este novo saque será adicionado à fila e processado após a aprovação das anteriores.
                      </p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    size="lg"
                    disabled={submitting || balance.availableAmount < 50 || !pixStatus.hasPixKey}
                    className="w-full h-12 sm:h-14 text-base sm:text-lg"
                  >
                    {submitting ? 'Enviando...' : `Solicitar Saque de ${formatCurrency(balance.availableAmount)}`}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="historico" className="space-y-4">
          {requests.length === 0 ? (
            <Card className="p-8 text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma solicitação ainda</h3>
              <p className="text-muted-foreground text-sm">
                Suas solicitações de saque aparecerão aqui
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {requests.map((request) => (
                <Card key={request.id}>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-xl sm:text-2xl font-bold">
                            {formatCurrency(request.amount)}
                          </p>
                          {getStatusBadge(request.status)}
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          Solicitado em {new Date(request.requested_at).toLocaleDateString('pt-BR')}
                        </p>
                        {request.pix_key && (
                          <p className="text-xs text-muted-foreground">
                            PIX: {request.pix_key}
                          </p>
                        )}
                      </div>
                      {request.processed_at && (
                        <p className="text-xs text-muted-foreground">
                          Processado em {new Date(request.processed_at).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                    {request.notes && (
                      <div className="mt-3 p-3 bg-muted rounded-lg">
                        <p className="text-sm">{request.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PayoutRequestPage;
