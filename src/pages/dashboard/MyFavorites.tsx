import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFavorites } from '@/hooks/useFavorites';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Heart, ShoppingCart, Eye, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { useCart } from '@/contexts/CartContext';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import WatermarkedPhoto from '@/components/WatermarkedPhoto';

interface FavoritePhoto {
  id: string;
  photo_id: string;
  created_at: string;
  photos: {
    id: string;
    title: string | null;
    price: number;
    watermarked_url: string;
    thumbnail_url: string | null;
    is_available: boolean;
    campaigns: {
      title: string;
      id: string;
      progressive_discount_enabled?: boolean;
    } | null;
  } | null;
}

const MyFavorites = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toggleFavorite, isFavorited } = useFavorites();
  const { addToCart } = useCart();
  const [favorites, setFavorites] = useState<FavoritePhoto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFavorites();
  }, [user]);

  const fetchFavorites = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('favorites')
        .select(`
          id,
          photo_id,
          created_at,
          photos (
            id,
            title,
            price,
            watermarked_url,
            thumbnail_url,
            is_available,
            campaigns (
              id,
              title,
              progressive_discount_enabled
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setFavorites((data as any) || []);
    } catch (error) {
      console.error('Error fetching favorites:', error);
      toast.error('Erro ao carregar favoritos');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (photoId: string) => {
    await toggleFavorite(photoId);
    setFavorites(prev => prev.filter(f => f.photo_id !== photoId));
  };

  const handleAddToCart = (photo: FavoritePhoto['photos']) => {
    if (!photo) return;
    
    addToCart({
      id: photo.id,
      title: photo.title,
      price: photo.price,
      watermarked_url: photo.watermarked_url,
      thumbnail_url: photo.thumbnail_url,
      campaign_id: photo.campaigns?.id || '',
      progressive_discount_enabled: photo.campaigns?.progressive_discount_enabled || false,
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i}>
              <Skeleton className="aspect-square" />
              <CardContent className="p-4">
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 md:pb-0">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
          <Heart className="h-6 w-6 sm:h-8 sm:w-8 text-destructive fill-destructive" />
          <span>Meus Favoritos</span>
        </h1>
        <p className="text-muted-foreground mt-2 text-sm sm:text-base">
          {favorites.length === 0 
            ? 'Você ainda não tem fotos favoritas' 
            : `${favorites.length} foto${favorites.length > 1 ? 's' : ''} favoritada${favorites.length > 1 ? 's' : ''}`
          }
        </p>
      </div>

      {favorites.length === 0 ? (
        <Card className="p-8 sm:p-12 text-center">
          <Heart className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg sm:text-xl font-semibold mb-2">Nenhum favorito ainda</h3>
          <p className="text-muted-foreground mb-4 text-sm sm:text-base">
            Comece a favoritar suas fotos preferidas para encontrá-las facilmente aqui
          </p>
          <Button onClick={() => navigate('/events')} size="lg" className="w-full sm:w-auto">
            Explorar Eventos
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
          {favorites.map((favorite) => {
            const photo = favorite.photos;
            if (!photo) return null;

            return (
              <Card key={favorite.id} className="group overflow-hidden hover:shadow-xl transition-all duration-300">
                <div className="relative aspect-square overflow-hidden bg-muted">
                  <Dialog>
                    <DialogTrigger asChild>
                      <button className="w-full h-full relative group/preview active:scale-95 transition-transform">
                        <WatermarkedPhoto
                          src={photo.watermarked_url}
                          alt={photo.title || 'Foto'}
                          imgClassName="w-full h-full object-cover transition-transform duration-300 group-hover/preview:scale-110"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/preview:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none">
                          <Eye className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                        </div>
                      </button>
                    </DialogTrigger>
                    <DialogContent className="max-w-[95vw] sm:max-w-4xl w-[90vw] max-h-[90vh] overflow-auto">
                      <WatermarkedPhoto src={photo.watermarked_url} alt={photo.title || 'Foto'} />
                    </DialogContent>
                  </Dialog>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm hover:bg-destructive hover:text-destructive-foreground w-9 h-9 sm:w-10 sm:h-10"
                    onClick={() => handleRemoveFavorite(photo.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <CardContent className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                  <div>
                    <h3 className="font-semibold line-clamp-1 text-sm sm:text-base">
                      {photo.title || 'Sem título'}
                    </h3>
                    {photo.campaigns && (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {photo.campaigns.title}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-base sm:text-lg font-bold text-primary flex-shrink-0">
                      {formatCurrency(photo.price)}
                    </span>
                    {photo.is_available && (
                      <Button
                        size="sm"
                        onClick={() => handleAddToCart(photo)}
                        className="gap-1 sm:gap-2 h-8 sm:h-9 text-xs sm:text-sm"
                      >
                        <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline">Carrinho</span>
                      </Button>
                    )}
                  </div>

                  {!photo.is_available && (
                    <div className="text-xs text-muted-foreground text-center py-1 bg-muted rounded">
                      Indisponível
                    </div>
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

export default MyFavorites;
