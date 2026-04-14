import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getTransformedImageUrl } from '@/lib/supabaseImageTransform';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, MapPin, Image, Trash2, Plus, Settings, Link2, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { SkeletonCard } from '@/components/ui/skeleton-card';
import { useToast } from '@/hooks/use-toast';
import CreateEventDialog from '@/components/modals/CreateEventDialog';
import { copyShareLink } from '@/lib/shareUtils';
import { formatCurrency } from '@/lib/utils';
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
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { toast } = useToast();

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
        .sort((a, b) => new Date(b.event_date || '1970-01-01').getTime() - new Date(a.event_date || '1970-01-01').getTime());
      
      const campaignsWithCount = allCampaigns.map(campaign => ({
        ...campaign,
        photo_count: campaign.photos?.[0]?.count || 0
      }));

      // Fetch revenue data for each campaign
      const campaignIds = campaignsWithCount.map(c => c.id);
      if (campaignIds.length > 0) {
        const { data: revenueData } = await supabase
          .from('revenue_shares')
          .select('photographer_amount, purchase_id')
          .eq('photographer_id', user!.id)
          .in('purchase_id', 
            (await supabase
              .from('purchases')
              .select('id, photo_id')
              .eq('status', 'completed')
              .eq('photographer_id', user!.id)
            ).data?.map(p => p.id) || []
          );

        // Get photo->campaign mapping
        const { data: photosCampaignMap } = await supabase
          .from('photos')
          .select('id, campaign_id')
          .in('campaign_id', campaignIds);

        const { data: purchasesData } = await supabase
          .from('purchases')
          .select('id, photo_id')
          .eq('status', 'completed')
          .eq('photographer_id', user!.id);

        const photoToCampaign = new Map((photosCampaignMap || []).map(p => [p.id, p.campaign_id]));
        const purchaseToPhoto = new Map((purchasesData || []).map(p => [p.id, p.photo_id]));
        
        const revenueMap: Record<string, { amount: number; count: number }> = {};
        (revenueData || []).forEach(rs => {
          const photoId = purchaseToPhoto.get(rs.purchase_id);
          const campaignId = photoId ? photoToCampaign.get(photoId) : null;
          if (campaignId) {
            if (!revenueMap[campaignId]) revenueMap[campaignId] = { amount: 0, count: 0 };
            revenueMap[campaignId].amount += Number(rs.photographer_amount);
            revenueMap[campaignId].count += 1;
          }
        });

        campaignsWithCount.forEach(c => {
          const rev = revenueMap[c.id];
          if (rev) {
            c.revenue = rev.amount;
            c.sales_count = rev.count;
          }
        });
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

  const handleEventCreated = () => {
    setShowCreateDialog(false);
    fetchMyCampaigns();
    toast({
      title: "Evento criado!",
      description: "Seu evento foi criado com sucesso.",
    });
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Meus Eventos</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie seus eventos e faça upload de fotos
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} size="lg">
          <Plus className="h-5 w-5 mr-2" />
          Criar Evento
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Calendar className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2 text-foreground">Nenhum evento ainda</h3>
            <p className="text-muted-foreground mb-6">Crie seu primeiro evento para começar</p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-5 w-5 mr-2" />
              Criar Primeiro Evento
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((campaign) => (
            <Card key={campaign.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="relative h-48 bg-muted">
                {campaign.cover_image_url ? (
                  <img
                    src={getTransformedImageUrl(campaign.cover_image_url, 'medium')}
                    alt={campaign.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                    <Image className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
              </div>
              <CardHeader>
                <CardTitle className="text-foreground">{campaign.title}</CardTitle>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(campaign.event_date).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span className="truncate">{campaign.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Image className="h-4 w-4" />
                    <span>{campaign.photo_count || 0} fotos</span>
                  </div>
                  {(campaign.revenue ?? 0) > 0 && (
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-medium">
                      <DollarSign className="h-4 w-4" />
                      <span>{formatCurrency(campaign.revenue!)} ({campaign.sales_count} venda{campaign.sales_count !== 1 ? 's' : ''})</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="flex gap-2">
                  <Button asChild className="flex-1" variant="default">
                    <Link to={`/dashboard/photographer/manage-event/${campaign.id}`}>
                      <Settings className="h-4 w-4 mr-2" />
                      Gerenciar Evento
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    title="Copiar link do evento"
                    onClick={async () => {
                      const copied = await copyShareLink(campaign);
                      toast({
                        title: copied ? "🔗 Link copiado!" : "Erro ao copiar",
                        description: copied ? "Cole no WhatsApp ou onde quiser compartilhar." : "Tente copiar manualmente.",
                        variant: copied ? "default" : "destructive",
                      });
                    }}
                  >
                    <Link2 className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="icon"
                      disabled={deleting === campaign.id}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja excluir este evento? Todas as fotos serão removidas permanentemente.
                        Esta ação não pode ser desfeita.
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
                <div className="text-xs text-muted-foreground text-center">
                  💡 Gerencie fotos, álbuns e configurações do evento
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateEventDialog 
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onEventCreated={handleEventCreated}
      />
    </div>
  );
};

export default PhotographerEvents;
