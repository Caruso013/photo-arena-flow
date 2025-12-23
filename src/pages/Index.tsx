import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, MapPin, Calendar, Sparkles, Zap, Shield, Heart } from 'lucide-react';
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
      // Buscar campanhas ativas com fotos
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('campaigns')
        .select(`
          id,
          title,
          description,
          event_date,
          location,
          cover_image_url,
          created_at,
          photographer_id,
          photographer:profiles!photographer_id(full_name)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(20);

      if (campaignsError) throw campaignsError;

      if (!campaignsData || campaignsData.length === 0) {
        setCampaigns([]);
        return;
      }

      // Buscar capa e contagem de fotos para cada campanha
      const campaignsWithDetails = await Promise.all(
        campaignsData.map(async (campaign) => {
          // Contar fotos disponíveis
          const { count: photoCount } = await supabase
            .from('photos')
            .select('id', { count: 'exact', head: true })
            .eq('campaign_id', campaign.id)
            .eq('is_available', true);

          // Buscar capa ou primeira foto watermarked
          let coverImageUrl = campaign.cover_image_url;
          
          if (!coverImageUrl) {
            const { data: firstPhoto } = await supabase
              .from('photos')
              .select('watermarked_url')
              .eq('campaign_id', campaign.id)
              .eq('is_available', true)
              .not('watermarked_url', 'is', null)
              .order('upload_sequence', { ascending: true })
              .limit(1)
              .maybeSingle();
            
            coverImageUrl = firstPhoto?.watermarked_url || '';
          }

          return {
            ...campaign,
            cover_image_url: coverImageUrl,
            photo_count: photoCount || 0
          };
        })
      );

      // Filtrar campanhas com fotos e limitar a 6
      const eligibleCampaigns = campaignsWithDetails
        .filter(campaign => campaign.photo_count >= 3 && campaign.cover_image_url)
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
      <section className="relative min-h-[85vh] flex items-center justify-center px-4 bg-gradient-to-br from-black via-primary/10 to-black overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary/10 rounded-full blur-[150px] animate-pulse delay-1000" />
        
        <div className="container mx-auto relative z-10">
          <div className="max-w-5xl mx-auto text-center space-y-8">
            <div className="animate-fade-in-up space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
                <Sparkles className="h-4 w-4" />
                Reconhecimento Facial Inteligente
              </div>
              
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-tight">
                <span className="bg-gradient-to-r from-white via-primary to-white bg-clip-text text-transparent">
                  Reviva seus
                </span>
                <br />
                <span className="text-primary animate-pulse">melhores momentos</span>
              </h1>
              
              <p className="text-xl sm:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                Encontre suas fotos instantaneamente com IA, compre em segundos 
                e receba digitalmente. Simples, rápido e mágico.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6 animate-fade-in-up delay-200">
              <Link to="/events" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto gap-2 text-lg h-14 px-10 bg-primary hover:bg-primary/90 shadow-2xl shadow-primary/50 hover:shadow-primary/70 transition-all duration-300 hover:scale-105">
                  <Camera className="h-6 w-6" />
                  Explorar Eventos
                </Button>
              </Link>
              {!user && (
                <Link to="/auth" className="w-full sm:w-auto">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg h-14 px-10 border-2 border-primary/30 hover:border-primary hover:bg-primary/10 transition-all duration-300">
                    Começar Grátis
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 scroll-animate">
            <h2 className="text-3xl sm:text-5xl font-bold mb-4">Por que escolher STA Fotos?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Tecnologia de ponta para encontrar suas fotos de forma instantânea
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Card className="group scroll-animate border-2 hover:border-primary/50 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2" style={{ animationDelay: '0ms' }}>
              <CardContent className="p-8 text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Zap className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold">IA de Reconhecimento</h3>
                <p className="text-muted-foreground">
                  Tecnologia de ponta identifica você automaticamente em milhares de fotos em segundos
                </p>
              </CardContent>
            </Card>

            <Card className="group scroll-animate border-2 hover:border-primary/50 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2" style={{ animationDelay: '100ms' }}>
              <CardContent className="p-8 text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Compra Segura</h3>
                <p className="text-muted-foreground">
                  Pagamento protegido com cartão de crédito e PIX. Suas fotos são suas para sempre
                </p>
              </CardContent>
            </Card>

            <Card className="group scroll-animate border-2 hover:border-primary/50 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2" style={{ animationDelay: '200ms' }}>
              <CardContent className="p-8 text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Heart className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Entrega Instantânea</h3>
                <p className="text-muted-foreground">
                  Receba suas fotos em alta qualidade direto no email, sem espera e sem complicação
                </p>
              </CardContent>
            </Card>
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