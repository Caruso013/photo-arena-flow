import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTransformedImageUrl } from '@/lib/supabaseImageTransform';
import { formatCampaignDate } from '@/lib/eventDate';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Camera, Search, MapPin, Calendar, ArrowRight, Star, Sparkles, Building2, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { resilientQuery } from '@/lib/supabaseResilience';
import { useSearch } from '@/contexts/SearchContext';

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

interface Organization {
  id: string;
  name: string;
  logo_url: string | null;
  description: string | null;
  is_official_partner: boolean;
  event_count: number;
}

const Home = () => {
  const navigate = useNavigate();
  const [featuredCampaigns, setFeaturedCampaigns] = useState<FeaturedCampaign[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [heroBannerUrl, setHeroBannerUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const { setSearchTerm } = useSearch();
  const [heroSearch, setHeroSearch] = useState('');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const partnersCarouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const onScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollDown = () => {
    window.scrollBy({ top: Math.round(window.innerHeight * 0.85), behavior: 'smooth' });
  };

  const scrollPartners = (direction: 'left' | 'right') => {
    partnersCarouselRef.current?.scrollBy({
      left: direction === 'left' ? -320 : 320,
      behavior: 'smooth',
    });
  };

  const fetchData = async () => {
    try {
      // Single batch: campaigns + organizations + home banner config
      const [campaignsData, orgsData, heroBannerConfig] = await Promise.all([
        resilientQuery(
          () => supabase
            .from('campaigns')
            .select('id, title, description, event_date, location, cover_image_url, photographer_id, is_featured')
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(8),
          'home-campaigns'
        ),
        resilientQuery(
          () => supabase
            .from('organizations')
            .select('id, name, logo_url, description, is_official_partner')
            .eq('is_official_partner', true)
            .order('name'),
          'home-organizations'
        ),
        resilientQuery(
          () => supabase
            .from('system_config' as any)
            .select('value')
            .eq('key', 'home_hero_banner')
            .maybeSingle() as any,
          'home-hero-banner'
        ),
      ]);

      const configuredHeroUrl = (heroBannerConfig as any)?.data?.value?.url;
      if (typeof configuredHeroUrl === 'string') {
        setHeroBannerUrl(configuredHeroUrl);
      }

      // Process organizations with event counts
      if (orgsData.data && orgsData.data.length > 0) {
        const orgIds = orgsData.data.map((o: any) => o.id);
        const { data: orgCampaigns } = await supabase
          .from('campaigns')
          .select('organization_id')
          .in('organization_id', orgIds)
          .eq('is_active', true);

        const orgCountMap: Record<string, number> = {};
        (orgCampaigns || []).forEach((c: any) => {
          orgCountMap[c.organization_id] = (orgCountMap[c.organization_id] || 0) + 1;
        });

        setOrganizations(
          orgsData.data
            .map((org: any) => ({ ...org, event_count: orgCountMap[org.id] || 0 }))
            .filter((org: Organization) => org.event_count > 0)
        );
      }

      if (campaignsData.data && campaignsData.data.length > 0) {
        const campaigns = campaignsData.data;
        const campaignIds = campaigns.map(c => c.id);
        const photographerIds = [...new Set(campaigns.map(c => c.photographer_id).filter(Boolean))] as string[];

        // Second batch: photo counts, photographer names, fallback covers
        const [photoCounts, photographerProfiles, fallbackCovers] = await Promise.all([
          resilientQuery(
            () => supabase
              .from('photos')
              .select('campaign_id')
              .in('campaign_id', campaignIds)
              .eq('is_available', true),
            'home-photo-counts'
          ),
          photographerIds.length > 0
            ? resilientQuery(
                () => supabase.from('profiles').select('id, full_name').in('id', photographerIds),
                'home-photographers'
              )
            : Promise.resolve({ data: [] }),
          resilientQuery(
            () => supabase
              .from('photos')
              .select('campaign_id, watermarked_url')
              .in('campaign_id', campaignIds.filter(id => {
                const c = campaigns.find(cd => cd.id === id);
                return !c?.cover_image_url;
              }))
              .eq('is_available', true)
              .not('watermarked_url', 'is', null)
              .order('upload_sequence', { ascending: true }),
            'home-fallback-covers'
          ),
        ]);

        const countMap: Record<string, number> = {};
        (photoCounts.data || []).forEach((p: any) => {
          countMap[p.campaign_id] = (countMap[p.campaign_id] || 0) + 1;
        });

        const photographerMap: Record<string, string> = {};
        ((photographerProfiles as any).data || []).forEach((p: any) => {
          photographerMap[p.id] = p.full_name;
        });

        const coverMap: Record<string, string> = {};
        (fallbackCovers.data || []).forEach((p: any) => {
          if (!coverMap[p.campaign_id]) coverMap[p.campaign_id] = p.watermarked_url;
        });


        const campaignsWithDetails = campaigns.map(campaign => ({
          ...campaign,
          cover_image_url: campaign.cover_image_url || coverMap[campaign.id] || '',
          photo_count: countMap[campaign.id] || 0,
          photographer_name: (campaign.photographer_id && photographerMap[campaign.photographer_id]) || 'STA Fotos'
        }));

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
      {/* Partners / Parceiros - topo */}
      {organizations.length > 0 && (
        <section className="py-10">
          <div className="container mx-auto px-4">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground">Organizações parceiras</h2>
                <p className="text-sm md:text-base text-muted-foreground">
                  Navegue pelas organizações em destaque e abra os eventos de cada parceira.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-full border-primary/30 hover:bg-primary/10 hover:border-primary/60 transition-all"
                  onClick={() => scrollPartners('left')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-full border-primary/30 hover:bg-primary/10 hover:border-primary/60 transition-all"
                  onClick={() => scrollPartners('right')}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Carousel — scrollable on mobile, centered on desktop */}
            <div
              ref={partnersCarouselRef}
              className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scroll-smooth
                [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
                md:justify-center md:flex-wrap md:overflow-x-visible md:pb-0"
            >
              {organizations.slice(0, 8).map((org, index) => (
                <button
                  key={org.id}
                  type="button"
                  onClick={() => navigate(`/events?org=${org.id}`)}
                  title={org.name}
                  aria-label={`Abrir eventos da organização ${org.name}`}
                  style={{ animationDelay: `${index * 60}ms` }}
                  className="group flex-shrink-0 w-36 snap-start rounded-2xl border border-border/60 bg-card p-4
                    flex flex-col items-center gap-3 shadow-sm
                    transition-all duration-300 ease-out
                    hover:-translate-y-2 hover:shadow-xl hover:border-primary/50 hover:shadow-primary/10
                    animate-[fadeInUp_0.45s_ease_both]"
                >
                  {/* Logo container — square, centered */}
                  <div className="relative w-full aspect-square rounded-xl border border-border/50 bg-white overflow-hidden
                    flex items-center justify-center
                    transition-all duration-300 group-hover:border-primary/40 group-hover:bg-primary/5">
                    {/* shimmer */}
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />
                    {org.logo_url ? (
                      <img
                        src={org.logo_url}
                        alt={org.name}
                        className="relative w-4/5 h-4/5 object-contain transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <Building2 className="relative h-10 w-10 text-primary/60 transition-transform duration-300 group-hover:scale-110" />
                    )}
                  </div>

                  {/* Name */}
                  <p className="w-full text-center text-xs font-semibold leading-tight line-clamp-2
                    text-muted-foreground group-hover:text-foreground transition-colors">
                    {org.name}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Hero Section with big centered search */}
      <section className="relative">
        <div className="container mx-auto px-4">
          <div
            className="rounded-none overflow-hidden h-44 sm:h-56 md:h-96 flex items-center justify-center"
            style={{
              backgroundImage: heroBannerUrl
                ? `linear-gradient(rgba(0,0,0,0.22), rgba(0,0,0,0.12)), url(${heroBannerUrl})`
                : featuredCampaigns[0]?.cover_image_url
                ? `linear-gradient(rgba(0,0,0,0.22), rgba(0,0,0,0.12)), url(${getTransformedImageUrl(featuredCampaigns[0].cover_image_url, 'large')})`
                : 'linear-gradient(180deg, rgba(250,245,230,0.9), rgba(250,245,230,0.9))',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <div className="text-center w-full px-2">
              <h1 className="text-2xl sm:text-3xl md:text-5xl font-extrabold text-white mb-4 md:mb-6 drop-shadow-lg leading-tight">Encontre suas Fotos</h1>
              <div className="mx-auto w-full max-w-3xl px-2 sm:px-6">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setSearchTerm(heroSearch);
                    navigate(`/events?search=${encodeURIComponent(heroSearch)}`);
                  }}
                >
                  <div className="rounded-full p-1 bg-primary/10 border-2 sm:border-4 border-primary shadow-subtle">
                    <div className="bg-card/95 rounded-full px-2 sm:px-4 py-2 sm:py-3">
                      <div className="relative">
                        <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4 sm:h-5 sm:w-5" />
                        <Input
                          placeholder="Procure pelo evento em que participou"
                          value={heroSearch}
                          onChange={(e) => setHeroSearch(e.target.value)}
                          className="pl-10 sm:pl-12 pr-3 sm:pr-4 text-base sm:text-lg rounded-full border-0 bg-transparent"
                        />
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* Featured Events */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">Últimos Eventos</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Confira os eventos mais recentes e encontre suas fotos
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredCampaigns.map((campaign) => (
                <Card
                  key={campaign.id}
                  className="overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
                  onClick={() => navigate(`/campaign/${campaign.id}`)}
                >
                  <div className="aspect-video relative overflow-hidden bg-muted">
                    {campaign.cover_image_url ? (
                      <img
                        src={getTransformedImageUrl(campaign.cover_image_url, 'medium')}
                        alt={campaign.title}
                        className="w-full h-full object-cover group-hover:scale-105 transform transition-transform duration-500"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                        <Camera className="h-16 w-16 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-background/90 backdrop-blur-sm text-foreground">
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
                          {formatCampaignDate(campaign.event_date) || ''}
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
              variant="secondary"
              onClick={() => navigate('/events')}
              className="gap-2 px-8 py-3 text-lg shadow-lg"
            >
              Ver Todos os Eventos
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

            {/* Sobre nós */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
            <div className="space-y-5">
              <Badge variant="outline" className="px-4 py-1.5 w-fit border-primary/30 text-primary">
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                Sobre nós
              </Badge>
              <div className="space-y-3">
                <h2 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">
                  Fotografia esportiva com tecnologia, velocidade e propósito
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl">
                  A STA nasceu para aproximar o futebol de base de uma experiência profissional de imagem, com entrega rápida, descoberta facilitada e um fluxo pensado para fotógrafos e compradores.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button onClick={() => navigate('/sobre')} className="gap-2">
                  Conhecer a STA
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={() => navigate('/fotografos')}>
                  Quero ser fotógrafo
                </Button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="border-primary/10 bg-card/90 shadow-sm">
                <CardContent className="p-5 space-y-2">
                  <Camera className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-lg">Experiência real</h3>
                  <p className="text-sm text-muted-foreground">
                    Busca rápida por evento, fotos compradas e download simplificado.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-primary/10 bg-card/90 shadow-sm">
                <CardContent className="p-5 space-y-2">
                  <Star className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-lg">Entrega premium</h3>
                  <p className="text-sm text-muted-foreground">
                    Navegação clara para atletas, famílias, fotógrafos e organizadores.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-primary/10 bg-card/90 shadow-sm sm:col-span-2">
                <CardContent className="p-5 space-y-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-lg">Conexão com o esporte</h3>
                  <p className="text-sm text-muted-foreground">
                    Um ecossistema completo para eventos, candidaturas, uploads e compra de fotos sem fricção.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <div className="fixed bottom-6 right-5 z-40 hidden md:flex flex-col gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={scrollDown}
          className="h-10 w-10 rounded-full border-primary/30 bg-white/90 shadow-md backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-primary/10"
          title="Descer"
        >
          <ChevronDown className="h-5 w-5 text-primary" />
        </Button>

        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={scrollToTop}
          className={`h-10 w-10 rounded-full border-primary/30 bg-white/90 shadow-md backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-primary/10 ${showScrollTop ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
          title="Subir"
        >
          <ChevronUp className="h-5 w-5 text-primary" />
        </Button>
      </div>

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
