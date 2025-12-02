import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, MapPin, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { logger } from '@/lib/logger';
import { handleError } from '@/lib/errorHandler';

interface Campaign {
  id: string;
  title: string;
  description: string;
  event_date: string;
  location: string;
  cover_image_url: string;
  photographer: {
    full_name: string;
  };
}

const Index = () => {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeaturedCampaigns();
  }, []);

  const fetchFeaturedCampaigns = async () => {
    try {
      // Buscar campanhas com contagem de fotos disponíveis
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('campaigns')
        .select('id, title, description, event_date, location, cover_image_url, created_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (campaignsError) throw campaignsError;

      if (!campaignsData || campaignsData.length === 0) {
        setCampaigns([]);
        return;
      }

      // Para cada campanha, buscar contagem de fotos, dados do fotógrafo e fallback de capa
      const campaignsWithDetails = await Promise.all(
        campaignsData.map(async (campaign) => {
          // Contar fotos disponíveis
          const { count: photoCount } = await supabase
            .from('photos')
            .select('id', { count: 'exact', head: true })
            .eq('campaign_id', campaign.id)
            .eq('is_available', true);

          // Buscar dados do fotógrafo
          const { data: campaignDetails } = await supabase
            .from('campaigns')
            .select('photographer:profiles(full_name)')
            .eq('id', campaign.id)
            .single();

          // Se não tem capa, usar primeira foto do evento
          let coverImageUrl = campaign.cover_image_url;
          if (!coverImageUrl || coverImageUrl === '') {
            const { data: firstPhoto } = await supabase
              .from('photos')
              .select('watermarked_url')
              .eq('campaign_id', campaign.id)
              .eq('is_available', true)
              .order('upload_sequence', { ascending: true })
              .limit(1)
              .single();
            
            if (firstPhoto) {
              coverImageUrl = firstPhoto.watermarked_url;
            }
          }

          return {
            ...campaign,
            cover_image_url: coverImageUrl,
            photographer: campaignDetails?.photographer,
            photo_count: photoCount || 0
          };
        })
      );

      // Filtrar apenas campanhas com 5+ fotos e limitar a 6
      const eligibleCampaigns = campaignsWithDetails
        .filter(campaign => campaign.photo_count >= 5)
        .slice(0, 6);

      setCampaigns(eligibleCampaigns);
    } catch (error) {
      logger.error('Error fetching campaigns:', error);
      handleError(error, { 
        context: 'fetch',
        showToast: false
      });
    } finally {
      setLoading(false);
    }
  };

  // Animação de scroll
  useEffect(() => {
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

    document.querySelectorAll('.scroll-animate').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [loading]);

  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="relative py-12 sm:py-20 px-4 bg-gradient-to-br from-background via-primary/5 to-background overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.02] pointer-events-none" />
        <div className="container mx-auto relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-6 animate-fade-in-up">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
                Encontre suas melhores
              </span>
              <br />
              <span className="text-primary">fotos de eventos</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              Reconhecimento facial inteligente, compra instantânea e entrega digital. 
              Reviva seus melhores momentos em segundos.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link to="/events">
                <Button size="lg" className="w-full sm:w-auto gap-2 text-base h-12 px-8">
                  <Camera className="h-5 w-5" />
                  Ver Todos os Eventos
                </Button>
              </Link>
              {!user && (
                <Link to="/auth">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto text-base h-12 px-8">
                    Criar Conta Grátis
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-8 sm:py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 scroll-animate">
            <div className="text-center space-y-2">
              <div className="text-3xl sm:text-4xl font-bold text-primary">1000+</div>
              <div className="text-sm text-muted-foreground">Eventos Realizados</div>
            </div>
            <div className="text-center space-y-2">
              <div className="text-3xl sm:text-4xl font-bold text-primary">50k+</div>
              <div className="text-sm text-muted-foreground">Fotos Disponíveis</div>
            </div>
            <div className="text-center space-y-2">
              <div className="text-3xl sm:text-4xl font-bold text-primary">10k+</div>
              <div className="text-sm text-muted-foreground">Clientes Felizes</div>
            </div>
            <div className="text-center space-y-2">
              <div className="text-3xl sm:text-4xl font-bold text-primary">98%</div>
              <div className="text-sm text-muted-foreground">Satisfação</div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Campaigns */}
      <section className="py-12 sm:py-16 px-3 sm:px-4">
        <div className="container mx-auto">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="aspect-[4/5] bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : campaigns.length > 0 ? (
            <>
              <div className="text-center mb-8 sm:mb-12 scroll-animate">
                <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">Eventos em Destaque</h2>
                <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
                  Navegue pelos principais eventos e encontre suas fotos com reconhecimento facial
                </p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {campaigns.map((campaign, index) => (
                  <Link 
                    to={`/campaign/${campaign.id}`} 
                    key={campaign.id} 
                    className="group scroll-animate"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <Card className="overflow-hidden cursor-pointer border-2 transition-all duration-300 hover:border-primary/40 hover:shadow-2xl hover:-translate-y-2 active:scale-95">
                      <div className="aspect-[4/5] bg-gradient-dark relative overflow-hidden">
                        {campaign.cover_image_url ? (
                          <img
                            src={campaign.cover_image_url}
                            alt={campaign.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            loading="lazy"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-secondary">
                            <div className="text-center text-secondary-foreground">
                              <Camera className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 sm:mb-4 text-primary" />
                              <h3 className="text-lg sm:text-xl font-bold mb-2">{campaign.title}</h3>
                            </div>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute bottom-3 sm:bottom-4 left-3 sm:left-4 right-3 sm:right-4 text-white">
                          <h3 className="text-lg sm:text-xl font-bold mb-1 group-hover:text-primary transition-colors line-clamp-2">{campaign.title}</h3>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate max-w-[120px] sm:max-w-none">{campaign.location}</span>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <Calendar className="h-3 w-3" />
                              <span>{new Date(campaign.event_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex justify-between items-center gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs sm:text-sm text-muted-foreground truncate">
                              Por: {campaign.photographer?.full_name}
                            </p>
                          </div>
                          <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 sm:h-9 text-xs sm:text-sm flex-shrink-0">
                            Ver Fotos
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12 sm:py-16 px-4">
              <Camera className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mx-auto mb-3 sm:mb-4" />
              <h3 className="text-lg sm:text-xl font-medium mb-2">Em breve novos eventos!</h3>
              <p className="text-muted-foreground text-sm sm:text-base mb-4">
                Fotógrafos estão preparando eventos incríveis para você
              </p>
              {!user && (
                <Link to="/auth">
                  <Button className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90 h-11 sm:h-12 text-sm sm:text-base">
                    Cadastre-se para ser notificado
                  </Button>
                </Link>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-16 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-12 scroll-animate">
            <h2 className="text-3xl sm:text-4xl font-bold mb-3">Por que escolher a STA Fotos?</h2>
            <p className="text-muted-foreground text-base sm:text-lg">
              A maneira mais fácil e rápida de encontrar e comprar suas fotos
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 scroll-animate">
            <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg">
              <CardContent className="p-6 text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                  <Camera className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Reconhecimento Facial</h3>
                <p className="text-muted-foreground">
                  Faça upload de uma selfie e encontre automaticamente todas as suas fotos no evento
                </p>
              </CardContent>
            </Card>
            <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg">
              <CardContent className="p-6 text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                  <svg className="h-8 w-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold">Compra Instantânea</h3>
                <p className="text-muted-foreground">
                  Pagamento seguro via PIX e receba suas fotos em alta qualidade imediatamente
                </p>
              </CardContent>
            </Card>
            <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg">
              <CardContent className="p-6 text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                  <svg className="h-8 w-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold">100% Seguro</h3>
                <p className="text-muted-foreground">
                  Suas fotos e dados pessoais protegidos com criptografia de ponta a ponta
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!user && (
        <section className="py-16 sm:py-20 px-4">
          <div className="container mx-auto scroll-animate">
            <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-background">
              <CardContent className="p-8 sm:p-12 text-center space-y-6">
                <h2 className="text-3xl sm:text-4xl font-bold">
                  Pronto para encontrar suas fotos?
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Crie sua conta gratuitamente e comece a explorar milhares de eventos esportivos
                </p>
                <Link to="/auth">
                  <Button size="lg" className="gap-2 text-base h-12 px-8">
                    Começar Agora - É Grátis
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </section>
      )}
    </MainLayout>
  );
};

export default Index;