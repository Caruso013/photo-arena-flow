import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { ShoppingCart } from 'lucide-react';
import { SkeletonCard } from '@/components/ui/skeleton-card';
import { LazyImage } from '@/components/ui/lazy-image';
import { Button } from '@/components/ui/button';

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
    campaign: {
      title: string;
    };
  };
}

const MyPurchases = () => {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyPurchases();
  }, [user]);

  const fetchMyPurchases = async () => {
    try {
      const { data, error } = await supabase
        .from('purchases')
        .select(`
          *,
          photo:photos(
            id,
            watermarked_url,
            thumbnail_url,
            original_url,
            campaign:campaigns(title)
          )
        `)
        .eq('buyer_id', user?.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPurchases(data || []);
    } catch (error) {
      console.error('Error fetching purchases:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (url: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
  };

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
          {purchases.map((purchase) => (
            <Card key={purchase.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-square relative bg-muted">
                <LazyImage
                  src={purchase.photo.thumbnail_url || purchase.photo.watermarked_url}
                  alt="Foto comprada"
                  className="w-full h-full object-cover"
                />
              </div>
              <CardContent className="p-4">
                <p className="font-medium mb-1 line-clamp-1">
                  {purchase.photo.campaign?.title}
                </p>
                <p className="text-sm text-muted-foreground mb-3">
                  R$ {purchase.amount} • {new Date(purchase.created_at).toLocaleDateString('pt-BR')}
                </p>
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => handleDownload(purchase.photo.original_url, `foto-${purchase.photo.id}.jpg`)}
                >
                  Baixar Original
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyPurchases;
