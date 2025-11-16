import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { ShoppingCart } from 'lucide-react';
import { SkeletonCard } from '@/components/ui/skeleton-card';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';

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
    title?: string;
    campaign: {
      title: string;
    };
  };
}

const MyPurchases = () => {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchMyPurchases();
  }, [user]);

  const fetchMyPurchases = async () => {
    try {
      const { data, error } = await supabase
        .from('purchases')
        .select(`
          *,
          photo:photos!inner(
            id,
            watermarked_url,
            thumbnail_url,
            original_url,
            title,
            campaign:campaigns!inner(title)
          )
        `)
        .eq('buyer_id', user?.id)
        .eq('status', 'completed') // Apenas compras confirmadas pelo webhook do Mercado Pago
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching purchases:', error);
        throw error;
      }
      
      setPurchases(data || []);
    } catch (error) {
      console.error('Error fetching purchases:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSignedDisplayUrl = async (url: string) => {
    try {
      if (!url) return '';
      
      // Se já é uma URL assinada ou pública, retorna diretamente
      if (url.includes('token=') || !url.includes('/storage/v1/object/')) {
        return url;
      }
      
      const marker = '/storage/v1/object/';
      const idx = url.indexOf(marker);
      if (idx === -1) return url;
      
      let rest = url.slice(idx + marker.length);
      if (rest.startsWith('public/')) rest = rest.replace('public/', '');
      
      const firstSlash = rest.indexOf('/');
      if (firstSlash === -1) return url;
      
      const bucket = rest.slice(0, firstSlash);
      const path = rest.slice(firstSlash + 1);
      
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 3600); // 1 hora de validade
      
      if (error) {
        console.error('Erro ao criar URL assinada:', error);
        return url;
      }
      
      return data?.signedUrl || url;
    } catch (error) {
      console.error('Erro no getSignedDisplayUrl:', error);
      return url;
    }
  };

  const handleDownload = async (url: string, fileName: string) => {
    try {
      if (!url) {
        toast({
          title: "Erro",
          description: "URL da foto não encontrada",
          variant: "destructive",
        });
        return;
      }

      // Extrair o caminho do bucket
      const urlParts = url.split('/storage/v1/object/public/');
      let filePath = '';
      
      if (urlParts.length > 1) {
        const pathParts = urlParts[1].split('/');
        filePath = pathParts.slice(1).join('/');
      } else {
        filePath = url.split('photos-original/')[1] || url;
      }

      console.log('Baixando foto:', { filePath, originalUrl: url });

      // Gerar URL assinada de curta duração (60 segundos)
      const { data: signedData, error: signedError } = await supabase
        .storage
        .from('photos-original')
        .createSignedUrl(filePath, 60);

      if (signedError) {
        console.error('Erro ao gerar URL assinada:', signedError);
        throw signedError;
      }

      const link = document.createElement('a');
      link.href = signedData.signedUrl;
      link.download = fileName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Download iniciado",
        description: "Sua foto está sendo baixada",
      });
    } catch (error) {
      console.error('Erro ao baixar foto:', error);
      toast({
        title: "Erro ao baixar",
        description: "Não foi possível baixar a foto. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const buildSigned = async () => {
      try {
        const entries = await Promise.all(
          purchases.map(async (purchase) => {
            const imageUrl = purchase.photo?.thumbnail_url || purchase.photo?.watermarked_url || purchase.photo?.original_url || '';
            if (!imageUrl) return [purchase.id, ''] as const;
            const finalUrl = await getSignedDisplayUrl(imageUrl);
            return [purchase.id, finalUrl] as const;
          })
        );
        const map: Record<string, string> = {};
        entries.forEach(([id, url]) => { if (url) map[id] = url; });
        setSignedUrls(map);
      } catch (e) {
        console.warn('Falha ao assinar URLs de imagens:', e);
      }
    };
    if (purchases.length) buildSigned();
  }, [purchases]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Minhas Compras</h1>
        <p className="text-muted-foreground">
          {purchases.length} compra(s) realizada(s)
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : purchases.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ShoppingCart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-medium mb-2">Nenhuma compra realizada</h3>
            <p className="text-muted-foreground">
              Explore os eventos e adquira suas fotos
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {purchases.map((purchase) => {
            const imageUrl = purchase.photo?.thumbnail_url || purchase.photo?.watermarked_url || purchase.photo?.original_url;
            const displayUrl = signedUrls[purchase.id] || imageUrl;
            console.log('Purchase photo data:', {
              id: purchase.id,
              hasPhoto: !!purchase.photo,
              imageUrl: displayUrl,
              thumbnail: purchase.photo?.thumbnail_url,
              watermarked: purchase.photo?.watermarked_url
            });
            
            return (
              <Card key={purchase.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-square relative bg-muted">
                  {displayUrl ? (
                    <img
                      src={displayUrl}
                      alt={purchase.photo?.title || "Foto comprada"}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.error('Image load error:', displayUrl);
                        e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ESem imagem%3C/text%3E%3C/svg%3E';
                      }}
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-sm">Imagem não disponível</p>
                      </div>
                    </div>
                  )}
                </div>
                <CardContent className="p-4 space-y-3">
                  <div>
                    <p className="font-medium mb-1 line-clamp-1">
                      {purchase.photo?.campaign?.title || 'Evento'}
                    </p>
                    {purchase.photo?.title && (
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {purchase.photo.title}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground mt-1">
                      R$ {purchase.amount.toFixed(2)} • {new Date(purchase.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  
                  {purchase.status === 'completed' ? (
                    <Button
                      size="sm"
                      className="w-full gap-2"
                      onClick={() => handleDownload(purchase.photo.original_url, `foto-${purchase.photo.id}.jpg`)}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Baixar Foto Original
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="w-full"
                      disabled
                    >
                      <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Aguardando confirmação
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyPurchases;
