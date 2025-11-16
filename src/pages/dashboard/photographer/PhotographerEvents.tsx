import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, MapPin, Image, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { SkeletonCard } from '@/components/ui/skeleton-card';
import { useToast } from '@/hooks/use-toast';
import CreateEventDialog from '@/components/modals/CreateEventDialog';
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
  title: string;
  description: string;
  event_date: string;
  location: string;
  cover_image_url: string;
  photo_count?: number;
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
      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          photos(count)
        `)
        .eq('photographer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const campaignsWithCount = (data || []).map(campaign => ({
        ...campaign,
        photo_count: campaign.photos?.[0]?.count || 0
      }));
      
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
      
      // Primeiro, deletar fotos associadas
      const { error: photosError } = await supabase
        .from('photos')
        .delete()
        .eq('campaign_id', campaignId)
        .eq('photographer_id', user?.id);

      if (photosError) {
        console.error('Error deleting photos:', photosError);
        // Continuar mesmo com erro nas fotos, pois elas podem não existir
      }

      // Por último, deletar a campanha
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', campaignId)
        .eq('photographer_id', user?.id);

      if (error) throw error;

      toast({
        title: "Evento excluído",
        description: "O evento foi excluído com sucesso.",
      });

      // Atualizar lista
      setCampaigns(campaigns.filter(c => c.id !== campaignId));
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir o evento. Tente novamente.",
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
                    src={campaign.cover_image_url}
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
                </div>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Button asChild className="flex-1" variant="default">
                  <Link to={`/campaign/${campaign.id}`}>
                    Ver Evento
                  </Link>
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
