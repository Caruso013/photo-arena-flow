import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSearch } from '@/contexts/SearchContext';
import { useSearchParams } from 'react-router-dom';
import { Camera, Search } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { SkeletonCard } from '@/components/ui/skeleton-card';
import { EventFilters, FilterState } from '@/components/events/EventFilters';
import { EventCard } from '@/components/events/EventCard';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { PullToRefreshIndicator } from '@/components/ui/PullToRefreshIndicator';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { resilientQuery } from '@/lib/supabaseResilience';
import { Input } from '@/components/ui/input';
import { parseCampaignDate } from '@/lib/eventDate';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination';

interface Photographer {
  id: string;
  full_name: string;
  avatar_url?: string;
}

interface SubEvent {
  id: string;
  title: string;
  location: string | null;
  photo_count: number;
  campaign_id: string;
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
  sub_events?: SubEvent[];
  photo_count?: number;
}

const PAGE_SIZE = 12;
const IN_QUERY_BATCH_SIZE = 120;
const MIN_PHOTOS_TO_SHOW_EVENT = 5;
const EVENTS_VIEW_STORAGE_KEY = 'sta-events-view-state';

const defaultFilters: FilterState = {
  location: '',
  dateFrom: '',
  dateTo: '',
  sortBy: 'recent',
  photographer: '',
  organizationId: '',
};

const readStoredEventsView = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(EVENTS_VIEW_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const chunkArray = <T,>(items: T[], chunkSize: number): T[][] => {
  if (items.length === 0) return [];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
};

const Events = () => {
  const { searchTerm } = useSearch();
  const [searchParams] = useSearchParams();
  const haptic = useHapticFeedback();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const storedView = readStoredEventsView();
  const [localSearch, setLocalSearch] = useState(() => {
    return searchParams.get('search') || storedView?.localSearch || searchTerm || '';
  });
  const [currentPage, setCurrentPage] = useState(() => storedView?.currentPage || 1);
  const [filters, setFilters] = useState<FilterState>(() => ({
    ...defaultFilters,
    ...storedView?.filters,
    photographer: searchParams.get('photographer') || storedView?.filters?.photographer || '',
    organizationId: searchParams.get('org') || storedView?.filters?.organizationId || '',
  }));
  const didHydrateRef = useRef(false);

  const pullToRefresh = usePullToRefresh({
    onRefresh: async () => {
      haptic.light();
      await fetchAllCampaigns();
      haptic.success();
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    localStorage.setItem(EVENTS_VIEW_STORAGE_KEY, JSON.stringify({
      localSearch,
      currentPage,
      filters,
    }));
  }, [localSearch, currentPage, filters]);

  useEffect(() => {
    const photographerId = searchParams.get('photographer');
    const orgId = searchParams.get('org');
    const searchFromUrl = searchParams.get('search');

    if (searchFromUrl && searchFromUrl !== localSearch) {
      setLocalSearch(searchFromUrl);
    }

    if (photographerId || orgId) {
      setFilters(prev => ({
        ...prev,
        photographer: photographerId || prev.photographer,
        organizationId: orgId || prev.organizationId,
      }));
    }
  }, [searchParams]);

  const filteredCampaigns = useMemo(() => {
    let filtered = [...campaigns];
    
    const combinedSearch = (localSearch || searchTerm).trim().toLowerCase();
    
    if (combinedSearch) {
      filtered = filtered.filter((campaign) => {
        if (campaign.title.toLowerCase().includes(combinedSearch)) return true;
        if (campaign.location?.toLowerCase().includes(combinedSearch)) return true;
        if (campaign.photographer?.full_name?.toLowerCase().includes(combinedSearch)) return true;
        if (campaign.campaign_photographers) {
          return campaign.campaign_photographers.some(
            cp => cp.profiles?.full_name?.toLowerCase().includes(combinedSearch)
          );
        }
        return false;
      });
    }
    
    if (filters.photographer.trim()) {
      const photographerTerm = filters.photographer.toLowerCase();
      filtered = filtered.filter((campaign) => {
        if (campaign.photographer?.full_name?.toLowerCase().includes(photographerTerm)) return true;
        if (campaign.campaign_photographers) {
          return campaign.campaign_photographers.some(
            cp => cp.profiles?.full_name?.toLowerCase().includes(photographerTerm)
          );
        }
        return false;
      });
    }
    
    if (filters.organizationId) {
      filtered = filtered.filter((campaign) => campaign.organization_id === filters.organizationId);
    }

    if (filters.location.trim()) {
      const location = filters.location.toLowerCase();
      filtered = filtered.filter((campaign) =>
        campaign.location?.toLowerCase().includes(location)
      );
    }
    
    if (filters.dateFrom) {
      filtered = filtered.filter(
        (campaign) => {
          const campaignDate = parseCampaignDate(campaign.event_date);
          const fromDate = parseCampaignDate(filters.dateFrom);
          return !!campaignDate && !!fromDate && campaignDate >= fromDate;
        }
      );
    }
    if (filters.dateTo) {
      filtered = filtered.filter(
        (campaign) => {
          const campaignDate = parseCampaignDate(campaign.event_date);
          const toDate = parseCampaignDate(filters.dateTo);
          return !!campaignDate && !!toDate && campaignDate <= toDate;
        }
      );
    }

    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'date':
          return (parseCampaignDate(a.event_date)?.getTime() || 0) - (parseCampaignDate(b.event_date)?.getTime() || 0);
        case 'title':
          return a.title.localeCompare(b.title);
        case 'recent':
        default: {
          const now = new Date();
          now.setHours(0, 0, 0, 0);
          const dateA = parseCampaignDate(a.event_date) || new Date('1970-01-01T00:00:00');
          const dateB = parseCampaignDate(b.event_date) || new Date('1970-01-01T00:00:00');
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
  }, [campaigns, searchTerm, localSearch, filters]);

  useEffect(() => {
    if (!didHydrateRef.current) {
      didHydrateRef.current = true;
      return;
    }

    setCurrentPage(1);
  }, [localSearch, searchTerm, filters]);

  const clearFilters = () => {
    setFilters(defaultFilters);
    setCurrentPage(1);
    if (typeof window !== 'undefined') {
      localStorage.setItem(EVENTS_VIEW_STORAGE_KEY, JSON.stringify({
        localSearch,
        currentPage: 1,
        filters: defaultFilters,
      }));
    }
  };

  const totalPages = Math.ceil(filteredCampaigns.length / PAGE_SIZE);
  const paginatedCampaigns = filteredCampaigns.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  useEffect(() => {
    fetchAllCampaigns();
  }, []);

  const fetchAllCampaigns = async () => {
    setLoading(true);
    try {
      const { data: campaignsData, error: campaignsError } = await resilientQuery(
        () => supabase
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
          .order('event_date', { ascending: false, nullsFirst: false }),
        'fetch-campaigns'
      );

      if (campaignsError) throw campaignsError;

      if (!campaignsData || campaignsData.length === 0) {
        setCampaigns([]);
        return;
      }

      const campaignIds = campaignsData.map(c => c.id);
      const campaignIdChunks = chunkArray(campaignIds, IN_QUERY_BATCH_SIZE);
      const campaignIdsWithoutCover = campaignsData
        .filter(c => !c.cover_image_url)
        .map(c => c.id);
      const campaignIdChunksWithoutCover = chunkArray(campaignIdsWithoutCover, IN_QUERY_BATCH_SIZE);

      const [campaignStats, subEventsData, fallbackCovers] = await Promise.all([
        resilientQuery(
          async () => {
            const chunkResults = await Promise.all(
              campaignIdChunks.map(async (idsChunk) => {
                const { data, error } = await supabase
                  .from('campaigns_for_home')
                  .select('id, photo_count, cover_image_url')
                  .in('id', idsChunk);

                if (error) throw error;
                return data || [];
              })
            );
            const mergedData = chunkResults.flat();

            return { data: mergedData, error: null };
          },
          'campaign-stats'
        ),
        resilientQuery(
          async () => {
            const chunkResults = await Promise.all(
              campaignIdChunks.map(async (idsChunk) => {
                const { data, error } = await supabase
                  .from('sub_events')
                  .select('id, title, location, photo_count, campaign_id')
                  .in('campaign_id', idsChunk)
                  .order('created_at', { ascending: true });

                if (error) throw error;
                return data || [];
              })
            );
            const mergedData = chunkResults.flat();

            return { data: mergedData, error: null };
          },
          'sub-events'
        ),
        resilientQuery(
          async () => {
            if (campaignIdChunksWithoutCover.length === 0) {
              return { data: [], error: null };
            }

            const chunkResults = await Promise.all(
              campaignIdChunksWithoutCover.map(async (idsChunk) => {
                const { data, error } = await supabase
                  .from('photos')
                  .select('campaign_id, watermarked_url')
                  .in('campaign_id', idsChunk)
                  .eq('is_available', true)
                  .not('watermarked_url', 'is', null)
                  .order('upload_sequence', { ascending: true });

                if (error) throw error;
                return data || [];
              })
            );
            const mergedData = chunkResults.flat();

            return { data: mergedData, error: null };
          },
          'fallback-covers'
        ),
      ]);

      const countMap: Record<string, number> = {};
      const coverMap: Record<string, string> = {};

      (campaignStats.data || []).forEach((stat: any) => {
        if (!stat?.id) return;
        countMap[stat.id] = Number(stat.photo_count || 0);
        if (stat.cover_image_url) {
          coverMap[stat.id] = stat.cover_image_url;
        }
      });

      const subEventsMap: Record<string, SubEvent[]> = {};
      (subEventsData.data || []).forEach((se: any) => {
        if (!subEventsMap[se.campaign_id]) subEventsMap[se.campaign_id] = [];
        subEventsMap[se.campaign_id].push(se);
      });

      (fallbackCovers.data || []).forEach((p: any) => {
        if (!coverMap[p.campaign_id]) coverMap[p.campaign_id] = p.watermarked_url;
      });

      const enriched = campaignsData
        .map(campaign => ({
          ...campaign,
          cover_image_url: campaign.cover_image_url || coverMap[campaign.id] || '',
          photo_count: countMap[campaign.id] || 0,
          sub_events: subEventsMap[campaign.id] || [],
        }))
        // Esconde eventos com menos de 5 fotos disponíveis (regra de visibilidade)
        .filter(c => (c.photo_count || 0) >= 5);

      // Regra de vitrine: evento só aparece na página de eventos com mais de 5 fotos publicadas.
      const eligibleCampaigns = enriched.filter((campaign) => (campaign.photo_count || 0) > MIN_PHOTOS_TO_SHOW_EVENT);

      setCampaigns(eligibleCampaigns);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('ellipsis');
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push('ellipsis');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <MainLayout>
      <PullToRefreshIndicator 
        isPulling={pullToRefresh.isPulling}
        isRefreshing={pullToRefresh.isRefreshing}
        progress={pullToRefresh.progress}
      />
      <section className="container mx-auto px-4 py-6 md:py-8">
        <div className="mb-6 md:mb-8 space-y-4 rounded-2xl border border-border/70 bg-card/85 p-4 md:p-6 shadow-sm backdrop-blur-sm">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Todos os Eventos
            </h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Encontre fotos dos seus eventos esportivos favoritos
            </p>
          </div>

          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, local ou fotógrafo..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-2">
              {!loading && (
                <>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary/50 px-4 py-2 rounded-full">
                    <Camera className="h-4 w-4" />
                    <span className="font-medium">{filteredCampaigns.length}</span>
                    <span>evento(s)</span>
                  </div>
                  {(localSearch || searchTerm) && (
                    <div className="text-xs text-muted-foreground bg-primary/10 px-3 py-1.5 rounded-full">
                      Busca: <span className="font-semibold">"{localSearch || searchTerm}"</span>
                    </div>
                  )}
                </>
              )}
            </div>
            <EventFilters
              filters={filters}
              onFilterChange={setFilters}
              onClearFilters={clearFilters}
            />
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
              {(localSearch || searchTerm)
                ? `Não encontramos resultados para "${localSearch || searchTerm}". Tente outra busca.` 
                : 'Ainda não há eventos disponíveis. Volte em breve!'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {paginatedCampaigns.map((campaign, index) => (
                <EventCard 
                  key={campaign.id}
                  campaign={campaign}
                  index={index}
                />
              ))}
            </div>
            
            {totalPages > 1 && (
              <div className="mt-8">
                <Pagination>
                  <PaginationContent>
                    {currentPage > 1 && (
                      <PaginationItem>
                        <PaginationPrevious 
                          href="#" 
                          onClick={(e) => { e.preventDefault(); setCurrentPage(p => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }} 
                        />
                      </PaginationItem>
                    )}
                    {getPageNumbers().map((p, i) => (
                      <PaginationItem key={i}>
                        {p === 'ellipsis' ? (
                          <PaginationEllipsis />
                        ) : (
                          <PaginationLink
                            href="#"
                            isActive={p === currentPage}
                            onClick={(e) => { e.preventDefault(); setCurrentPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                          >
                            {p}
                          </PaginationLink>
                        )}
                      </PaginationItem>
                    ))}
                    {currentPage < totalPages && (
                      <PaginationItem>
                        <PaginationNext 
                          href="#" 
                          onClick={(e) => { e.preventDefault(); setCurrentPage(p => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }} 
                        />
                      </PaginationItem>
                    )}
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
      </section>
    </MainLayout>
  );
};

export default Events;