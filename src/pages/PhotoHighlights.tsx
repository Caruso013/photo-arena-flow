import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Camera, Star, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import WatermarkedPhoto from '@/components/WatermarkedPhoto';
import AntiScreenshotProtection from '@/components/security/AntiScreenshotProtection';
import { logger } from '@/lib/logger';
import { handleError } from '@/lib/errorHandler';

interface Photo {
  id: string;
  title: string;
  watermarked_url: string;
  campaign_id: string;
  photographer_id: string;
  created_at: string;
  campaign: {
    id: string;
    title: string;
    location: string;
    event_date: string;
  };
  photographer: {
    full_name: string;
    avatar_url: string | null;
  };
  favorites_count: number;
}

const PhotoHighlights = () => {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHighlightPhotos();
  }, []);

  const fetchHighlightPhotos = async () => {
    try {
      // Buscar fotos mais recentes com favoritadas
      // Priorizar fotos com mais favoritos
      const { data, error } = await supabase
        .from('photos')
        .select(`
          id,
          title,
          watermarked_url,
          campaign_id,
          photographer_id,
          created_at,
          campaign:campaigns!inner (
            id,
            title,
            location,
            event_date
          ),
          photographer:profiles!photographer_id (
            full_name,
            avatar_url
          )
        `)
        .eq('is_available', true)
        .eq('campaigns.is_active', true)
        .order('created_at', { ascending: false })
        .limit(24);

      if (error) throw error;

      // Buscar contagem de favoritos para cada foto
      const photosWithFavorites = await Promise.all(
        (data || []).map(async (photo) => {
          const { count } = await supabase
            .from('favorites')
            .select('*', { count: 'exact', head: true })
            .eq('photo_id', photo.id);

          return {
            ...photo,
            favorites_count: count || 0,
          };
        })
      );

      // Ordenar por favoritos (mais favoritos primeiro) e depois por data
      const sortedPhotos = photosWithFavorites.sort((a, b) => {
        if (b.favorites_count !== a.favorites_count) {
          return b.favorites_count - a.favorites_count;
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setPhotos(sortedPhotos);
    } catch (error) {
      logger.error('Error fetching highlight photos:', error);
      handleError(error, {
        context: 'fetch',
        showToast: false,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <section className="py-8 sm:py-12 px-3 sm:px-4">
        <div className="container mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Star className="h-8 w-8 text-primary fill-primary" />
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
                Destaques dos Fotógrafos
              </h1>
            </div>
            <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
              As melhores fotos selecionadas pelos nossos fotógrafos profissionais
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="aspect-square bg-muted animate-pulse rounded-lg"
                />
              ))}
            </div>
          ) : photos.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {photos.map((photo, index) => (
                <Link
                  key={photo.id}
                  to={`/campaign/${photo.campaign_id}`}
                  className="group animate-fade-in"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <Card className="overflow-hidden cursor-pointer border-2 transition-all duration-300 hover:border-primary/40 hover:shadow-xl hover:-translate-y-1 active:scale-95">
                    <div className="relative aspect-square">
                      <AntiScreenshotProtection>
                        <WatermarkedPhoto
                          src={photo.watermarked_url}
                          alt={photo.title || 'Foto em destaque'}
                          imgClassName="w-full h-full object-cover"
                        />
                      </AntiScreenshotProtection>

                      {/* Overlay com informações */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                          <h3 className="text-white font-semibold text-sm line-clamp-1 mb-1">
                            {photo.campaign.title}
                          </h3>
                          <p className="text-white/80 text-xs line-clamp-1">
                            {photo.photographer.full_name}
                          </p>
                        </div>
                      </div>

                      {/* Badge de favoritos */}
                      {photo.favorites_count > 0 && (
                        <div className="absolute top-2 right-2">
                          <Badge
                            variant="secondary"
                            className="bg-black/60 text-white border-0 backdrop-blur-sm"
                          >
                            <Heart className="h-3 w-3 mr-1 fill-red-500 text-red-500" />
                            {photo.favorites_count}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 sm:py-20 px-4">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Camera className="h-10 sm:h-12 w-10 sm:w-12 text-primary" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold mb-3">
                Nenhuma foto em destaque ainda
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto">
                Os fotógrafos estão preparando suas melhores fotos para você. Volte em breve!
              </p>
            </div>
          )}
        </div>
      </section>
    </MainLayout>
  );
};

export default PhotoHighlights;
