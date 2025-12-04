import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  Image as ImageIcon, 
  FolderOpen, 
  Trash2, 
  Plus, 
  Upload,
  Settings,
  Eye,
  EyeOff,
  Star
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SkeletonCard } from '@/components/ui/skeleton-card';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import UploadPhotoModal from '@/components/modals/UploadPhotoModal';

interface Campaign {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  event_date: string;
  cover_image_url: string | null;
  short_code: string | null;
  photographer_id: string;
}

interface Album {
  id: string;
  title: string;
  description: string | null;
  photo_count: number;
  is_active: boolean;
}

interface Photo {
  id: string;
  title: string | null;
  watermarked_url: string;
  thumbnail_url: string | null;
  price: number;
  is_available: boolean;
  is_featured: boolean;
  sub_event_id: string | null;
  created_at: string;
}

const ManageEvent = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);
  
  // Album creation
  const [showCreateAlbumDialog, setShowCreateAlbumDialog] = useState(false);
  const [newAlbumTitle, setNewAlbumTitle] = useState('');
  const [newAlbumDescription, setNewAlbumDescription] = useState('');
  const [creatingAlbum, setCreatingAlbum] = useState(false);
  
  // Deleting states
  const [deletingPhoto, setDeletingPhoto] = useState<string | null>(null);
  const [deletingAlbum, setDeletingAlbum] = useState<string | null>(null);

  useEffect(() => {
    if (id && user) {
      fetchEventData();
    }
  }, [id, user]);

  useEffect(() => {
    if (campaign) {
      fetchPhotos();
    }
  }, [campaign, selectedAlbum]);

  const fetchEventData = async () => {
    if (!id || !user) return;

    try {
      setLoading(true);

      // Buscar campanha
      const { data: campaignData, error: campaignError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .eq('photographer_id', user.id)
        .single();

      if (campaignError) {
        throw new Error('Evento não encontrado ou você não tem permissão');
      }

      setCampaign(campaignData);

      // Buscar TODOS os álbuns (incluindo inativos)
      const { data: albumsData, error: albumsError } = await supabase
        .from('sub_events')
        .select('id, title, description, photo_count, is_active')
        .eq('campaign_id', id)
        .order('created_at', { ascending: false });

      if (albumsError) throw albumsError;
      setAlbums(albumsData || []);

    } catch (error: any) {
      console.error('Error fetching event:', error);
      toast({
        title: "Erro ao carregar evento",
        description: error.message,
        variant: "destructive",
      });
      navigate('/dashboard/photographer/events');
    } finally {
      setLoading(false);
    }
  };

  const fetchPhotos = async () => {
    if (!campaign) return;

    try {
      let query = supabase
        .from('photos')
        .select('id, title, watermarked_url, thumbnail_url, price, is_available, is_featured, sub_event_id, created_at')
        .eq('campaign_id', campaign.id)
        .order('created_at', { ascending: false });

      if (selectedAlbum) {
        query = query.eq('sub_event_id', selectedAlbum);
      }

      const { data, error } = await query;

      if (error) throw error;
      setPhotos(data || []);
    } catch (error) {
      console.error('Error fetching photos:', error);
      toast({
        title: "Erro ao carregar fotos",
        description: "Não foi possível carregar as fotos",
        variant: "destructive",
      });
    }
  };

  const handleCreateAlbum = async () => {
    if (!campaign || !newAlbumTitle.trim()) {
      toast({
        title: "Título obrigatório",
        description: "Por favor, informe o título do álbum",
        variant: "destructive",
      });
      return;
    }

    try {
      setCreatingAlbum(true);

      const { error } = await supabase
        .from('sub_events')
        .insert({
          campaign_id: campaign.id,
          title: newAlbumTitle.trim(),
          description: newAlbumDescription.trim() || null,
          is_active: false, // Começa inativo até ter 5+ fotos
          photo_count: 0
        });

      if (error) throw error;

      toast({
        title: "✅ Álbum criado",
        description: "Adicione fotos para ativá-lo (mínimo 5 fotos)",
      });

      setNewAlbumTitle('');
      setNewAlbumDescription('');
      setShowCreateAlbumDialog(false);
      fetchEventData();
    } catch (error: any) {
      console.error('Error creating album:', error);
      toast({
        title: "Erro ao criar álbum",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCreatingAlbum(false);
    }
  };

  const handleDeleteAlbum = async (albumId: string, albumTitle: string) => {
    try {
      setDeletingAlbum(albumId);

      // Verificar se há fotos
      const album = albums.find(a => a.id === albumId);
      if (album && album.photo_count > 0) {
        toast({
          title: "⚠️ Álbum contém fotos",
          description: "Remova ou mova todas as fotos antes de excluir o álbum",
          variant: "destructive",
        });
        setDeletingAlbum(null);
        return;
      }

      const { error } = await supabase
        .from('sub_events')
        .delete()
        .eq('id', albumId);

      if (error) throw error;

      toast({
        title: "✅ Álbum excluído",
        description: `"${albumTitle}" foi removido com sucesso`,
      });

      if (selectedAlbum === albumId) {
        setSelectedAlbum(null);
      }

      fetchEventData();
    } catch (error: any) {
      console.error('Error deleting album:', error);
      toast({
        title: "Erro ao excluir álbum",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeletingAlbum(null);
    }
  };

  const handleTogglePhotoAvailability = async (photoId: string, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from('photos')
        .update({ is_available: !currentValue })
        .eq('id', photoId);

      if (error) throw error;

      toast({
        title: currentValue ? "Foto ocultada" : "Foto publicada",
        description: currentValue 
          ? "A foto não aparecerá mais na galeria" 
          : "A foto agora está visível na galeria",
      });

      fetchPhotos();
    } catch (error: any) {
      console.error('Error toggling photo availability:', error);
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleToggleFeatured = async (photoId: string, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from('photos')
        .update({ is_featured: !currentValue })
        .eq('id', photoId);

      if (error) throw error;

      toast({
        title: currentValue ? "Removido dos destaques" : "Adicionado aos destaques",
        description: currentValue 
          ? "A foto não aparecerá mais na página inicial" 
          : "A foto agora aparece na página inicial",
      });

      fetchPhotos();
    } catch (error: any) {
      console.error('Error toggling featured:', error);
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    try {
      setDeletingPhoto(photoId);

      // Verificar se há compras
      const { data: purchases, error: purchaseError } = await supabase
        .from('purchases')
        .select('id')
        .eq('photo_id', photoId)
        .limit(1);

      if (purchaseError) throw purchaseError;

      if (purchases && purchases.length > 0) {
        toast({
          title: "Não é possível excluir",
          description: "Esta foto já foi vendida e não pode ser excluída",
          variant: "destructive",
        });
        setDeletingPhoto(null);
        return;
      }

      const { error } = await supabase
        .from('photos')
        .delete()
        .eq('id', photoId);

      if (error) throw error;

      toast({
        title: "✅ Foto excluída",
        description: "A foto foi removida com sucesso",
      });

      fetchPhotos();
      fetchEventData(); // Atualizar contadores
    } catch (error: any) {
      console.error('Error deleting photo:', error);
      toast({
        title: "Erro ao excluir foto",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeletingPhoto(null);
    }
  };

  const handleMovePhoto = async (photoId: string, newAlbumId: string | null) => {
    try {
      const { error } = await supabase
        .from('photos')
        .update({ sub_event_id: newAlbumId })
        .eq('id', photoId);

      if (error) throw error;

      toast({
        title: "✅ Foto movida",
        description: newAlbumId 
          ? "Foto movida para outro álbum" 
          : "Foto movida para 'Sem álbum'",
      });

      fetchPhotos();
      fetchEventData();
    } catch (error: any) {
      console.error('Error moving photo:', error);
      toast({
        title: "Erro ao mover foto",
        description: error.message,
        variant: "destructive",
      });
    }
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

  if (!campaign) {
    return (
      <div className="p-6">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">Evento não encontrado</h2>
          <p className="text-muted-foreground mb-4">
            O evento não existe ou você não tem permissão para gerenciá-lo
          </p>
          <Button asChild>
            <Link to="/dashboard/photographer/events">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar aos meus eventos
            </Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <Button variant="ghost" size="sm" asChild className="mb-2">
            <Link to="/dashboard/photographer/events">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar aos eventos
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">{campaign.title}</h1>
          <div className="flex flex-wrap items-center gap-4 mt-2 text-muted-foreground">
            {campaign.event_date && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{new Date(campaign.event_date).toLocaleDateString('pt-BR')}</span>
              </div>
            )}
            {campaign.location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>{campaign.location}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              <span>{photos.length} fotos</span>
            </div>
            <div className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              <span>{albums.length} álbuns</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={() => setShowUploadModal(true)} className="gap-2">
            <Upload className="h-4 w-4" />
            Upload Fotos
          </Button>
          <Button variant="outline" asChild className="gap-2">
            <Link to={campaign.short_code ? `/E/${campaign.short_code}` : `/campaign/${campaign.id}`} target="_blank">
              <Eye className="h-4 w-4" />
              Ver Galeria
            </Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="photos" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="photos">
            <ImageIcon className="h-4 w-4 mr-2" />
            Fotos ({photos.length})
          </TabsTrigger>
          <TabsTrigger value="albums">
            <FolderOpen className="h-4 w-4 mr-2" />
            Álbuns ({albums.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab: Fotos */}
        <TabsContent value="photos" className="space-y-4">
          {/* Filtro por álbum */}
          <div className="flex items-center gap-2 flex-wrap">
            <Label>Filtrar por álbum:</Label>
            <Button
              variant={selectedAlbum === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedAlbum(null)}
            >
              Todas ({photos.length})
            </Button>
            <Button
              variant={selectedAlbum === 'none' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedAlbum('none')}
            >
              Sem álbum
            </Button>
            {albums.map(album => (
              <Button
                key={album.id}
                variant={selectedAlbum === album.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedAlbum(album.id)}
              >
                {album.title} ({album.photo_count})
              </Button>
            ))}
          </div>

          {/* Grid de fotos */}
          {photos.length === 0 ? (
            <Card className="p-12 text-center">
              <ImageIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">Nenhuma foto ainda</h3>
              <p className="text-muted-foreground mb-6">
                {selectedAlbum ? 'Este álbum não possui fotos' : 'Faça upload de fotos para começar'}
              </p>
              {!selectedAlbum && (
                <Button onClick={() => setShowUploadModal(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Fotos
                </Button>
              )}
            </Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {photos.map((photo) => (
                <Card key={photo.id} className="overflow-hidden group">
                  <div className="aspect-square relative">
                    <img
                      src={photo.thumbnail_url || photo.watermarked_url}
                      alt={photo.title || 'Foto'}
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Badges de status */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      {photo.is_featured && (
                        <Badge className="gap-1 bg-yellow-500">
                          <Star className="h-3 w-3" />
                          Destaque
                        </Badge>
                      )}
                      {!photo.is_available && (
                        <Badge variant="secondary" className="gap-1">
                          <EyeOff className="h-3 w-3" />
                          Oculta
                        </Badge>
                      )}
                    </div>

                    {/* Actions overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        size="icon"
                        variant="secondary"
                        onClick={() => handleTogglePhotoAvailability(photo.id, photo.is_available)}
                        title={photo.is_available ? 'Ocultar' : 'Publicar'}
                      >
                        {photo.is_available ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      
                      <Button
                        size="icon"
                        variant="secondary"
                        onClick={() => handleToggleFeatured(photo.id, photo.is_featured)}
                        title={photo.is_featured ? 'Remover destaque' : 'Destacar'}
                      >
                        <Star className={`h-4 w-4 ${photo.is_featured ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                      </Button>

                      {/* Mover para álbum */}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="icon" variant="secondary" title="Mover para álbum">
                            <FolderOpen className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Mover para álbum</DialogTitle>
                            <DialogDescription>
                              Escolha o álbum de destino para esta foto
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-2">
                            <Button
                              variant="outline"
                              className="w-full justify-start"
                              onClick={() => handleMovePhoto(photo.id, null)}
                            >
                              Sem álbum
                            </Button>
                            {albums.map(album => (
                              <Button
                                key={album.id}
                                variant="outline"
                                className="w-full justify-start"
                                onClick={() => handleMovePhoto(photo.id, album.id)}
                                disabled={photo.sub_event_id === album.id}
                              >
                                {album.title}
                                {photo.sub_event_id === album.id && ' (atual)'}
                              </Button>
                            ))}
                          </div>
                        </DialogContent>
                      </Dialog>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="icon"
                            variant="destructive"
                            disabled={deletingPhoto === photo.id}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir foto?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita. A foto será removida permanentemente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeletePhoto(photo.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  <CardContent className="p-3">
                    <p className="text-xs font-medium truncate">
                      {photo.title || 'Sem título'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      R$ {photo.price.toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab: Álbuns */}
        <TabsContent value="albums" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Organize suas fotos em álbuns. Álbuns precisam de 5+ fotos para ficarem visíveis.
            </p>
            <Dialog open={showCreateAlbumDialog} onOpenChange={setShowCreateAlbumDialog}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Criar Álbum
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Novo Álbum</DialogTitle>
                  <DialogDescription>
                    Organize suas fotos criando álbuns temáticos
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="album-title">Título do Álbum *</Label>
                    <Input
                      id="album-title"
                      value={newAlbumTitle}
                      onChange={(e) => setNewAlbumTitle(e.target.value)}
                      placeholder="Ex: Primeiro Tempo, Gol do Time A..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="album-description">Descrição (opcional)</Label>
                    <Textarea
                      id="album-description"
                      value={newAlbumDescription}
                      onChange={(e) => setNewAlbumDescription(e.target.value)}
                      placeholder="Descreva o álbum..."
                      rows={3}
                    />
                  </div>
                  <Button
                    onClick={handleCreateAlbum}
                    disabled={creatingAlbum || !newAlbumTitle.trim()}
                    className="w-full"
                  >
                    {creatingAlbum ? 'Criando...' : 'Criar Álbum'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {albums.length === 0 ? (
            <Card className="p-12 text-center">
              <FolderOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">Nenhum álbum criado</h3>
              <p className="text-muted-foreground mb-6">
                Crie álbuns para organizar melhor suas fotos
              </p>
              <Button onClick={() => setShowCreateAlbumDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Álbum
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {albums.map((album) => (
                <Card key={album.id} className="overflow-hidden">
                  <div className="aspect-video bg-muted relative flex items-center justify-center">
                    <FolderOpen className="h-12 w-12 text-muted-foreground" />
                    
                    {/* Status badge */}
                    <div className="absolute top-2 left-2">
                      <Badge variant={album.is_active ? 'default' : 'secondary'}>
                        {album.is_active ? '✅ Ativo' : '⏳ Inativo'}
                      </Badge>
                    </div>
                  </div>

                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base truncate">{album.title}</CardTitle>
                        {album.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                            {album.description}
                          </p>
                        )}
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            disabled={deletingAlbum === album.id}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir álbum?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir o álbum "{album.title}"?
                              {album.photo_count > 0 && (
                                <span className="block mt-2 text-destructive font-medium">
                                  ⚠️ Este álbum contém {album.photo_count} foto(s). 
                                  Remova ou mova todas antes de excluir.
                                </span>
                              )}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteAlbum(album.id, album.title)}
                              disabled={album.photo_count > 0}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {album.photo_count} {album.photo_count === 1 ? 'foto' : 'fotos'}
                      </span>
                      {!album.is_active && album.photo_count < 5 && (
                        <span className="text-xs text-amber-600 dark:text-amber-400">
                          Precisa de {5 - album.photo_count}+ fotos
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadPhotoModal
          onClose={() => {
            setShowUploadModal(false);
            fetchPhotos();
            fetchEventData();
          }}
          onUploadComplete={() => {
            setShowUploadModal(false);
            fetchPhotos();
            fetchEventData();
            toast({
              title: "✅ Upload concluído",
              description: "Suas fotos foram enviadas com sucesso!",
            });
          }}
        />
      )}
    </div>
  );
};

export default ManageEvent;
