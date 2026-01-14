import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Camera, MapPin, ArrowRight, MessageCircle, Images, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';

interface Photographer {
  id: string;
  full_name: string;
  avatar_url: string;
  email: string;
  _count?: {
    campaigns: number;
    photos: number;
  };
  campaigns?: Array<{
    id: string;
    title: string;
    location: string;
    event_date: string;
    cover_image_url: string;
  }>;
}

const STA_WHATSAPP = '5511999999999'; // Substituir pelo número real da STA

const Fotografos = () => {
  const [photographers, setPhotographers] = useState<Photographer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPhotographers();
  }, []);

  const fetchPhotographers = async () => {
    try {
      // Buscar fotógrafos com suas campanhas
      const { data: photographersData, error: photographersError } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          avatar_url,
          email
        `)
        .eq('role', 'photographer');

      if (photographersError) throw photographersError;
      
      // Para cada fotógrafo, buscar suas campanhas e fotos
      const processedData = await Promise.all(
        (photographersData || []).map(async (photographer) => {
          // Buscar campanhas do fotógrafo
          const { data: campaigns } = await supabase
            .from('campaigns')
            .select('id, title, location, event_date, cover_image_url, is_active')
            .eq('photographer_id', photographer.id)
            .eq('is_active', true)
            .order('event_date', { ascending: false })
            .limit(4);

          // Buscar contagem de fotos do fotógrafo
          const { count: photoCount } = await supabase
            .from('photos')
            .select('*', { count: 'exact', head: true })
            .eq('photographer_id', photographer.id)
            .eq('is_available', true);

          return {
            ...photographer,
            campaigns: campaigns || [],
            _count: {
              campaigns: campaigns?.length || 0,
              photos: photoCount || 0
            }
          };
        })
      );

      // Filtrar apenas fotógrafos com pelo menos uma campanha ativa
      const activePhotographers = processedData.filter(p => p._count.campaigns > 0);
      
      setPhotographers(activePhotographers);
    } catch (error) {
      console.error('Erro ao buscar fotógrafos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleContactPhotographer = (photographer: Photographer) => {
    const message = encodeURIComponent(
      `Olá! Gostaria de contratar o(a) fotógrafo(a) ${photographer.full_name || 'disponível'} para um serviço. Podem me passar mais informações?`
    );
    window.open(`https://wa.me/${STA_WHATSAPP}?text=${message}`, '_blank');
  };

  return (
    <MainLayout>
      <section className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="text-center mb-8">
          <Badge variant="secondary" className="mb-4">
            <Camera className="h-3 w-3 mr-1" />
            Equipe Profissional
          </Badge>
          <h1 className="text-4xl font-bold mb-4">Nossos Fotógrafos</h1>
          <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
            Conheça os profissionais que capturam os melhores momentos dos eventos esportivos. 
            Entre em contato com a STA para contratar um fotógrafo específico.
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
                    <Avatar className="h-16 w-16 border-2 border-primary/20">
                      <AvatarImage src={photographer.avatar_url} alt={photographer.full_name} />
                      <AvatarFallback className="text-lg bg-primary/10 text-primary">
                        {photographer.full_name?.charAt(0)?.toUpperCase() || photographer.email?.charAt(0)?.toUpperCase() || 'F'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold">{photographer.full_name || 'Fotógrafo'}</h3>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <Badge variant="outline" className="gap-1 text-xs">
                          <Camera className="h-3 w-3" />
                          {photographer._count?.campaigns || 0} eventos
                        </Badge>
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <Images className="h-3 w-3" />
                          {photographer._count?.photos || 0} fotos
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Portfolio Preview - Recent Campaigns */}
                  {photographer.campaigns && photographer.campaigns.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                        <Star className="h-3 w-3" />
                        Portfólio - Eventos Recentes:
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {photographer.campaigns.slice(0, 4).map((campaign) => (
                          <Link 
                            key={campaign.id} 
                            to={`/evento/${campaign.id}`}
                            className="aspect-[4/5] bg-gradient-subtle rounded-lg overflow-hidden relative group"
                          >
                            {campaign.cover_image_url ? (
                              <img
                                src={campaign.cover_image_url}
                                alt={campaign.title}
                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-muted">
                                <Camera className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                            <div className="absolute bottom-1 left-1 right-1">
                              <p className="text-white text-xs font-medium truncate">{campaign.title}</p>
                              {campaign.location && (
                                <div className="flex items-center gap-1 text-white/80 text-xs">
                                  <MapPin className="h-2 w-2" />
                                  <span className="truncate">{campaign.location}</span>
                                </div>
                              )}
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="space-y-2">
                    <Link to={`/events?photographer=${photographer.id}`}>
                      <Button variant="outline" className="w-full gap-2 min-h-[44px]" size="sm">
                        Ver Todos os Eventos
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                    <Button 
                      className="w-full gap-2 min-h-[44px]" 
                      size="sm"
                      onClick={() => handleContactPhotographer(photographer)}
                    >
                      <MessageCircle className="h-4 w-4" />
                      Contratar via STA
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Camera className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-medium mb-2">Nenhum fotógrafo disponível no momento</h3>
            <p className="text-muted-foreground mb-6">
              Em breve teremos fotógrafos incríveis cadastrados!
            </p>
            <Link to="/servicos">
              <Button className="gap-2">
                Ver Nossos Serviços
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        )}

        {/* CTA Section */}
        {photographers.length > 0 && (
          <Card className="mt-12 bg-primary/5 border-primary/20">
            <CardContent className="p-8 text-center">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h2 className="text-2xl font-bold mb-2">
                Quer contratar um fotógrafo?
              </h2>
              <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
                Entre em contato com a STA Fotos para contratar o fotógrafo ideal para seu evento. 
                Oferecemos serviços personalizados para atletas e organizadores.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/servicos">
                  <Button size="lg" variant="outline" className="gap-2">
                    <Camera className="h-5 w-5" />
                    Ver Serviços
                  </Button>
                </Link>
                <Button 
                  size="lg" 
                  className="gap-2"
                  onClick={() => {
                    const message = encodeURIComponent(
                      `Olá! Gostaria de contratar um fotógrafo para meu evento. Podem me ajudar?`
                    );
                    window.open(`https://wa.me/${STA_WHATSAPP}?text=${message}`, '_blank');
                  }}
                >
                  <MessageCircle className="h-5 w-5" />
                  Fale Conosco
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </section>
    </MainLayout>
  );
};

export default Fotografos;
