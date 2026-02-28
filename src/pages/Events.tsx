import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSearch } from '@/contexts/SearchContext';
import { useSearchParams } from 'react-router-dom';
import { Camera } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { SkeletonCard } from '@/components/ui/skeleton-card';
import { EventFilters, FilterState } from '@/components/events/EventFilters';
import { EventCard } from '@/components/events/EventCard';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { PullToRefreshIndicator } from '@/components/ui/PullToRefreshIndicator';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

interface Photographer {
  id: string;
  full_name: string;
  avatar_url?: string;
}

interface Campaign {
  id: string;
  title: string;
  description: string;
  event_date: string;
  location: string;
  cover_image_url: string;
  created_at?: string;
  photographer_id?: string;
  organization_id?: string | null;
  photographer: Photographer | null;
  photo_price_display?: number | null;
  campaign_photographers?: {
    photographer_id: string;
    profiles: Photographer;
  }[];
}

const Events = () => {
  const { searchTerm } = useSearch();
  const [searchParams] = useSearchParams();
  const haptic = useHapticFeedback();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    location: '',
    dateFrom: '',
    dateTo: '',
    sortBy: 'recent',
    photographer: '',
    organizationId: '',
  });

  // Pull to refresh
  const pullToRefresh = usePullToRefresh({
    onRefresh: async () => {
      haptic.light();
      await fetchCampaigns();
      haptic.success();
    }
  });

  // Detectar filtro de fotógrafo na URL
  useEffect(() => {
    const photographerId = searchParams.get('photographer');
    if (photographerId) {
      setFilters(prev => ({ ...prev, photographer: photographerId }));
    }
  }, [searchParams]);

  const filteredCampaigns = useMemo(() => {
    let filtered = [...campaigns];
    
    // Filtro de busca
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((campaign) => {
        // Buscar no título e localização
        if (campaign.title.toLowerCase().includes(term)) return true;
        if (campaign.location.toLowerCase().includes(term)) return true;
        
        // Buscar no fotógrafo principal
        if (campaign.photographer?.full_name.toLowerCase().includes(term)) return true;
        
        // Buscar em fotógrafos adicionais
        if (campaign.campaign_photographers) {
          return campaign.campaign_photographers.some(
            cp => cp.profiles?.full_name.toLowerCase().includes(term)
          );
        }
        
        return false;
      });
    }
    
    // Filtro por fotógrafo (busca por nome, case-insensitive)
    if (filters.photographer.trim()) {
      const photographerTerm = filters.photographer.toLowerCase();
      filtered = filtered.filter((campaign) => {
        // Verificar fotógrafo principal por nome
        if (campaign.photographer?.full_name?.toLowerCase().includes(photographerTerm)) return true;
        
        // Verificar fotógrafos adicionais por nome
        if (campaign.campaign_photographers) {
          return campaign.campaign_photographers.some(
            cp => cp.profiles?.full_name?.toLowerCase().includes(photographerTerm)
          );
        }
        return false;
      });
    }
    
    // Filtro por organização
    if (filters.organizationId) {
      filtered = filtered.filter((campaign) => campaign.organization_id === filters.organizationId);
    }

    // Filtro de localização
    if (filters.location.trim()) {
      const location = filters.location.toLowerCase();
      filtered = filtered.filter((campaign) =>
        campaign.location.toLowerCase().includes(location)
      );
    }
    
    // Filtro de data
    if (filters.dateFrom) {
      filtered = filtered.filter(
        (campaign) => new Date(campaign.event_date) >= new Date(filters.dateFrom)
      );
    }
    if (filters.dateTo) {
      filtered = filtered.filter(
        (campaign) => new Date(campaign.event_date) <= new Date(filters.dateTo)
      );
    }


    // Ordenação
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'date':
          return new Date(a.event_date).getTime() - new Date(b.event_date).getTime();
        case 'title':
          return a.title.localeCompare(b.title);
        case 'recent':
        default: {
          // Ordenar por data do evento: futuros primeiro (ascendente), depois passados (descendente)
          const now = new Date();
          now.setHours(0, 0, 0, 0);
          const dateA = new Date(a.event_date);
          const dateB = new Date(b.event_date);
          const isFutureA = dateA.getTime() >= now.getTime();
          const isFutureB = dateB.getTime() >= now.getTime();
          
          if (isFutureA && !isFutureB) return -1;
          if (!isFutureA && isFutureB) return 1;
          if (isFutureA && isFutureB) return dateA.getTime() - dateB.getTime();
          return dateB.getTime() - dateA.getTime();
        }
      }
    });
    
    return filtered;
  }, [campaigns, searchTerm, filters]);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      // Buscar campanhas ativas
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('campaigns')
        .select(`
          *,
          photographer:profiles!photographer_id(id, full_name, avatar_url),
          campaign_photographers(
            photographer_id,
            profiles:profiles!photographer_id(id, full_name, avatar_url)
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (campaignsError) throw campaignsError;

      if (!campaignsData || campaignsData.length === 0) {
        setCampaigns([]);
        return;
      }

      // Para cada campanha, contar fotos disponíveis e buscar fallback de capa
      const campaignsWithPhotoCount = await Promise.all(
        campaignsData.map(async (campaign) => {
          const { count: photoCount } = await supabase
            .from('photos')
            .select('id', { count: 'exact', head: true })
            .eq('campaign_id', campaign.id)
            .eq('is_available', true);

          // Buscar capa ou primeira foto watermarked disponível
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

      // Filtrar apenas campanhas com 5+ fotos
      const eligibleCampaigns = campaignsWithPhotoCount.filter(
        campaign => campaign.photo_count >= 5
      );

      setCampaigns(eligibleCampaigns);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <PullToRefreshIndicator 
        isPulling={pullToRefresh.isPulling}
        isRefreshing={pullToRefresh.isRefreshing}
        progress={pullToRefresh.progress}
      />
      <section className="container mx-auto px-4 py-6 md:py-8">
        <div className="mb-6 md:mb-8 space-y-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Todos os Eventos
            </h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Encontre fotos dos seus eventos esportivos favoritos
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              ✨ Exibindo apenas eventos com 5 ou mais fotos disponíveis
            </p>
          </div>

          {/* Barra de informações e filtros */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-2">
              {!loading && (
                <>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary/50 px-4 py-2 rounded-full">
                    <Camera className="h-4 w-4" />
                    <span className="font-medium">{filteredCampaigns.length}</span>
                    <span>evento(s)</span>
                  </div>
                  {searchTerm && (
                    <div className="text-xs text-muted-foreground bg-primary/10 px-3 py-1.5 rounded-full">
                      Busca: <span className="font-semibold">"{searchTerm}"</span>
                    </div>
                  )}
                </>
              )}
            </div>
            <EventFilters onFilterChange={setFilters} />
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {[...Array(6)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="text-center py-16 md:py-20 px-4">
            <div className="w-20 h-20 md:w-24 md:h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Camera className="h-10 md:h-12 w-10 md:w-12 text-primary" />
            </div>
            <h3 className="text-xl md:text-2xl font-bold mb-3">Nenhum evento encontrado</h3>
            <p className="text-sm md:text-base text-muted-foreground max-w-md mx-auto">
              {searchTerm 
                ? `Não encontramos resultados para "${searchTerm}". Tente outra busca.` 
                : 'Ainda não há eventos disponíveis. Volte em breve!'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {filteredCampaigns.map((campaign, index) => (
              <EventCard 
                key={campaign.id}
                campaign={campaign}
                index={index}
              />
            ))}
          </div>
        )}
      </section>
    </MainLayout>
  );
};

export default Events;