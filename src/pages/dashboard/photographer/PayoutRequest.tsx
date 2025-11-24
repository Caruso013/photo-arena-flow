import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Clock, CheckCircle, XCircle, AlertCircle, Banknote } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

const PayoutRequest = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [availableAmount, setAvailableAmount] = useState(0);
  const [pendingAmount, setPendingAmount] = useState(0);
  const [requests, setRequests] = useState<PayoutRequest[]>([]);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);

  // Form
  const [pixKey, setPixKey] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [institution, setInstitution] = useState('');
  const [pixKeyType, setPixKeyType] = useState<'cpf' | 'phone' | 'email' | 'random'>('cpf');

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Buscar saldo disponível e pendente
      const { data: earnings, error: earningsError } = await supabase
        .from('revenue_shares')
        .select('photographer_amount, purchase:purchases!inner(status, created_at)')
        .eq('photographer_id', user.id);

      if (earningsError) throw earningsError;

      const now = new Date();
      const securityPeriod = 12 * 60 * 60 * 1000; // 12 horas

      let available = 0;
      let pending = 0;

      earnings?.forEach((earning: any) => {
        const purchaseDate = new Date(earning.purchase.created_at);
        const timeSincePurchase = now.getTime() - purchaseDate.getTime();

        if (earning.purchase.status === 'completed') {
          if (timeSincePurchase >= securityPeriod) {
            available += earning.photographer_amount;
          } else {
            pending += earning.photographer_amount;
          }
        }
      });

      // Buscar solicitações pendentes ou aprovadas
      const { data: payoutRequests, error: payoutError } = await supabase
        .from('payout_requests')
        .select('amount')
        .eq('photographer_id', user.id)
        .in('status', ['pending', 'approved']);

      if (payoutError) throw payoutError;

      const requestedAmount = payoutRequests?.reduce((sum, req) => sum + req.amount, 0) || 0;
      available -= requestedAmount;

      setAvailableAmount(Math.max(0, available));
      setPendingAmount(pending);

      // Verificar se há solicitação pendente
      const hasPending = payoutRequests && payoutRequests.length > 0;
      setHasPendingRequest(hasPending);

      // Buscar histórico de solicitações
      const { data: history, error: historyError } = await supabase
        .from('payout_requests')
        .select('*')
        .eq('photographer_id', user.id)
        .order('requested_at', { ascending: false })
        .limit(10);

      if (historyError) throw historyError;
      setRequests(history || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const validatePixKey = (key: string, type: typeof pixKeyType): boolean => {
    switch (type) {
      case 'cpf':
        return /^\d{11}$/.test(key.replace(/\D/g, ''));
      case 'phone':
        return /^\d{10,11}$/.test(key.replace(/\D/g, ''));
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(key);
      case 'random':
        return key.length >= 32;
      default:
        return false;
    }
  };

  const formatPixKey = (key: string, type: typeof pixKeyType): string => {
    const clean = key.replace(/\D/g, '');
    
    switch (type) {
      case 'cpf':
        return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
      case 'phone':
        return clean.length === 11 
          ? clean.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
          : clean.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
      default:
        return key;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('Você precisa estar logado');
      return;
    }

    if (hasPendingRequest) {
      toast.error('Você já possui uma solicitação em andamento');
      return;
    }

    if (availableAmount < 50) {
      toast.error('Valor mínimo para saque é R$ 50,00');
      return;
    }

    if (!pixKey || !recipientName) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (!validatePixKey(pixKey, pixKeyType)) {
      toast.error('Chave PIX inválida');
      return;
    }

    try {
      setSubmitting(true);

      const { error } = await supabase
        .from('payout_requests')
        .insert({
          photographer_id: user.id,
          amount: availableAmount,
          pix_key: pixKey,
          recipient_name: recipientName,
          institution: institution || null,
          status: 'pending'
        });

      if (error) throw error;

      toast.success('Solicitação de saque enviada com sucesso!');
      
      // Limpar formulário
      setPixKey('');
      setRecipientName('');
      setInstitution('');
      
      // Recarregar dados
      fetchData();

    } catch (error: any) {
      console.error('Error requesting payout:', error);
      toast.error(error.message || 'Erro ao solicitar saque');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />Pendente</Badge>;
      case 'approved':
        return <Badge variant="default" className="gap-1 bg-green-500"><CheckCircle className="h-3 w-3" />Aprovado</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Recusado</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
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
              {formatCurrency(availableAmount)}
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
              {formatCurrency(pendingAmount)}
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
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Solicitar Repasse via PIX</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Tipo de Chave PIX */}
                <div className="space-y-2">
                  <Label>Tipo de Chave PIX</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { value: 'cpf', label: 'CPF' },
                      { value: 'phone', label: 'Telefone' },
                      { value: 'email', label: 'E-mail' },
                      { value: 'random', label: 'Aleatória' },
                    ].map((type) => (
                      <Button
                        key={type.value}
                        type="button"
                        variant={pixKeyType === type.value ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPixKeyType(type.value as any)}
                        className="w-full"
                      >
                        {type.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Chave PIX */}
                <div className="space-y-2">
                  <Label htmlFor="pixKey">Chave PIX *</Label>
                  <Input
                    id="pixKey"
                    value={pixKey}
                    onChange={(e) => setPixKey(e.target.value)}
                    placeholder={
                      pixKeyType === 'cpf' ? '000.000.000-00' :
                      pixKeyType === 'phone' ? '(00) 00000-0000' :
                      pixKeyType === 'email' ? 'seu@email.com' :
                      'Chave aleatória'
                    }
                    className="h-11 sm:h-12 text-base"
                    required
                  />
                </div>

                {/* Nome do Beneficiário */}
                <div className="space-y-2">
                  <Label htmlFor="recipientName">Nome Completo do Beneficiário *</Label>
                  <Input
                    id="recipientName"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="Nome como está no banco"
                    className="h-11 sm:h-12 text-base"
                    required
                  />
                </div>

                {/* Instituição */}
                <div className="space-y-2">
                  <Label htmlFor="institution">Banco/Instituição (Opcional)</Label>
                  <Input
                    id="institution"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder="Ex: Nubank, Banco do Brasil"
                    className="h-11 sm:h-12 text-base"
                  />
                </div>

                {/* Valor */}
                <div className="space-y-2">
                  <Label>Valor a Receber</Label>
                  <div className="text-3xl sm:text-4xl font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(availableAmount)}
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Este é o valor total disponível para saque
                  </p>
                </div>

                {/* Alertas */}
                {availableAmount < 50 && (
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg">
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      ⚠️ Valor mínimo para saque: R$ 50,00
                    </p>
                  </div>
                )}

                {hasPendingRequest && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      ℹ️ Você já possui uma solicitação em andamento
                    </p>
                  </div>
                )}

                <Button
                  type="submit"
                  size="lg"
                  disabled={submitting || hasPendingRequest || availableAmount < 50}
                  className="w-full h-12 sm:h-14 text-base sm:text-lg"
                >
                  {submitting ? 'Enviando...' : `Solicitar Saque de ${formatCurrency(availableAmount)}`}
                </Button>
              </form>
            </CardContent>
          </Card>
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

export default PayoutRequest;
