import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFavorites } from '@/hooks/useFavorites';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Heart, ShoppingCart, Eye, Trash2, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { useCart } from '@/contexts/CartContext';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import WatermarkedPhoto from '@/components/WatermarkedPhoto';
import AntiScreenshotProtection from '@/components/security/AntiScreenshotProtection';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

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
  const haptic = useHapticFeedback();
  const { toggleFavorite } = useFavorites();
  const { addToCart } = useCart();
  const [favorites, setFavorites] = useState<FavoritePhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingIndex, setViewingIndex] = useState<number | null>(null);

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
    haptic.light();
    await toggleFavorite(photoId);
    setFavorites(prev => prev.filter(f => f.photo_id !== photoId));
  };

  const handleAddToCart = (photo: FavoritePhoto['photos']) => {
    if (!photo) return;
    haptic.medium();
    
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

  // Navegar entre fotos com swipe
  const handlePrevPhoto = () => {
    haptic.light();
    if (viewingIndex !== null && viewingIndex > 0) {
      setViewingIndex(viewingIndex - 1);
    }
  };

  const handleNextPhoto = () => {
    haptic.light();
    if (viewingIndex !== null && viewingIndex < favorites.length - 1) {
      setViewingIndex(viewingIndex + 1);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (viewingIndex === null) return;
      if (e.key === 'ArrowLeft') handlePrevPhoto();
      if (e.key === 'ArrowRight') handleNextPhoto();
      if (e.key === 'Escape') setViewingIndex(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewingIndex, favorites.length]);

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i}>
              <Skeleton className="aspect-square" />
              <div className="p-3 sm:p-4">
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const currentViewingPhoto = viewingIndex !== null ? favorites[viewingIndex]?.photos : null;

  return (
    <div className="space-y-4 sm:space-y-6 pb-24 md:pb-0">
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
          <Button onClick={() => navigate('/events')} size="lg" className="w-full sm:w-auto min-h-[48px]">
            Explorar Eventos
          </Button>
        </Card>
      ) : (
        <AntiScreenshotProtection>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
            {favorites.map((favorite, index) => {
              const photo = favorite.photos;
              if (!photo) return null;

              return (
                <Card key={favorite.id} className="group overflow-hidden hover:shadow-xl transition-all duration-300">
                  <div className="relative aspect-square overflow-hidden bg-muted">
                    <button 
                      className="w-full h-full relative group/preview active:scale-95 transition-transform"
                      onClick={() => {
                        haptic.light();
                        setViewingIndex(index);
                      }}
                    >
                      <WatermarkedPhoto
                        src={photo.watermarked_url}
                        alt={photo.title || 'Foto'}
                        imgClassName="w-full h-full object-cover transition-transform duration-300 group-hover/preview:scale-110"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/preview:opacity-100 sm:opacity-0 transition-opacity duration-300 flex items-center justify-center pointer-events-none">
                        <Eye className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                      </div>
                    </button>

                    {/* Botão remover */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm hover:bg-destructive hover:text-destructive-foreground w-9 h-9 sm:w-10 sm:h-10 shadow-lg active:scale-95 transition-transform z-10"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFavorite(photo.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>

                    {/* Botão ver - sempre visível no mobile */}
                    <Button
                      variant="secondary"
                      size="sm"
                      className="absolute bottom-2 left-1/2 -translate-x-1/2 gap-1 h-8 sm:h-9 text-xs sm:text-sm z-10 shadow-lg sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                      onClick={() => {
                        haptic.light();
                        setViewingIndex(index);
                      }}
                    >
                      <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                      Ver
                    </Button>
                  </div>

                  <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
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
                          className="gap-1 sm:gap-2 h-9 sm:h-10 text-xs sm:text-sm min-w-[80px]"
                        >
                          <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span className="hidden xs:inline">Carrinho</span>
                        </Button>
                      )}
                    </div>

                    {!photo.is_available && (
                      <div className="text-xs text-muted-foreground text-center py-2 bg-muted rounded">
                        Indisponível
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </AntiScreenshotProtection>
      )}

      {/* Modal de visualização com navegação */}
      <Dialog open={viewingIndex !== null} onOpenChange={(open) => !open && setViewingIndex(null)}>
        <DialogContent className="max-w-[98vw] sm:max-w-5xl w-[98vw] p-0 gap-0 bg-black/95">
          {currentViewingPhoto && (
            <div className="relative flex flex-col h-[90vh] sm:h-auto">
              {/* Header com fechar */}
              <div className="flex items-center justify-between p-3 sm:p-4 bg-black/50 text-white">
                <span className="text-sm sm:text-base font-medium truncate flex-1">
                  {currentViewingPhoto.title || 'Foto'} ({viewingIndex! + 1}/{favorites.length})
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20 h-9 w-9"
                  onClick={() => setViewingIndex(null)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Área da foto com navegação */}
              <div className="flex-1 relative flex items-center justify-center min-h-0 p-2 sm:p-4">
                {/* Botão anterior */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 z-30 h-12 w-12 sm:h-14 sm:w-14 bg-black/50 hover:bg-black/70 text-white rounded-full shadow-lg"
                  onClick={handlePrevPhoto}
                  disabled={viewingIndex === 0}
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>

                {/* Foto */}
                <div className="max-w-full max-h-full overflow-hidden">
                  <WatermarkedPhoto
                    src={currentViewingPhoto.watermarked_url}
                    alt={currentViewingPhoto.title || 'Foto'}
                    imgClassName="max-h-[70vh] sm:max-h-[75vh] w-auto object-contain mx-auto"
                  />
                </div>

                {/* Botão próximo */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 z-30 h-12 w-12 sm:h-14 sm:w-14 bg-black/50 hover:bg-black/70 text-white rounded-full shadow-lg"
                  onClick={handleNextPhoto}
                  disabled={viewingIndex === favorites.length - 1}
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>
              </div>

              {/* Footer com ações */}
              <div className="p-3 sm:p-4 bg-black/50 flex items-center justify-between gap-3">
                <span className="text-lg sm:text-xl font-bold text-white">
                  {formatCurrency(currentViewingPhoto.price)}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 sm:h-11 px-4 gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20"
                    onClick={() => {
                      handleRemoveFavorite(currentViewingPhoto.id);
                      if (favorites.length <= 1) {
                        setViewingIndex(null);
                      } else if (viewingIndex! >= favorites.length - 1) {
                        setViewingIndex(viewingIndex! - 1);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Remover</span>
                  </Button>
                  {currentViewingPhoto.is_available && (
                    <Button
                      size="sm"
                      className="h-10 sm:h-11 px-4 sm:px-6 gap-2"
                      onClick={() => handleAddToCart(currentViewingPhoto)}
                    >
                      <ShoppingCart className="h-4 w-4" />
                      Adicionar
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyFavorites;
