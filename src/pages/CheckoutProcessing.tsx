import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Clock } from 'lucide-react';

export default function CheckoutProcessing() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [status, setStatus] = useState<'processing' | 'timeout'>('processing');
  const [timeElapsed, setTimeElapsed] = useState(0);

  const externalRef = searchParams.get('ref') || searchParams.get('external_reference') || '';
  const purchaseIds = externalRef ? externalRef.split(',') : [];

  useEffect(() => {
    document.title = 'Processando pagamento | STA Fotos';
  }, []);

  useEffect(() => {
    if (!user || purchaseIds.length === 0) {
      navigate('/dashboard');
      return;
    }

    let attempts = 0;
    const maxAttempts = 40; // 40 x 3s = 2 minutos
    
    const checkPurchaseStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('purchases')
          .select('id, status')
          .in('id', purchaseIds)
          .eq('buyer_id', user.id);

        if (error) throw error;

        if (data && data.length > 0) {
          const allCompleted = data.every(p => p.status === 'completed');
          const anyFailed = data.some(p => p.status === 'failed');
          const stillPending = data.some(p => p.status === 'pending');

          if (allCompleted) {
            // Sucesso! Redirecionar para página de sucesso
            navigate(`/checkout/sucesso?ref=${purchaseIds.join(',')}`);
            return true;
          } else if (anyFailed && !stillPending) {
            // Falha confirmada, nenhuma pendente
            navigate(`/checkout/falha?ref=${purchaseIds.join(',')}`);
            return true;
          }
        }

        attempts++;
        setTimeElapsed(attempts * 3);

        if (attempts >= maxAttempts) {
          // Timeout - considerar como falha
          setStatus('timeout');
          setTimeout(() => {
            navigate(`/checkout/falha?ref=${purchaseIds.join(',')}&timeout=true`);
          }, 2000);
          return true;
        }

        return false;
      } catch (err) {
        console.error('Erro ao verificar status:', err);
        attempts++;
        return false;
      }
    };

    // Primeira verificação imediata
    checkPurchaseStatus().then(done => {
      if (done) return;

      // Polling a cada 3 segundos
      const interval = setInterval(async () => {
        const done = await checkPurchaseStatus();
        if (done) {
          clearInterval(interval);
        }
      }, 3000);

      return () => clearInterval(interval);
    });

  }, [user, purchaseIds.join(','), navigate]);

  return (
    <main className="container mx-auto px-4 py-12 flex items-center justify-center min-h-screen">
      <Card className="max-w-md w-full">
        <CardContent className="py-12 text-center space-y-6">
          {status === 'processing' ? (
            <>
              <Loader2 className="h-16 w-16 text-primary mx-auto animate-spin" />
              <div className="space-y-2">
                <h1 className="text-2xl font-bold">Processando seu pagamento</h1>
                <p className="text-muted-foreground">
                  Aguarde enquanto confirmamos sua compra...
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{timeElapsed}s</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Isso pode levar até 2 minutos
              </p>
            </>
          ) : (
            <>
              <Clock className="h-16 w-16 text-orange-500 mx-auto" />
              <div className="space-y-2">
                <h1 className="text-2xl font-bold">Tempo limite atingido</h1>
                <p className="text-muted-foreground">
                  Redirecionando...
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
