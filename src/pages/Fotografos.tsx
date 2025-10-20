import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Camera, MapPin, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';

interface Photographer {
  id: string;
  full_name: string;
  avatar_url: string;
  email: string;
  _count?: {
    campaigns: number;
  };
  campaigns?: Array<{
    id: string;
    title: string;
    location: string;
    event_date: string;
    cover_image_url: string;
  }>;
}

const Fotografos = () => {
  const [photographers, setPhotographers] = useState<Photographer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPhotographers();
  }, []);

  const fetchPhotographers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          avatar_url,
          email,
          campaigns(id, title, location, event_date, cover_image_url, is_active)
        `)
        .eq('role', 'photographer');

      if (error) throw error;
      
      // Process data to add campaign counts and filter active campaigns
      const processedData = data?.map(photographer => ({
        ...photographer,
        campaigns: photographer.campaigns?.filter(c => c.is_active) || [],
        _count: {
          campaigns: photographer.campaigns?.filter(c => c.is_active)?.length || 0
        }
      })) || [];

      setPhotographers(processedData);
    } catch (error) {
      console.error('Erro ao buscar fotógrafos:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <section className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Nossos Fotógrafos</h1>
          <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
            Conheça os profissionais que capturam os melhores momentos dos eventos esportivos
          </p>
        </div>

        {/* Photographers Grid */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-muted animate-pulse rounded-full" />
                  <div>
                    <div className="h-5 bg-muted animate-pulse rounded mb-2 w-32" />
                    <div className="h-4 bg-muted animate-pulse rounded w-24" />
                  </div>
                </div>
                <div className="h-4 bg-muted animate-pulse rounded mb-4 w-full" />
                <div className="grid grid-cols-2 gap-2">
                  <div className="aspect-[4/5] bg-muted animate-pulse rounded" />
                  <div className="aspect-[4/5] bg-muted animate-pulse rounded" />
                </div>
              </Card>
            ))}
          </div>
        ) : photographers.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {photographers.map((photographer) => (
              <Card key={photographer.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  {/* Photographer Info */}
                  <div className="flex items-center gap-4 mb-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={photographer.avatar_url} alt={photographer.full_name} />
                      <AvatarFallback className="text-lg">
                        {photographer.full_name?.charAt(0)?.toUpperCase() || photographer.email?.charAt(0)?.toUpperCase() || 'F'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-xl font-semibold">{photographer.full_name || 'Fotógrafo'}</h3>
                      <Badge variant="outline" className="gap-1">
                        <Camera className="h-3 w-3" />
                        {photographer._count?.campaigns || 0} eventos
                      </Badge>
                    </div>
                  </div>

                  {/* Recent Campaigns */}
                  {photographer.campaigns && photographer.campaigns.length > 0 ? (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">Eventos Recentes:</h4>
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        {photographer.campaigns.slice(0, 2).map((campaign) => (
                          <div key={campaign.id} className="aspect-[4/5] bg-gradient-subtle rounded-lg overflow-hidden relative">
                            {campaign.cover_image_url ? (
                              <img
                                src={campaign.cover_image_url}
                                alt={campaign.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-muted">
                                <Camera className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                            <div className="absolute bottom-1 left-1 right-1">
                              <p className="text-white text-xs font-medium truncate">{campaign.title}</p>
                              <div className="flex items-center gap-1 text-white/80 text-xs">
                                <MapPin className="h-2 w-2" />
                                <span className="truncate">{campaign.location}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <Button className="w-full gap-2" size="sm">
                        Ver Todos os Eventos
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Camera className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-sm">Nenhum evento disponível</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Camera className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-medium mb-2">Nenhum fotógrafo disponível</h3>
            <p className="text-muted-foreground mb-4">
              Em breve teremos fotógrafos incríveis cadastrados!
            </p>
          </div>
        )}
      </section>
    </MainLayout>
  );
};

export default Fotografos;