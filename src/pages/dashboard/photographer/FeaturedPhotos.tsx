import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Star, Trash2, CheckSquare, Square, Info } from 'lucide-react';
import WatermarkedPhoto from '@/components/WatermarkedPhoto';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const MAX_FEATURED_PHOTOS = 15;

interface FeaturedPhoto {
  id: string;
  title: string | null;
  watermarked_url: string;
  thumbnail_url: string | null;
  campaign_id: string;
  created_at: string;
  campaign: {
    title: string;
    event_date: string | null;
  };
}

const FeaturedPhotos = () => {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<FeaturedPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [removing, setRemoving] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchFeaturedPhotos();
    }
  }, [user?.id]);

  const fetchFeaturedPhotos = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('photos')
        .select(`
          id,
          title,
          watermarked_url,
          thumbnail_url,
          campaign_id,
          created_at,
          campaign:campaigns!inner (
            title,
            event_date
          )
        `)
        .eq('photographer_id', user.id)
        .eq('is_featured', true)
        .eq('is_available', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPhotos(data || []);
    } catch (error) {
      console.error('Error fetching featured photos:', error);
      toast.error('Erro ao carregar fotos em destaque');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedPhotos.size === photos.length) {
      setSelectedPhotos(new Set());
    } else {
      setSelectedPhotos(new Set(photos.map(p => p.id)));
    }
  };

  const handleSelectPhoto = (photoId: string) => {
    const newSelected = new Set(selectedPhotos);
    if (newSelected.has(photoId)) {
      newSelected.delete(photoId);
    } else {
      newSelected.add(photoId);
    }
    setSelectedPhotos(newSelected);
  };

  const handleRemoveSelected = async () => {
    if (selectedPhotos.size === 0) return;

    try {
      setRemoving(true);

      const { error } = await supabase
        .from('photos')
        .update({ is_featured: false })
        .in('id', Array.from(selectedPhotos));

      if (error) throw error;

      toast.success(`${selectedPhotos.size} foto(s) removida(s) dos destaques`);
      setSelectedPhotos(new Set());
      setShowRemoveDialog(false);
      fetchFeaturedPhotos();
    } catch (error) {
      console.error('Error removing featured photos:', error);
      toast.error('Erro ao remover fotos dos destaques');
    } finally {
      setRemoving(false);
    }
  };

  const remainingSlots = MAX_FEATURED_PHOTOS - photos.length;

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-square bg-muted rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <Star className="h-8 w-8 text-yellow-500 fill-yellow-500" />
              Fotos em Destaque
            </h1>
            <p className="text-muted-foreground">
              Gerencie suas fotos que aparecem na página de destaques
            </p>
          </div>

          <div className="text-right">
            <Badge 
              variant={remainingSlots > 5 ? "default" : remainingSlots > 0 ? "secondary" : "destructive"}
              className="text-lg px-4 py-2"
            >
              {photos.length}/{MAX_FEATURED_PHOTOS}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">
              {remainingSlots > 0 
                ? `${remainingSlots} vagas disponíveis` 
                : 'Limite atingido'}
            </p>
          </div>
        </div>

        {/* Info Alert */}
        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Limite: {MAX_FEATURED_PHOTOS} fotos</strong>
            <br />
            As fotos em destaque aparecem na página principal de destaques do site. 
            Escolha suas melhores fotos para atrair mais clientes!
            {remainingSlots === 0 && (
              <span className="text-destructive block mt-2">
                ⚠️ Você atingiu o limite máximo. Remova algumas fotos para adicionar novas.
              </span>
            )}
          </AlertDescription>
        </Alert>

        {/* Bulk Actions */}
        {photos.length > 0 && (
          <div className="flex items-center gap-4 bg-muted/50 p-4 rounded-lg">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              className="gap-2"
            >
              {selectedPhotos.size === photos.length ? (
                <>
                  <Square className="h-4 w-4" />
                  Desmarcar Todas
                </>
              ) : (
                <>
                  <CheckSquare className="h-4 w-4" />
                  Selecionar Todas
                </>
              )}
            </Button>

            {selectedPhotos.size > 0 && (
              <>
                <Badge variant="secondary" className="text-sm">
                  {selectedPhotos.size} selecionada(s)
                </Badge>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowRemoveDialog(true)}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Remover Selecionadas
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Photos Grid */}
      {photos.length === 0 ? (
        <Card className="p-12 text-center">
          <Star className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-medium mb-2">Nenhuma foto em destaque</h3>
          <p className="text-muted-foreground mb-6">
            Vá até seus eventos e clique na estrela ⭐ nas fotos para marcá-las como destaque
          </p>
          <Button onClick={() => window.location.href = '/#/dashboard/photographer/events'}>
            Ver Meus Eventos
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {photos.map((photo) => (
            <Card key={photo.id} className="overflow-hidden group relative">
              {/* Checkbox */}
              <div className="absolute top-2 left-2 z-10">
                <Checkbox
                  checked={selectedPhotos.has(photo.id)}
                  onCheckedChange={() => handleSelectPhoto(photo.id)}
                  className="h-5 w-5 bg-background/80 backdrop-blur-sm border-2"
                />
              </div>

              {/* Featured Badge */}
              <div className="absolute top-2 right-2 z-10">
                <Badge className="bg-yellow-500 text-white border-0">
                  <Star className="h-3 w-3 mr-1 fill-white" />
                  Destaque
                </Badge>
              </div>

              {/* Photo */}
              <div className="aspect-square bg-muted relative">
                  <WatermarkedPhoto
                    src={photo.thumbnail_url || photo.watermarked_url}
                    alt={photo.title || 'Foto'}
                    imgClassName="w-full h-full object-cover"
                  />
              </div>

              {/* Info */}
              <CardContent className="p-3">
                <p className="text-sm font-medium truncate mb-1">
                  {photo.title || 'Sem título'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {photo.campaign.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(photo.created_at).toLocaleDateString('pt-BR')}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Remove Dialog */}
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover dos destaques?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedPhotos.size === 1 
                ? 'Esta foto será removida dos destaques e não aparecerá mais na página principal.'
                : `${selectedPhotos.size} fotos serão removidas dos destaques.`
              }
              <br />
              Você poderá marcá-las novamente a qualquer momento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveSelected}
              disabled={removing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removing ? 'Removendo...' : 'Remover dos Destaques'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FeaturedPhotos;
