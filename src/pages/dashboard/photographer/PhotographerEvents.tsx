import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getTransformedImageUrl } from '@/lib/supabaseImageTransform';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Calendar, MapPin, Image, Trash2, Plus, Link2, QrCode, Camera, Search, ChevronLeft, ChevronRight, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import CreateEventDialog from '@/components/modals/CreateEventDialog';
import UploadPhotoModal from '@/components/modals/UploadPhotoModal';
import { copyShareLink, generateShareLink } from '@/lib/shareUtils';
import { formatCurrency } from '@/lib/utils';
import { QRCodeSVG } from 'qrcode.react';
import { useRef } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { parseLocalDate, formatEventDate } from "@/lib/dateUtils";

interface Campaign {
  id: string;
  short_code?: string;
  title: string;
  description: string;
  event_date: string;
  location: string;
  cover_image_url: string;
  photo_count?: number;
  revenue?: number;
  sales_count?: number;
}

const PhotographerEvents = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const pageSize = isMobile ? 5 : 8;
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadCampaignId, setUploadCampaignId] = useState<string>('');
  const [qrTarget, setQrTarget] = useState<Campaign | null>(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const qrRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!qrTarget || !qrRef.current) return;
    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const img = document.createElement('img');
    img.onload = () => {
      try {
        canvas.width = 512; canvas.height = 512;
        if (ctx) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 512, 512); ctx.drawImage(img, 0, 0, 512, 512); }
        const a = document.createElement('a');
        a.download = `qrcode-${qrTarget.title.replace(/\s+/g, '-').toLowerCase()}.png`;
        a.href = canvas.toDataURL('image/png');
        a.click();
      } catch { toast({ title: 'Erro ao gerar QR Code', variant: 'destructive' }); }
      finally { setQrTarget(null); }
    };
    img.onerror = () => { toast({ title: 'Erro ao gerar QR Code', variant: 'destructive' }); setQrTarget(null); };
    img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`;
  }, [qrTarget, toast]);

  useEffect(() => {
    if (user?.id) {
      fetchMyCampaigns();
    }
  }, [user?.id]);

  const fetchMyCampaigns = async () => {
    if (!user?.id) return;
    
    try {
      // Buscar eventos onde o fotógrafo é dono
      const { data: ownedCampaigns, error: ownedError } = await supabase
        .from('campaigns')
        .select(`
          *,
          photos(count)
        `)
        .eq('photographer_id', user.id)
        .order('event_date', { ascending: false, nullsFirst: false })
        .range(0, 49);

      if (ownedError) throw ownedError;

      // Buscar eventos onde o fotógrafo está atribuído (via campaign_photographers)
      const { data: assignedCampaignIds, error: assignedError } = await supabase
        .from('campaign_photographers')
        .select('campaign_id')
        .eq('photographer_id', user.id)
        .eq('is_active', true);

      if (assignedError) throw assignedError;

      // IDs de campanhas atribuídas que não são de propriedade
      const assignedIds = (assignedCampaignIds || [])
        .map(a => a.campaign_id)
        .filter(id => !ownedCampaigns?.some(c => c.id === id));

      let assignedCampaigns: any[] = [];
      if (assignedIds.length > 0) {
        const { data, error } = await supabase
          .from('campaigns')
          .select(`
            *,
            photos(count)
          `)
          .in('id', assignedIds)
          .order('event_date', { ascending: false, nullsFirst: false });

        if (error) throw error;
        assignedCampaigns = data || [];
      }

      // Combinar e ordenar
      const allCampaigns = [...(ownedCampaigns || []), ...assignedCampaigns]
        .sort((a, b) => (parseLocalDate(b.event_date || '1970-01-01') || new Date(0)).getTime() - (parseLocalDate(a.event_date || '1970-01-01') || new Date(0)).getTime());
      
      const campaignsWithCount = allCampaigns.map(campaign => ({
        ...campaign,
        photo_count: campaign.photos?.[0]?.count || 0,
        revenue: 0,
        sales_count: 0,
      }));

      // Buscar receita real usando a mesma query do dashboard principal
      const campaignIds = campaignsWithCount.map(c => c.id);
      if (campaignIds.length > 0) {
        const { data: completedPurchases, error: revenueError } = await supabase
          .from('purchases')
          .select('amount, photos!inner(campaign_id)')
          .eq('photographer_id', user!.id)
          .eq('status', 'completed')
          .in('photos.campaign_id', campaignIds);

        if (!revenueError) {
          const revenueMap: Record<string, { amount: number; count: number }> = {};
          (completedPurchases || []).forEach((purchase: any) => {
            const campaignId = purchase.photos?.campaign_id;
            if (!campaignId) return;
            if (!revenueMap[campaignId]) revenueMap[campaignId] = { amount: 0, count: 0 };
            revenueMap[campaignId].amount += Number(purchase.amount || 0);
            revenueMap[campaignId].count += 1;
          });

          campaignsWithCount.forEach(c => {
            const rev = revenueMap[c.id];
            if (rev) {
              c.revenue = rev.amount;
              c.sales_count = rev.count;
            }
          });
        }
      }
      
      setCampaigns(campaignsWithCount);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast({
        title: "Erro ao carregar eventos",
        description: "Não foi possível carregar seus eventos. Tente novamente.",
        variant: "destructive",
      });
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

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Reset page on search change
  const handleSearch = (val: string) => {
    setSearch(val);
    setCurrentPage(1);
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    try {
      setDeleting(campaignId);
      
      // Verificar se há compras/vendas associadas através das fotos
      const { data: photosWithPurchases, error: purchaseError } = await supabase
        .from('photos')
        .select('id, purchases(id)')
        .eq('campaign_id', campaignId)
        .limit(100);

      if (purchaseError) {
        console.error('Error checking purchases:', purchaseError);
        throw new Error('Erro ao verificar vendas do evento');
      }

      // Verificar se alguma foto tem compras
      const hasPurchases = photosWithPurchases?.some(
        (photo: any) => photo.purchases && photo.purchases.length > 0
      );

      if (hasPurchases) {
        toast({
          title: "Não é possível excluir",
          description: "Este evento já possui vendas registradas e não pode ser excluído por questões de histórico financeiro.",
          variant: "destructive",
        });
        setDeleting(null);
        return;
      }

      // Deletar álbuns (sub_events) - CASCADE vai cuidar das fotos
      const { error: albumsError } = await supabase
        .from('sub_events')
        .delete()
        .eq('campaign_id', campaignId);

      if (albumsError) {
        console.error('Error deleting albums:', albumsError);
        // Continuar mesmo com erro, pois podem não existir álbuns
      }

      // Deletar fotos diretamente (caso não estejam em álbuns)
      const { error: photosError } = await supabase
        .from('photos')
        .delete()
        .eq('campaign_id', campaignId);

      if (photosError) {
        console.error('Error deleting photos:', photosError);
        // Continuar mesmo com erro
      }

      // Deletar a campanha
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', campaignId);

      if (error) {
        console.error('Error deleting campaign:', error);
        throw new Error(error.message || 'Falha ao excluir evento');
      }

      toast({
        title: "✅ Evento excluído",
        description: "O evento foi excluído com sucesso.",
      });

      // Atualizar lista
      setCampaigns(campaigns.filter(c => c.id !== campaignId));
    } catch (error: any) {
      console.error('Error deleting campaign:', error);
      toast({
        title: "Erro ao excluir",
        description: error.message || "Não foi possível excluir o evento. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setDeleting(null);
    }
  };

  const handleEventCreated = (campaignId?: string, startUploadNow?: boolean) => {
    setShowCreateDialog(false);
    fetchMyCampaigns();
    if (startUploadNow && campaignId) {
      setUploadCampaignId(campaignId);
      setShowUploadModal(true);
    }
    toast({
      title: "Evento criado!",
      description: startUploadNow
        ? "Evento criado. Agora envie suas fotos e organize em pastas."
        : "Seu evento foi criado com sucesso.",
    });
  };

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Meus Eventos</h1>
          <p className="text-sm text-muted-foreground">
            {search ? `${filtered.length} de ${campaigns.length}` : campaigns.length} evento{campaigns.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Criar Evento
        </Button>
      </div>

      {/* Search */}
      {campaigns.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou local..."
            value={search}
            onChange={e => handleSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      )}

      {campaigns.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Camera className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <h3 className="text-lg font-semibold mb-1 text-foreground">Nenhum evento ainda</h3>
            <p className="text-sm text-muted-foreground mb-5">Crie seu primeiro evento para começar</p>
            <Button onClick={() => setShowCreateDialog(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Criar Evento
            </Button>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-foreground">Nenhum resultado para "{search}"</p>
            <Button variant="ghost" size="sm" className="mt-3" onClick={() => handleSearch('')}>Limpar busca</Button>
          </CardContent>
        </Card>
      ) : (
        <>
        <div className="space-y-3">
          {paginated.map((campaign) => {
            const isPast = campaign.event_date
              ? (parseLocalDate(campaign.event_date) ?? new Date()) < new Date()
              : false;

            return (
              <Card
                key={campaign.id}
                className="overflow-hidden hover:shadow-md hover:border-primary/20 transition-all duration-200 group cursor-pointer"
                onClick={() => navigate(`/dashboard/photographer/album-reports?campaign=${campaign.id}`)}
              >
                <CardContent className="p-0">
                  <div className="flex items-stretch">
                    {/* Thumbnail */}
                    <div className="w-20 sm:w-28 flex-shrink-0 relative overflow-hidden bg-muted">
                      {campaign.cover_image_url ? (
                        <img
                          src={getTransformedImageUrl(campaign.cover_image_url, 'thumbnail')}
                          alt={campaign.title}
                          className="h-full w-full object-cover"
                          loading="lazy"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                          <Camera className="h-6 w-6 text-muted-foreground/50" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-2 sm:p-3 flex flex-col justify-between gap-1.5 min-w-0">
                      {/* Title + Revenue no canto direito */}
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-xs sm:text-sm text-foreground leading-tight line-clamp-2 flex-1">{campaign.title}</h4>
                        <span className={`text-xs sm:text-sm font-bold flex-shrink-0 tabular-nums ${
                          (campaign.revenue ?? 0) > 0 ? 'text-green-700 dark:text-green-400' : 'text-muted-foreground'
                        }`}>
                          {formatCurrency(campaign.revenue ?? 0)}
                        </span>
                      </div>

                      {/* Info row */}
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] sm:text-xs text-muted-foreground">
                        {campaign.event_date && (
                          <span className="flex items-center gap-0.5">
                            <Calendar className="h-3 w-3 flex-shrink-0" />
                            {formatEventDate(campaign.event_date)}
                          </span>
                        )}
                        {campaign.location && (
                          <span className="flex items-center gap-0.5 truncate max-w-[150px]">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            {campaign.location}
                          </span>
                        )}
                        <span className="flex items-center gap-0.5">
                          <Image className="h-3 w-3 flex-shrink-0" />
                          {campaign.photo_count ?? 0} foto{(campaign.photo_count ?? 0) !== 1 ? 's' : ''}
                        </span>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 pt-0.5">
                        {/* Share dropdown */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 gap-1 text-[11px] sm:text-xs px-2 flex-shrink-0"
                              onClick={e => e.stopPropagation()}
                            >
                              <Share2 className="h-3 w-3" />
                              <span className="hidden sm:inline">Compartilhar</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuItem
                              onClick={async (e) => {
                                e.stopPropagation();
                                const copied = await copyShareLink(campaign);
                                toast({ title: copied ? '🔗 Link copiado!' : 'Erro ao copiar', variant: copied ? 'default' : 'destructive' });
                              }}
                            >
                              <Link2 className="h-4 w-4 mr-2" />
                              Copiar link
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setQrTarget(campaign);
                              }}
                            >
                              <QrCode className="h-4 w-4 mr-2" />
                              Baixar QR Code
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        <div className="flex-1" />

                        {/* Delete */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 flex-shrink-0 text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                              disabled={deleting === campaign.id}
                              title="Excluir evento"
                              onClick={e => e.stopPropagation()}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir este evento? Todas as fotos serão removidas permanentemente. Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteCampaign(campaign.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-muted-foreground">
              Pág. {currentPage}/{totalPages} • {filtered.length} eventos
            </p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-7 w-7" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .map((p, idx, arr) => (
                  <>
                    {idx > 0 && arr[idx - 1] !== p - 1 && <span key={`ellipsis-${p}`} className="text-xs text-muted-foreground px-0.5">…</span>}
                    <Button key={p} variant={p === currentPage ? 'default' : 'outline'} size="icon" className="h-7 w-7 text-xs" onClick={() => setCurrentPage(p)}>{p}</Button>
                  </>
                ))}
              <Button variant="outline" size="icon" className="h-7 w-7" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
        </>
      )}

      {/* QR Code hidden renderer */}
      {qrTarget && (
        <div className="absolute -left-[9999px] top-0">
          <div ref={qrRef} className="bg-white p-4">
            <QRCodeSVG value={generateShareLink(qrTarget)} size={256} includeMargin bgColor="#ffffff" fgColor="#000000" />
          </div>
        </div>
      )}

      <CreateEventDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onEventCreated={handleEventCreated}
      />

      {showUploadModal && (
        <UploadPhotoModal
          onClose={() => { setShowUploadModal(false); setUploadCampaignId(''); }}
          onUploadComplete={() => { fetchMyCampaigns(); }}
          initialCampaignId={uploadCampaignId}
        />
      )}
    </div>
  );
};

export default PhotographerEvents;
