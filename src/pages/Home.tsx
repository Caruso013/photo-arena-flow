import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Camera, Search, MapPin, Calendar, ArrowRight, Zap, Shield, Users, Trophy, Star, TrendingUp, Sparkles } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';

interface FeaturedCampaign {
  id: string;
  title: string;
  description: string;
  event_date: string;
  location: string;
  cover_image_url: string;
  photo_count: number;
  photographer_name: string;
}

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [featuredCampaigns, setFeaturedCampaigns] = useState<FeaturedCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ events: 0, photos: 0, photographers: 0 });

  useEffect(() => {
    fetchData();
    
    // Intersection Observer para animações
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-fade-in-up');
          }
        });
      },
      { threshold: 0.1 }
    );

    const elements = document.querySelectorAll('.scroll-animate');
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  const fetchData = async () => {
    try {
      // Buscar estatísticas
      const [eventsCount, photosCount, photographersCount] = await Promise.all([
        supabase.from('campaigns').select('id', { count: 'exact', head: true }),
        supabase.from('photos').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'photographer')
      ]);

      setStats({
        events: eventsCount.count || 0,
        photos: photosCount.count || 0,
        photographers: photographersCount.count || 0
      });

      // Buscar campanhas ativas (prioriza featured, depois as mais recentes)
      const { data: campaignsData, error } = await supabase
        .from('campaigns')
        .select('id, title, description, event_date, location, cover_image_url, photographer_id, is_featured')
        .eq('is_active', true)
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(6);

      if (error) throw error;

      if (campaignsData && campaignsData.length > 0) {
        // Buscar dados adicionais para cada campanha
        const campaignsWithDetails = await Promise.all(
          campaignsData.map(async (campaign) => {
            // Buscar contagem de fotos
            const { count: photoCount } = await supabase
              .from('photos')
              .select('id', { count: 'exact', head: true })
              .eq('campaign_id', campaign.id)
              .eq('is_available', true);

            // Buscar nome do fotógrafo (somente se photographer_id existir)
            let photographerData = null;
            if (campaign.photographer_id) {
              const { data } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', campaign.photographer_id)
                .maybeSingle();
              photographerData = data;
            }

            // Fallback para capa se não tiver - usar watermarked_url
            let coverUrl = campaign.cover_image_url;
            if (!coverUrl) {
              const { data: firstPhoto } = await supabase
                .from('photos')
                .select('watermarked_url')
                .eq('campaign_id', campaign.id)
                .eq('is_available', true)
                .not('watermarked_url', 'is', null)
                .order('upload_sequence', { ascending: true })
                .limit(1)
                .maybeSingle();
              
              coverUrl = firstPhoto?.watermarked_url || '';
            }

            return {
              ...campaign,
              cover_image_url: coverUrl,
              photo_count: photoCount || 0,
              photographer_name: photographerData?.full_name || 'STA Fotos'
            };
          })
        );

        setFeaturedCampaigns(campaignsWithDetails);
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 md:py-28">
        {/* Background com gradiente animado */}
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-background to-yellow-600/5"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-yellow-500/20 via-transparent to-transparent"></div>
        
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center scroll-animate">
            <div className="inline-block mb-6 px-5 py-2.5 bg-yellow-500/10 border border-yellow-500/30 rounded-full backdrop-blur-sm">
              <span className="text-yellow-600 dark:text-yellow-400 font-semibold text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Plataforma de Fotos Esportivas
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight text-foreground">
              Encontre suas <span className="text-yellow-500">fotos</span> em segundos
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed max-w-2xl mx-auto">
              Acesse eventos esportivos e encontre todas as suas fotos de forma rápida e fácil
            </p>
            
            {/* CTAs Principais */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
              {/* Botão de Reconhecimento Facial - TEMPORARIAMENTE DESATIVADO */}
              <Button 
                size="lg" 
                className="gap-3 text-lg px-8 py-6 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 shadow-lg shadow-yellow-500/30 hover:shadow-xl hover:shadow-yellow-500/50 transition-all duration-300 hover:scale-105 w-full sm:w-auto"
                onClick={() => navigate('/events')}
              >
                <Calendar className="h-6 w-6" />
                Encontrar Minhas Fotos
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="gap-2 text-lg px-8 py-6 border-2 border-border hover:border-primary hover:bg-primary/5 transition-all duration-300 w-full sm:w-auto"
                onClick={() => navigate('/events')}
              >
                <Calendar className="h-5 w-5" />
                Ver Todos os Eventos
              </Button>
            </div>
            
            {/* Texto explicativo adicional */}
            <p className="text-sm text-muted-foreground">
              Mais de {stats.photos.toLocaleString()} fotos disponíveis em {stats.events} eventos
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto scroll-animate">
            <Card className="text-center border-primary/20 hover:border-primary/40 transition-all">
              <CardContent className="pt-8 pb-6">
                <Trophy className="h-12 w-12 text-primary mx-auto mb-4" />
                <div className="text-4xl font-bold mb-2 text-foreground">{stats.events}+</div>
                <div className="text-muted-foreground font-medium">Eventos Realizados</div>
              </CardContent>
            </Card>
            <Card className="text-center border-primary/20 hover:border-primary/40 transition-all">
              <CardContent className="pt-8 pb-6">
                <Camera className="h-12 w-12 text-primary mx-auto mb-4" />
                <div className="text-4xl font-bold mb-2 text-foreground">{stats.photos.toLocaleString()}+</div>
                <div className="text-muted-foreground font-medium">Fotos Disponíveis</div>
              </CardContent>
            </Card>
            <Card className="text-center border-primary/20 hover:border-primary/40 transition-all">
              <CardContent className="pt-8 pb-6">
                <Users className="h-12 w-12 text-primary mx-auto mb-4" />
                <div className="text-4xl font-bold mb-2 text-foreground">{stats.photographers}+</div>
                <div className="text-muted-foreground font-medium">Fotógrafos</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Featured Events */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 scroll-animate">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">Eventos em Destaque</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Confira os últimos eventos e encontre suas fotos
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <div className="aspect-video bg-muted animate-pulse"></div>
                  <CardContent className="p-6 space-y-3">
                    <div className="h-6 bg-muted rounded animate-pulse"></div>
                    <div className="h-4 bg-muted rounded w-2/3 animate-pulse"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : featuredCampaigns.length === 0 ? (
            <Card className="p-12 text-center">
              <Camera className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Nenhum evento disponível</h3>
              <p className="text-muted-foreground">Novos eventos serão adicionados em breve!</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredCampaigns.map((campaign) => (
                <Card 
                  key={campaign.id} 
                  className="overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group"
                  onClick={() => navigate(`/campaign/${campaign.id}`)}
                >
                  <div className="aspect-video relative overflow-hidden bg-muted">
                    {campaign.cover_image_url ? (
                      <img
                        src={campaign.cover_image_url}
                        alt={campaign.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const parent = e.currentTarget.parentElement;
                          if (parent) {
                            parent.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5"><svg class="h-16 w-16 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg></div>';
                          }
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                        <Camera className="h-16 w-16 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-background/90 backdrop-blur-sm">
                        <Camera className="h-3 w-3 mr-1" />
                        {campaign.photo_count}
                      </Badge>
                    </div>
                  </div>
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold mb-2 text-foreground group-hover:text-primary transition-colors line-clamp-1">
                      {campaign.title}
                    </h3>
                    {campaign.description && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {campaign.description}
                      </p>
                    )}
                    <div className="space-y-2 text-sm">
                      {campaign.event_date && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {new Date(campaign.event_date).toLocaleDateString('pt-BR')}
                        </div>
                      )}
                      {campaign.location && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          {campaign.location}
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Camera className="h-4 w-4" />
                        {campaign.photographer_name}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="text-center mt-12">
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => navigate('/events')}
              className="gap-2"
            >
              Ver Todos os Eventos
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">Por que escolher a STA?</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Tecnologia de ponta para eternizar seus momentos
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="text-center p-8 hover:shadow-lg transition-all">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-foreground">Busca Rápida</h3>
              <p className="text-muted-foreground">
                Encontre suas fotos por evento, data ou número de peito de forma rápida e fácil
              </p>
            </Card>

            <Card className="text-center p-8 hover:shadow-lg transition-all">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-foreground">Pagamento Seguro</h3>
              <p className="text-muted-foreground">
                Transações protegidas e processamento rápido para sua tranquilidade
              </p>
            </Card>

            <Card className="text-center p-8 hover:shadow-lg transition-all">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-foreground">Alta Qualidade</h3>
              <p className="text-muted-foreground">
                Fotos profissionais em alta resolução para guardar para sempre
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <Card className="overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-white border-0">
            <CardContent className="p-12 md:p-16 text-center">
              <Star className="h-16 w-16 mx-auto mb-6 opacity-90" />
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Pronto para encontrar suas fotos?
              </h2>
              <p className="text-xl mb-8 opacity-95 max-w-2xl mx-auto">
                Acesse agora e reviva os melhores momentos dos seus eventos esportivos
              </p>
              <Button 
                size="lg" 
                variant="secondary"
                className="gap-2 text-lg px-8 py-6 shadow-xl hover:shadow-2xl transition-all"
                onClick={() => navigate('/events')}
              >
                <Search className="h-5 w-5" />
                Começar Agora
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </MainLayout>
  );
};

export default Home;
