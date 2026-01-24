import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Clock, CheckCircle } from 'lucide-react';

export default function CheckoutProcessing() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [status, setStatus] = useState<'processing' | 'timeout' | 'success'>('processing');
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const externalRef = searchParams.get('ref') || searchParams.get('external_reference') || '';
  
  // Suporta tanto IDs separados por vírgula quanto formato batch
  const isBatchFormat = externalRef.startsWith('batch_');
  const purchaseIdsFromRef = !isBatchFormat && externalRef ? externalRef.split(',').filter(id => id.length > 0) : [];

  useEffect(() => {
    document.title = 'Processando pagamento | STA Fotos';
  }, []);

  const checkPurchaseStatus = useCallback(async () => {
    if (!user) return false;
    
    try {
      let data: any[] = [];
      
      if (isBatchFormat) {
        // Buscar purchases pelo batch ID armazenado no stripe_payment_intent_id
        const { data: batchData, error: batchError } = await supabase
          .from('purchases')
          .select('id, status')
          .eq('buyer_id', user.id)
          .like('stripe_payment_intent_id', `batch:${externalRef}%`);
        
        if (batchError) throw batchError;
        data = batchData || [];
      } else if (purchaseIdsFromRef.length > 0) {
        // Buscar por IDs diretos
        const { data: directData, error: directError } = await supabase
          .from('purchases')
          .select('id, status')
          .in('id', purchaseIdsFromRef)
          .eq('buyer_id', user.id);
        
        if (directError) throw directError;
        data = directData || [];
      } else {
        // Fallback: buscar purchases recentes do usuário pendentes ou recém-completadas
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const { data: recentData, error: recentError } = await supabase
          .from('purchases')
          .select('id, status')
          .eq('buyer_id', user.id)
          .gte('created_at', fiveMinutesAgo)
          .order('created_at', { ascending: false });
        
        if (recentError) throw recentError;
        data = recentData || [];
      }

      if (data && data.length > 0) {
        const completed = data.filter(p => p.status === 'completed');
        const failed = data.filter(p => p.status === 'failed');
        const pending = data.filter(p => p.status === 'pending');
        
        setCompletedCount(completed.length);
        setTotalCount(data.length);

        if (completed.length === data.length) {
          // Todas completas! Redirecionar para página de sucesso
          setStatus('success');
          const allIds = data.map(p => p.id).join(',');
          setTimeout(() => {
            navigate(`/checkout/sucesso?ref=${allIds}`);
          }, 1000);
          return true;
        } else if (failed.length > 0 && pending.length === 0) {
          // Falha confirmada, nenhuma pendente
          const allIds = data.map(p => p.id).join(',');
          navigate(`/checkout/falha?ref=${allIds}`);
          return true;
        }
      }

      return false;
    } catch (err) {
      console.error('Erro ao verificar status:', err);
      return false;
    }
  }, [user, externalRef, isBatchFormat, purchaseIdsFromRef, navigate]);

  useEffect(() => {
    if (!user || (!purchaseIdsFromRef.length && !isBatchFormat && !externalRef)) {
      // Se não temos referência, aguardar um pouco para o externalRef carregar
      const timeout = setTimeout(() => {
        if (!externalRef) {
          navigate('/dashboard');
        }
      }, 2000);
      return () => clearTimeout(timeout);
    }

    let attempts = 0;
    const maxAttempts = 60; // 60 x 2s = 2 minutos (polling mais frequente)
    let intervalId: NodeJS.Timeout;

    // Primeira verificação imediata
    checkPurchaseStatus().then(done => {
      if (done) return;

      // Polling a cada 2 segundos (mais frequente para melhor UX)
      intervalId = setInterval(async () => {
        attempts++;
        setTimeElapsed(attempts * 2);
        
        const done = await checkPurchaseStatus();
        if (done) {
          clearInterval(intervalId);
          return;
        }

        if (attempts >= maxAttempts) {
          clearInterval(intervalId);
          setStatus('timeout');
          setTimeout(() => {
            navigate(`/checkout/falha?ref=${externalRef}&timeout=true`);
          }, 2000);
        }
      }, 2000);
    });

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [user, externalRef, purchaseIdsFromRef.join(','), isBatchFormat, navigate, checkPurchaseStatus]);

  return (
    <main className="container mx-auto px-4 py-12 flex items-center justify-center min-h-screen bg-gradient-to-b from-background to-muted/30">
      <Card className="max-w-md w-full shadow-xl border-2">
        <CardContent className="py-12 text-center space-y-6">
          {status === 'processing' ? (
            <>
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
                <Loader2 className="h-20 w-20 text-primary mx-auto animate-spin relative z-10" />
              </div>
              <div className="space-y-3">
                <h1 className="text-2xl font-bold">Processando seu pagamento</h1>
                <p className="text-muted-foreground">
                  Aguarde enquanto confirmamos sua compra...
                </p>
              </div>
              {totalCount > 0 && (
                <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
                    <span className="text-sm font-medium">Verificando pagamento</span>
                  </div>
                  <p className="text-lg font-bold text-primary">
                    {completedCount}/{totalCount} {totalCount === 1 ? 'foto confirmada' : 'fotos confirmadas'}
                  </p>
                </div>
              )}
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4 animate-pulse" />
                <span>{timeElapsed}s</span>
              </div>
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  ⏳ Isso pode levar até 2 minutos. <strong>Não feche esta página.</strong>
                </p>
              </div>
            </>
          ) : status === 'success' ? (
            <>
              <div className="relative">
                <div className="absolute inset-0 bg-green-500/30 rounded-full blur-xl" />
                <CheckCircle className="h-24 w-24 text-green-500 mx-auto animate-bounce relative z-10" />
              </div>
              <div className="space-y-3">
                <h1 className="text-3xl font-bold text-green-600">🎉 Pagamento Aprovado!</h1>
                <p className="text-lg text-muted-foreground">
                  Sua compra foi confirmada com sucesso.
                </p>
              </div>
              <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-4 rounded-lg">
                <p className="text-green-700 dark:text-green-400 font-medium">
                  ✅ Redirecionando para suas fotos...
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="relative">
                <div className="absolute inset-0 bg-orange-500/20 rounded-full blur-xl" />
                <Clock className="h-20 w-20 text-orange-500 mx-auto relative z-10" />
              </div>
              <div className="space-y-3">
                <h1 className="text-2xl font-bold text-orange-600">Tempo limite atingido</h1>
                <p className="text-muted-foreground">
                  Não se preocupe! Verifique "Minhas Compras" em alguns minutos.
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                Redirecionando...
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
