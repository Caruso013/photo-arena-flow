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

  const externalRef = searchParams.get('ref') || searchParams.get('external_reference') || '';
  const purchaseIds = useMemo(() => externalRef ? externalRef.split(',') : [], [externalRef]);

  // Basic SEO
  useEffect(() => {
    document.title = 'Compra concluída | STA Fotos';
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', 'Compra de fotos concluída. Baixe suas fotos e confira em Minhas Compras.');
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
          .select(`*, photo:photos(id, watermarked_url, thumbnail_url, original_url, campaign:campaigns(title))`)
          .in('id', purchaseIds)
          .eq('buyer_id', user.id)
          .eq('status', 'completed')
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
  }, [user, purchaseIds.join(',')]);

  const handleDownload = (url: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
  };

  return (
    <main className="container mx-auto px-4 py-8 space-y-6">
      {/* Confirmação Visual com Animação */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900 mb-4 animate-bounce">
          <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
        </div>
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
          Pagamento Confirmado!
        </h1>
        <p className="text-lg text-muted-foreground">
          Sua compra foi processada com sucesso pelo Mercado Pago
        </p>
      </div>

      <div className="max-w-4xl mx-auto">
        <Card className="mb-6 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400 mt-1 flex-shrink-0" />
              <div className="space-y-2">
                <h3 className="font-semibold text-green-900 dark:text-green-100">
                  ✅ Compra Aprovada
                </h3>
                <p className="text-sm text-green-800 dark:text-green-200">
                  Pagamento confirmado via webhook do Mercado Pago. Suas fotos já estão disponíveis para download!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 text-muted-foreground py-8">
          <Loader2 className="h-5 w-5 animate-spin" />
          Carregando suas fotos...
        </div>
      ) : purchases.length === 0 ? (
        <Card className="max-w-2xl mx-auto">
          <CardContent className="py-10 text-center">
            <p className="mb-4 text-muted-foreground">
              Não encontramos itens desta compra. O webhook pode estar processando...
            </p>
            <Link to="/dashboard/my-purchases">
              <Button variant="outline">
                Ir para Minhas Compras
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <section className="space-y-6 max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Suas Fotos</h2>
            <Link to="/dashboard/my-purchases">
              <Button variant="outline" size="sm">
                Ver Todas as Compras
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {purchases.map((purchase) => (
              <Card key={purchase.id} className="overflow-hidden hover:shadow-xl transition-all duration-300 border-2 border-green-200 dark:border-green-800">
                <div className="relative">
                  <div className="absolute top-2 right-2 z-10">
                    <div className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shadow-lg">
                      <CheckCircle2 className="h-3 w-3" />
                      Confirmado
                    </div>
                  </div>
                  <div className="aspect-square relative bg-muted">
                    {/* ✅ FOTO COMPRADA: mostra original SEM marca d'água */}
                    <img
                      src={purchase.photo?.original_url || purchase.photo?.thumbnail_url || ''}
                      alt="Foto comprada - sem marca d'água"
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                </div>
                <CardContent className="p-4 space-y-2">
                  <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 p-2 rounded text-xs text-green-700 dark:text-green-300">
                    ✓ Foto original sem marca d'água
                  </div>
                  <p className="font-medium mb-1 line-clamp-1">
                    {purchase.photo?.campaign?.title || 'Foto'}
                  </p>
                  <p className="text-sm text-muted-foreground mb-3">
                    R$ {purchase.amount} • {new Date(purchase.created_at).toLocaleDateString('pt-BR')}
                  </p>
                  <Button
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => purchase.photo?.original_url && handleDownload(purchase.photo.original_url, `foto-${purchase.photo.id}.jpg`)}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Baixar Alta Resolução
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
