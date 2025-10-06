import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, XCircle } from 'lucide-react';
import PaymentModal from '@/components/modals/PaymentModal';

interface Purchase {
  id: string;
  photo: {
    id: string;
    title?: string;
    price: number;
    watermarked_url: string;
    thumbnail_url: string;
  } | null;
}

export default function CheckoutFailure() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [showRetryModal, setShowRetryModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const externalRef = searchParams.get('ref') || '';
  const isTimeout = searchParams.get('timeout') === 'true';
  const purchaseIds = externalRef ? externalRef.split(',') : [];

  useEffect(() => {
    document.title = 'Pagamento não concluído | STA Fotos';
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', 'Ocorreu um problema com seu pagamento. Tente novamente.');
  }, []);

  useEffect(() => {
    const fetchPurchases = async () => {
      if (!user || purchaseIds.length === 0) {
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('purchases')
          .select(`*, photo:photos(id, title, price, watermarked_url, thumbnail_url)`)
          .in('id', purchaseIds)
          .eq('buyer_id', user.id);
        if (error) throw error;
        setPurchases(data || []);
      } catch (err) {
        console.error('Erro ao buscar compras:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPurchases();
  }, [user, purchaseIds.join(',')]);

  const handleRetry = () => {
    setShowRetryModal(true);
  };

  const photosForRetry = purchases
    .filter(p => p.photo)
    .map(p => ({
      id: p.photo!.id,
      title: p.photo!.title,
      price: p.photo!.price,
      watermarked_url: p.photo!.watermarked_url,
      thumbnail_url: p.photo!.thumbnail_url,
    }));

  return (
    <main className="container mx-auto px-4 py-8 space-y-6">
      <header className="flex items-center gap-3">
        <XCircle className="h-8 w-8 text-destructive" />
        <h1 className="text-3xl font-bold">
          {isTimeout ? 'Tempo limite excedido' : 'Pagamento não concluído'}
        </h1>
      </header>

      <Card className="border-destructive">
        <CardContent className="py-8 space-y-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-destructive mt-1" />
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">O que aconteceu?</h2>
              {isTimeout ? (
                <p className="text-muted-foreground">
                  O sistema não conseguiu confirmar seu pagamento no tempo esperado. 
                  Isso pode significar que o pagamento ainda está sendo processado ou foi cancelado.
                </p>
              ) : (
                <p className="text-muted-foreground">
                  Seu pagamento não foi aprovado. Possíveis motivos:
                </p>
              )}
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-4">
                <li>Saldo insuficiente ou limite de crédito</li>
                <li>Dados de pagamento incorretos</li>
                <li>Pagamento cancelado</li>
                <li>Problema temporário na operadora</li>
              </ul>
            </div>
          </div>

          {!loading && purchases.length > 0 && (
            <div className="border-t pt-4 space-y-3">
              <p className="font-medium">Itens desta compra:</p>
              <div className="space-y-2">
                {purchases.map((purchase) => (
                  <div key={purchase.id} className="flex items-center gap-3 p-2 bg-muted rounded">
                    {purchase.photo?.thumbnail_url && (
                      <img 
                        src={purchase.photo.thumbnail_url} 
                        alt={purchase.photo.title || 'Foto'}
                        className="w-12 h-12 object-cover rounded"
                      />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium">{purchase.photo?.title || 'Foto'}</p>
                      <p className="text-sm text-muted-foreground">
                        R$ {purchase.photo?.price.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              Voltar ao Dashboard
            </Button>
            {photosForRetry.length > 0 && (
              <Button onClick={handleRetry} className="flex-1">
                Tentar Novamente
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {showRetryModal && (
        <PaymentModal
          isOpen={showRetryModal}
          onClose={() => setShowRetryModal(false)}
          photos={photosForRetry}
          onPaymentSuccess={() => {
            setShowRetryModal(false);
            navigate('/checkout/processando?ref=new');
          }}
        />
      )}
    </main>
  );
}
