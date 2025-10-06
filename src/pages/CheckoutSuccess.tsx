import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingCart, CheckCircle2, Loader2 } from 'lucide-react';
import { LazyImage } from '@/components/ui/lazy-image';

interface Purchase {
  id: string;
  amount: number;
  created_at: string;
  status: string;
  photo: {
    id: string;
    watermarked_url: string;
    thumbnail_url: string;
    original_url: string;
    campaign: { title: string } | null;
  } | null;
}

export default function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [purchases, setPurchases] = useState<Purchase[]>([]);

  const isApproved = useMemo(() => {
    const status = (searchParams.get('status') || searchParams.get('collection_status') || '').toLowerCase();
    const code = searchParams.get('code') || searchParams.get('status_code');
    return status === 'approved' || status === 'accredited' || status === 'success' || code === '200';
  }, [searchParams]);

  const externalRef = searchParams.get('external_reference') || '';
  const purchaseIds = useMemo(() => externalRef ? externalRef.split(',') : [], [externalRef]);

  // Basic SEO
  useEffect(() => {
    const title = isApproved ? 'Compra concluída | STA Fotos' : 'Processando pagamento | STA Fotos';
    document.title = title;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', 'Compra de fotos concluída. Baixe suas fotos e confira em Minhas Compras.');
  }, [isApproved]);

  useEffect(() => {
    const fetchPurchases = async () => {
      if (!user || purchaseIds.length === 0) {
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('purchases')
          .select(`*, photo:photos(id, watermarked_url, thumbnail_url, original_url, campaign:campaigns(title))`)
          .in('id', purchaseIds)
          .eq('buyer_id', user.id)
          .order('created_at', { ascending: false });
        if (error) throw error;
        setPurchases(data || []);
      } catch (err) {
        console.error('Erro ao buscar compras:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPurchases();
    // Optionally poll for webhook completion for a short time
    const interval = setInterval(fetchPurchases, 4000);
    const timeout = setTimeout(() => clearInterval(interval), 30000);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [user, purchaseIds.join(',')]);

  const handleDownload = (url: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
  };

  return (
    <main className="container mx-auto px-4 py-8 space-y-6">
      <header className="flex items-center gap-3">
        {isApproved ? (
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        ) : (
          <ShoppingCart className="h-8 w-8" />
        )}
        <h1 className="text-3xl font-bold">
          {isApproved ? 'Compra concluída' : 'Finalizando seu pagamento'}
        </h1>
      </header>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Validando sua compra...
        </div>
      ) : purchases.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="mb-4">Não encontramos itens desta compra.</p>
            <Link to="/dashboard/purchases" className="underline">
              Ir para Minhas Compras
            </Link>
          </CardContent>
        </Card>
      ) : (
        <section className="space-y-4">
          <p className="text-muted-foreground">
            {isApproved
              ? 'Pagamento aprovado! Suas fotos já estão disponíveis para download e também em Minhas Compras.'
              : 'Recebemos seu pedido. Assim que o pagamento for confirmado, as fotos serão liberadas.'}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {purchases.map((purchase) => (
              <Card key={purchase.id} className="overflow-hidden">
                <div className="aspect-square relative bg-muted">
                  <LazyImage
                    src={purchase.photo?.thumbnail_url || purchase.photo?.watermarked_url || ''}
                    alt="Foto comprada"
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardContent className="p-4">
                  <p className="font-medium mb-1 line-clamp-1">
                    {purchase.photo?.campaign?.title || 'Foto'}
                  </p>
                  <p className="text-sm text-muted-foreground mb-3">
                    {new Date(purchase.created_at).toLocaleDateString('pt-BR')}
                  </p>
                  <Button
                    size="sm"
                    className="w-full"
                    disabled={!isApproved && purchase.status !== 'completed'}
                    onClick={() => purchase.photo?.original_url && handleDownload(purchase.photo.original_url, `foto-${purchase.photo.id}.jpg`)}
                  >
                    Baixar Original
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate('/dashboard/purchases')}>Ver Minhas Compras</Button>
            <Button onClick={() => navigate('/dashboard')}>Ir ao Dashboard</Button>
          </div>
        </section>
      )}
    </main>
  );
}
