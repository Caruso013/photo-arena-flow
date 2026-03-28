import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTransformedImageUrl } from '@/lib/supabaseImageTransform';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Camera, Search, MapPin, Calendar, ArrowRight, Star, Sparkles, Building2 } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { resilientQuery } from '@/lib/supabaseResilience';

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
  event_count: number;
}

const Home = () => {
  const navigate = useNavigate();
  const [featuredCampaigns, setFeaturedCampaigns] = useState<FeaturedCampaign[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Single batch: stats + campaigns + organizations
      const [, campaignsData, orgsData] = await Promise.all([
        resilientQuery(
          () => supabase.from('campaigns').select('id', { count: 'exact', head: true }).eq('is_active', true),
          'home-events-count'
        ),
        resilientQuery(
          () => supabase
            .from('campaigns')
            .select('id, title, description, event_date, location, cover_image_url, photographer_id, is_featured')
            .eq('is_active', true)
            .order('is_featured', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(6),
          'home-campaigns'
        ),
        resilientQuery(
          () => supabase
            .from('organizations')
            .select('id, name, logo_url, description')
            .order('name'),
          'home-organizations'
        ),
      ]);

      // eventsCount not needed for display anymore

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
      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 md:py-28">
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-background to-yellow-600/5"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-yellow-500/20 via-transparent to-transparent"></div>
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
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
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
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
            
            <p className="text-sm text-muted-foreground">
              Encontre suas fotos nos melhores eventos esportivos
            </p>
          </div>
        </div>
      </section>


      {/* Featured Events */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
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
                        src={getTransformedImageUrl(campaign.cover_image_url, 'medium')}
                        alt={campaign.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
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

      {/* Organizations Section */}
      {organizations.length > 0 && (
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">Organizações</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Confira os eventos das organizações parceiras
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {organizations.map((org) => (
                <Card 
                  key={org.id}
                  className="overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group border-border/50 hover:border-primary/40"
                  onClick={() => navigate(`/events?org=${org.id}`)}
                >
                  <CardContent className="p-6 text-center flex flex-col items-center gap-3">
                    {org.logo_url ? (
                      <img 
                        src={org.logo_url} 
                        alt={org.name} 
                        className="h-16 w-16 rounded-full object-cover border-2 border-border group-hover:border-primary/50 transition-colors"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <Building2 className="h-8 w-8 text-primary" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2">
                        {org.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {org.event_count} {org.event_count === 1 ? 'evento' : 'eventos'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

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
