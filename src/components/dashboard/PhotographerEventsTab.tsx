import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Camera, Search, MapPin, Calendar, Image, Settings, Link2, ChevronLeft, ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { copyShareLink } from '@/lib/shareUtils';
import { useToast } from '@/hooks/use-toast';

interface Campaign {
  id: string;
  title: string;
  short_code?: string;
  event_date?: string;
  location?: string;
  cover_image_url?: string;
  is_active: boolean;
  photographer_id?: string | null;
  photo_count: number;
}

const PAGE_SIZE = 6;

const PhotographerEventsTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (user?.id) fetchCampaigns();
  }, [user?.id]);

  const fetchCampaigns = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      // Get owned campaigns
      const { data: owned } = await supabase
        .from('campaigns')
        .select('id, title, short_code, event_date, location, cover_image_url, is_active, photographer_id, photos(count)')
        .eq('photographer_id', user.id)
        .order('event_date', { ascending: false, nullsFirst: false });

      // Get assigned campaigns
      const { data: assigned } = await supabase
        .from('campaign_photographers')
        .select('campaign_id')
        .eq('photographer_id', user.id)
        .eq('is_active', true);

      const ownedIds = new Set((owned || []).map(c => c.id));
      const assignedIds = (assigned || []).map(a => a.campaign_id).filter(id => !ownedIds.has(id));

      let assignedCampaigns: any[] = [];
      if (assignedIds.length > 0) {
        const { data } = await supabase
          .from('campaigns')
          .select('id, title, short_code, event_date, location, cover_image_url, is_active, photographer_id, photos(count)')
          .in('id', assignedIds)
          .order('event_date', { ascending: false, nullsFirst: false });
        assignedCampaigns = data || [];
      }

      const all = [...(owned || []), ...assignedCampaigns]
        .sort((a, b) => new Date(b.event_date || '1970-01-01').getTime() - new Date(a.event_date || '1970-01-01').getTime())
        .map(c => ({ ...c, photo_count: c.photos?.[0]?.count || 0 }));

      setCampaigns(all);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return campaigns;
    const term = search.toLowerCase();
    return campaigns.filter(c =>
      c.title.toLowerCase().includes(term) ||
      c.location?.toLowerCase().includes(term)
    );
  }, [campaigns, search]);

  useEffect(() => { setCurrentPage(1); }, [search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const formatDate = (date?: string) => {
    if (!date) return 'Sem data';
    return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const isEventPast = (date?: string) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="grid gap-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou local..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Counter */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filtered.length} evento{filtered.length !== 1 ? 's' : ''}
          {search && ` para "${search}"`}
        </p>
      </div>

      {/* Events List */}
      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Camera className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground font-medium">
              {search ? 'Nenhum evento encontrado' : 'Nenhum evento ainda'}
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              {search ? 'Tente outra busca' : 'Crie seu primeiro evento para começar'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {paginated.map(campaign => {
            const past = isEventPast(campaign.event_date);
            return (
              <Card
                key={campaign.id}
                className="overflow-hidden hover:shadow-md hover:border-primary/20 transition-all duration-200 group"
              >
                <CardContent className="p-0">
                  <div className="flex items-stretch">
                    {/* Cover thumbnail */}
                    <div className="w-20 sm:w-28 flex-shrink-0 relative overflow-hidden bg-muted">
                      {campaign.cover_image_url ? (
                        <img
                          src={campaign.cover_image_url}
                          alt={campaign.title}
                          className="h-full w-full object-contain group-hover:scale-100 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                          <Camera className="h-6 w-6 text-muted-foreground/50" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-3 sm:p-4 flex flex-col justify-between min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-sm sm:text-base text-foreground truncate">
                              {campaign.title}
                            </h4>
                            {past ? (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                                Encerrado
                              </Badge>
                            ) : (
                              <Badge className="text-[10px] px-1.5 py-0 h-5 bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                                Ativo
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(campaign.event_date)}
                            </span>
                            {campaign.location && (
                              <span className="flex items-center gap-1 truncate">
                                <MapPin className="h-3 w-3" />
                                {campaign.location}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Image className="h-3 w-3" />
                              {campaign.photo_count}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Copiar link"
                            onClick={async () => {
                              const copied = await copyShareLink(campaign);
                              toast({
                                title: copied ? "🔗 Link copiado!" : "Erro",
                                variant: copied ? "default" : "destructive",
                              });
                            }}
                          >
                            <Link2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button asChild size="sm" className="h-8 gap-1 text-xs">
                            <Link to={`/dashboard/photographer/manage-event/${campaign.id}`}>
                              <Settings className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Gerenciar</span>
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
              .map((p, idx, arr) => (
                <React.Fragment key={p}>
                  {idx > 0 && arr[idx - 1] !== p - 1 && (
                    <span className="text-xs text-muted-foreground px-1">…</span>
                  )}
                  <Button
                    variant={p === currentPage ? "default" : "outline"}
                    size="icon"
                    className="h-8 w-8 text-xs"
                    onClick={() => setCurrentPage(p)}
                  >
                    {p}
                  </Button>
                </React.Fragment>
              ))}
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(p => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default PhotographerEventsTab;
