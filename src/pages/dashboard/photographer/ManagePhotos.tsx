import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Image, Trash2, AlertTriangle, CheckSquare, Square, Loader2 } from 'lucide-react';
import { SkeletonCard } from '@/components/ui/skeleton-card';
import { LazyImage } from '@/components/ui/lazy-image';
import { toast } from 'sonner';

interface Photo {
  id: string;
  title: string | null;
  watermarked_url: string;
  thumbnail_url: string | null;
  price: number;
  created_at: string;
  campaign_id: string;
  has_sales: boolean;
  campaign: {
    title: string;
  };
}

interface Campaign {
  id: string;
  title: string;
}

const ManagePhotos = () => {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [filterCampaign, setFilterCampaign] = useState<string>('all');

  const fetchPhotos = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      let query = supabase
        .from('photos')
        .select(`
          id, title, watermarked_url, thumbnail_url, price, created_at, campaign_id,
          campaign:campaigns(title)
        `)
        .eq('photographer_id', user.id)
        .eq('is_available', true)
        .order('created_at', { ascending: false })
        .limit(100);

      if (filterCampaign !== 'all') {
        query = query.eq('campaign_id', filterCampaign);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Check which photos have sales
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
      })));
    } catch (error) {
      console.error('Error fetching photos:', error);
      toast.error('Erro ao carregar fotos');
    } finally {
      setLoading(false);
    }
  }, [user?.id, filterCampaign]);

  const fetchCampaigns = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('photos')
      .select('campaign_id, campaign:campaigns(id, title)')
      .eq('photographer_id', user.id)
      .eq('is_available', true);

    const uniqueCampaigns = new Map<string, Campaign>();
    (data || []).forEach((p: any) => {
      if (p.campaign?.id) {
        uniqueCampaigns.set(p.campaign.id, { id: p.campaign.id, title: p.campaign.title });
      }
    });
    setCampaigns(Array.from(uniqueCampaigns.values()));
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      fetchCampaigns();
    }
  }, [user?.id, fetchCampaigns]);

  useEffect(() => {
    if (user?.id) {
      fetchPhotos();
    }
  }, [user?.id, filterCampaign, fetchPhotos]);

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
      
      // Delete photos (trigger soft_delete_photos_with_sales will block sold ones)
      const { error } = await supabase
        .from('photos')
        .delete()
        .in('id', ids);

      if (error) throw error;

      toast.success(`${ids.length} foto(s) excluída(s) com sucesso`);
      setSelectedPhotos(new Set());
      fetchPhotos();
    } catch (error: any) {
      console.error('Error deleting photos:', error);
      if (error.message?.includes('vendas')) {
        toast.error('Algumas fotos não puderam ser excluídas pois possuem vendas');
      } else {
        toast.error('Erro ao excluir fotos');
      }
    } finally {
      setDeleting(false);
    }
  };

  const selectedCount = selectedPhotos.size;
  

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Gerenciar Fotos</h1>
        <p className="text-muted-foreground">
          Selecione e exclua fotos enviadas por engano. Fotos com vendas não podem ser excluídas.
        </p>
      </div>

      {/* Filters & Actions Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center w-full sm:w-auto">
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
          </div>

          {selectedCount > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={deleting}>
                  {deleting ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-1" />
                  )}
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
                    Esta ação não pode ser desfeita. Fotos com vendas registradas serão preservadas automaticamente.
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
        </CardContent>
      </Card>

      {/* Photo Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <Card className="py-12 text-center">
          <Image className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-medium mb-2">Nenhuma foto encontrada</h3>
          <p className="text-muted-foreground">
            {filterCampaign !== 'all' ? 'Nenhuma foto neste evento' : 'Você ainda não enviou fotos'}
          </p>
        </Card>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">{photos.length} foto(s) • {selectedCount} selecionada(s)</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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

                    {/* Checkbox overlay */}
                    <div className="absolute top-2 left-2">
                      <Checkbox
                        checked={isSelected}
                        disabled={photo.has_sales}
                        className="h-5 w-5 bg-background/80 border-2"
                        onClick={(e) => e.stopPropagation()}
                        onCheckedChange={() => !photo.has_sales && toggleSelect(photo.id)}
                      />
                    </div>

                    {/* Sales badge */}
                    {photo.has_sales && (
                      <div className="absolute top-2 right-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                        VENDIDA
                      </div>
                    )}
                  </div>

                  <CardContent className="p-2">
                    <p className="text-xs text-muted-foreground truncate">
                      {photo.campaign?.title}
                    </p>
                    <p className="text-xs font-medium">
                      R$ {photo.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default ManagePhotos;
