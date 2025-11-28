import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Image } from 'lucide-react';
import { SkeletonCard } from '@/components/ui/skeleton-card';
import { LazyImage } from '@/components/ui/lazy-image';

interface Photo {
  id: string;
  title: string;
  watermarked_url: string;
  thumbnail_url: string;
  price: number;
  campaign: {
    title: string;
  };
}

const MyPhotos = () => {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchMyPhotos();
    } else {
      setLoading(false);
    }
  }, [user?.id]);

  const fetchMyPhotos = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('photos')
        .select(`
          id,
          title,
          watermarked_url,
          thumbnail_url,
          price,
          campaign:campaigns(title)
        `)
        .eq('photographer_id', user.id)
        .order('upload_sequence', { ascending: true })
        .order('created_at', { ascending: true })
        .limit(20); // Reduzido de 50 para 20 para economizar Cached Egress

      if (error) throw error;
      
      console.log('MyPhotos: fetched', data?.length || 0, 'photos');
      setPhotos(data || []);
    } catch (error) {
      console.error('Error fetching photos:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Minhas Fotos</h1>
        <p className="text-muted-foreground">
          {photos.length} foto(s) no total
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <Card className="py-12 text-center">
          <Image className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-medium mb-2">Nenhuma foto enviada</h3>
          <p className="text-muted-foreground">
            Faça upload de fotos nos seus eventos
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo) => (
            <Card key={photo.id} className="overflow-hidden group cursor-pointer hover:shadow-lg transition-shadow">
              <div className="aspect-square relative bg-muted">
                <LazyImage
                  src={photo.thumbnail_url || photo.watermarked_url}
                  alt={photo.title || 'Foto'}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="text-white text-center p-2">
                    <p className="text-sm font-medium line-clamp-1">
                      {photo.campaign?.title}
                    </p>
                    <p className="text-xs">R$ {photo.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyPhotos;
