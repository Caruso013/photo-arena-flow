import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Image, Trash2, AlertTriangle, CheckSquare, Square, Loader2, ChevronLeft, ChevronRight, FolderOpen } from 'lucide-react';
import { SkeletonCard } from '@/components/ui/skeleton-card';
import { LazyImage } from '@/components/ui/lazy-image';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface Photo {
  id: string;
  title: string | null;
  watermarked_url: string;
  thumbnail_url: string | null;
  price: number;
  created_at: string;
  campaign_id: string;
  sub_event_id: string | null;
  has_sales: boolean;
  campaign: { title: string };
  sub_event?: { title: string } | null;
}

interface Campaign {
  id: string;
  title: string;
}

interface SubEvent {
  id: string;
  title: string;
  campaign_id: string;
}

const PHOTOS_PER_PAGE = 24;

const ManagePhotos = () => {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [subEvents, setSubEvents] = useState<SubEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [filterCampaign, setFilterCampaign] = useState<string>('all');
  const [filterAlbum, setFilterAlbum] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const totalPages = Math.max(1, Math.ceil(totalCount / PHOTOS_PER_PAGE));

  const fetchPhotos = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      // Count query
      let countQuery = supabase
        .from('photos')
        .select('id', { count: 'exact', head: true })
        .eq('photographer_id', user.id)
        .eq('is_available', true);

      if (filterCampaign !== 'all') countQuery = countQuery.eq('campaign_id', filterCampaign);
      if (filterAlbum !== 'all') {
        if (filterAlbum === 'no_album') {
          countQuery = countQuery.is('sub_event_id', null);
        } else {
          countQuery = countQuery.eq('sub_event_id', filterAlbum);
        }
      }

      const { count } = await countQuery;
      setTotalCount(count || 0);

      // Data query with pagination
      const from = (currentPage - 1) * PHOTOS_PER_PAGE;
      const to = from + PHOTOS_PER_PAGE - 1;

      let query = supabase
        .from('photos')
        .select(`
          id, title, watermarked_url, thumbnail_url, price, created_at, campaign_id, sub_event_id,
          campaign:campaigns(title),
          sub_event:sub_events(title)
        `)
        .eq('photographer_id', user.id)
        .eq('is_available', true)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (filterCampaign !== 'all') query = query.eq('campaign_id', filterCampaign);
      if (filterAlbum !== 'all') {
        if (filterAlbum === 'no_album') {
          query = query.is('sub_event_id', null);
        } else {
          query = query.eq('sub_event_id', filterAlbum);
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      // Check sales
      const photoIds = (data || []).map(p => p.id);
      let salesMap: Record<string, boolean> = {};
      if (photoIds.length > 0) {
        const { data: salesData } = await supabase
          .from('purchases')
          .select('photo_id')
          .in('photo_id', photoIds)
          .eq('status', 'completed');
        const soldIds = new Set((salesData || []).map(s => s.photo_id));
        photoIds.forEach(id => { salesMap[id] = soldIds.has(id); });
      }

      setPhotos((data || []).map(p => ({
        ...p,
        has_sales: salesMap[p.id] || false,
        campaign: p.campaign as any as { title: string },
        sub_event: p.sub_event as any as { title: string } | null,
      })));
    } catch (error) {
      console.error('Error fetching photos:', error);
      toast.error('Erro ao carregar fotos');
    } finally {
      setLoading(false);
    }
  }, [user?.id, filterCampaign, filterAlbum, currentPage]);

  const fetchCampaigns = useCallback(async () => {
    if (!user?.id) return;
    const { data: assignments } = await supabase
      .from('campaign_photographers')
      .select('campaign_id, campaign:campaigns(id, title)')
      .eq('photographer_id', user.id)
      .eq('is_active', true);

    const { data: ownedCampaigns } = await supabase
      .from('campaigns')
      .select('id, title')
      .eq('photographer_id', user.id);

    const uniqueCampaigns = new Map<string, Campaign>();
    (assignments || []).forEach((a: any) => {
      if (a.campaign?.id) uniqueCampaigns.set(a.campaign.id, { id: a.campaign.id, title: a.campaign.title });
    });
    (ownedCampaigns || []).forEach((c: any) => {
      if (c.id) uniqueCampaigns.set(c.id, { id: c.id, title: c.title });
    });
    setCampaigns(Array.from(uniqueCampaigns.values()));
  }, [user?.id]);

  // Fetch sub_events when campaign filter changes
  const fetchSubEvents = useCallback(async () => {
    if (!user?.id || filterCampaign === 'all') {
      setSubEvents([]);
      setFilterAlbum('all');
      return;
    }
    const { data } = await supabase
      .from('sub_events')
      .select('id, title, campaign_id')
      .eq('campaign_id', filterCampaign)
      .eq('is_active', true)
      .order('title');
    setSubEvents(data || []);
    setFilterAlbum('all');
  }, [user?.id, filterCampaign]);

  useEffect(() => { if (user?.id) fetchCampaigns(); }, [user?.id, fetchCampaigns]);
  useEffect(() => { fetchSubEvents(); }, [fetchSubEvents]);
  useEffect(() => { if (user?.id) fetchPhotos(); }, [user?.id, filterCampaign, filterAlbum, currentPage, fetchPhotos]);

  // Reset page on filter change
  useEffect(() => { setCurrentPage(1); setSelectedPhotos(new Set()); }, [filterCampaign, filterAlbum]);

  const toggleSelect = (id: string) => {
    setSelectedPhotos(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    const deletable = photos.filter(p => !p.has_sales).map(p => p.id);
    setSelectedPhotos(new Set(deletable));
  };

  const deselectAll = () => setSelectedPhotos(new Set());

  const handleDelete = async () => {
    if (selectedPhotos.size === 0) return;
    setDeleting(true);
    try {
      const ids = Array.from(selectedPhotos);
      const { error } = await supabase.from('photos').delete().in('id', ids);
      if (error) throw error;
      toast.success(`${ids.length} foto(s) excluída(s) com sucesso`);
      setSelectedPhotos(new Set());
      fetchPhotos();
    } catch (error: any) {
      console.error('Error deleting photos:', error);
      toast.error(error.message?.includes('vendas')
        ? 'Algumas fotos não puderam ser excluídas pois possuem vendas'
        : 'Erro ao excluir fotos');
    } finally {
      setDeleting(false);
    }
  };

  const selectedCount = selectedPhotos.size;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-foreground">Gerenciar Fotos</h1>
        <p className="text-muted-foreground">
          Selecione e exclua fotos enviadas por engano. Fotos com vendas não podem ser excluídas.
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={filterCampaign} onValueChange={setFilterCampaign}>
              <SelectTrigger className="w-full sm:w-[250px]">
                <SelectValue placeholder="Filtrar por evento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os eventos</SelectItem>
                {campaigns.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {filterCampaign !== 'all' && subEvents.length > 0 && (
              <Select value={filterAlbum} onValueChange={setFilterAlbum}>
                <SelectTrigger className="w-full sm:w-[250px]">
                  <FolderOpen className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Filtrar por álbum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os álbuns</SelectItem>
                  <SelectItem value="no_album">Sem álbum</SelectItem>
                  {subEvents.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAll}>
                <CheckSquare className="h-4 w-4 mr-1" />
                Selecionar tudo
              </Button>
              <Button variant="outline" size="sm" onClick={deselectAll}>
                <Square className="h-4 w-4 mr-1" />
                Limpar
              </Button>
            </div>

            {selectedCount > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={deleting}>
                    {deleting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}
                    Excluir {selectedCount} foto(s)
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      Confirmar exclusão
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja excluir {selectedCount} foto(s)?
                      Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Sim, excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      {!loading && (
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{totalCount} foto(s) no total</span>
          {selectedCount > 0 && (
            <Badge variant="secondary">{selectedCount} selecionada(s)</Badge>
          )}
          <span className="ml-auto">Página {currentPage} de {totalPages}</span>
        </div>
      )}

      {/* Photo Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {[...Array(PHOTOS_PER_PAGE)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <Card className="py-12 text-center">
          <Image className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-medium mb-2 text-foreground">Nenhuma foto encontrada</h3>
          <p className="text-muted-foreground">
            {filterCampaign !== 'all' ? 'Nenhuma foto neste evento/álbum' : 'Você ainda não enviou fotos'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {photos.map((photo) => {
            const isSelected = selectedPhotos.has(photo.id);
            return (
              <Card
                key={photo.id}
                className={`overflow-hidden cursor-pointer transition-all duration-200 ${
                  isSelected ? 'ring-2 ring-destructive shadow-lg' : 'hover:shadow-md'
                } ${photo.has_sales ? 'opacity-60' : ''}`}
                onClick={() => !photo.has_sales && toggleSelect(photo.id)}
              >
                <div className="aspect-square relative bg-muted">
                  <LazyImage
                    src={photo.thumbnail_url || photo.watermarked_url}
                    alt={photo.title || 'Foto'}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2">
                    <Checkbox
                      checked={isSelected}
                      disabled={photo.has_sales}
                      className="h-5 w-5 bg-background/80 border-2"
                      onClick={(e) => e.stopPropagation()}
                      onCheckedChange={() => !photo.has_sales && toggleSelect(photo.id)}
                    />
                  </div>
                  {photo.has_sales && (
                    <div className="absolute top-2 right-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                      VENDIDA
                    </div>
                  )}
                </div>
                <CardContent className="p-2">
                  <p className="text-xs text-muted-foreground truncate">{photo.campaign?.title}</p>
                  {photo.sub_event?.title && (
                    <p className="text-[10px] text-muted-foreground/70 truncate flex items-center gap-1">
                      <FolderOpen className="h-3 w-3" />
                      {photo.sub_event.title}
                    </p>
                  )}
                  <p className="text-xs font-medium text-foreground">
                    R$ {photo.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage(p => p - 1)}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Anterior
          </Button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(page => {
                if (totalPages <= 7) return true;
                if (page === 1 || page === totalPages) return true;
                if (Math.abs(page - currentPage) <= 1) return true;
                return false;
              })
              .map((page, idx, arr) => {
                const showEllipsis = idx > 0 && page - arr[idx - 1] > 1;
                return (
                  <span key={page} className="flex items-center">
                    {showEllipsis && <span className="px-2 text-muted-foreground">…</span>}
                    <Button
                      variant={page === currentPage ? 'default' : 'outline'}
                      size="sm"
                      className="w-9 h-9 p-0"
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  </span>
                );
              })}
          </div>

          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(p => p + 1)}
          >
            Próximo
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default ManagePhotos;
