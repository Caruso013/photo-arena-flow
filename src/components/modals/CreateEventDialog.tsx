import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Calendar, MapPin, Loader2, Gift, Image as ImageIcon, FolderPlus } from 'lucide-react';

interface CreateEventDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onEventCreated: () => void;
}

export default function CreateEventDialog({ isOpen, onClose, onEventCreated }: CreateEventDialogProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [currentTab, setCurrentTab] = useState('info');
  
  // Info form
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    event_date: '',
    progressive_discount_enabled: true,
  });
  
  // Cover image
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  
  // Albums
  const [albums, setAlbums] = useState<Array<{ title: string; description: string }>>([{ title: '', description: '' }]);
  
  const { toast } = useToast();

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.size > 5 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "A imagem deve ter no máximo 5MB",
        variant: "destructive",
      });
      return;
    }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreviewUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast({
        title: "Erro",
        description: "Título do evento é obrigatório",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      
      let coverImageUrl: string | null = null;

      // Upload cover if selected
      if (selectedFile) {
        const fileName = `${Date.now()}_${selectedFile.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        const { error: uploadError } = await supabase.storage
          .from('campaign-covers')
          .upload(fileName, selectedFile);
        
        if (uploadError) throw uploadError;
        
        const { data: urlData } = supabase.storage
          .from('campaign-covers')
          .getPublicUrl(fileName);
        coverImageUrl = urlData.publicUrl;
      }

      const { data: newCampaign, error } = await supabase
        .from('campaigns')
        .insert({
          title: formData.title,
          description: formData.description || null,
          location: formData.location || null,
          event_date: formData.event_date || null,
          photographer_percentage: 91,
          organization_percentage: 0,
          platform_percentage: 9,
          is_active: true,
          progressive_discount_enabled: formData.progressive_discount_enabled,
          photographer_id: profile?.id,
          cover_image_url: coverImageUrl,
          event_terms: null,
        })
        .select()
        .single();

      if (error) throw error;

      // Create albums if filled
      const filledAlbums = albums.filter(album => album.title.trim());
      if (filledAlbums.length > 0 && newCampaign) {
        const albumsToInsert = filledAlbums.map(album => ({
          campaign_id: newCampaign.id,
          title: album.title.trim(),
          description: album.description.trim() || null,
          is_active: true,
        }));

        const { error: albumsError } = await supabase
          .from('sub_events')
          .insert(albumsToInsert);

        if (albumsError) {
          console.error('Erro ao criar álbuns:', albumsError);
          toast({
            title: "Aviso",
            description: "Evento criado, mas houve erro ao criar alguns álbuns.",
            variant: "default",
          });
        }
      }

      toast({
        title: "Sucesso!",
        description: "Evento criado com sucesso! Você já pode fazer upload de fotos.",
      });

      // Reset form
      resetForm();
      onEventCreated();
    } catch (error: any) {
      console.error('Error creating campaign:', error);
      const errorMessage = error?.message || "Falha ao criar evento. Tente novamente.";
      toast({
        title: "Erro ao criar evento",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      location: '',
      event_date: '',
      progressive_discount_enabled: true,
    });
    setSelectedFile(null);
    setPreviewUrl('');
    setAlbums([{ title: '', description: '' }]);
    setCurrentTab('info');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">Criar Novo Evento</DialogTitle>
          <DialogDescription>
            Preencha os dados do evento. Você poderá fazer upload de fotos após a criação.
          </DialogDescription>
        </DialogHeader>
        
        {/* Visibility Alert */}
        <Alert className="border-2 border-blue-200 bg-gradient-to-r from-blue-50/80 to-cyan-50/50 dark:border-blue-900 dark:from-blue-950/30 dark:to-cyan-950/20">
          <AlertDescription className="flex items-start gap-2 text-sm">
            <div className="rounded-full bg-blue-500/10 p-1.5 mt-0.5">✨</div>
            <div className="space-y-1">
              <p className="font-semibold text-blue-900 dark:text-blue-100">Regra de Visibilidade</p>
              <p className="text-blue-800 dark:text-blue-200 text-xs leading-relaxed">
                Seu evento aparecerá na página inicial somente após ter <strong>5 ou mais fotos</strong> disponíveis.
              </p>
            </div>
          </AlertDescription>
        </Alert>
        
        <form onSubmit={handleSubmit}>
          <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="info" className="text-xs sm:text-sm">
                <span className="hidden sm:inline">Informações</span>
                <span className="sm:hidden">Info</span>
              </TabsTrigger>
              <TabsTrigger value="cover" className="text-xs sm:text-sm">
                <ImageIcon className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Capa</span>
              </TabsTrigger>
              <TabsTrigger value="albums" className="text-xs sm:text-sm">
                <FolderPlus className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Álbuns</span>
              </TabsTrigger>
            </TabsList>

            {/* Tab: Informações */}
            <TabsContent value="info" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-foreground text-base font-semibold">
                  Título do Evento <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Ex: Casamento João e Maria, Aniversário de 15 Anos"
                  required
                  className="bg-background text-foreground border-input h-12 text-base"
                />
                <p className="text-xs text-muted-foreground">
                  💡 Use um título claro e descritivo
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location" className="text-foreground">Localização</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                      placeholder="Ex: São Paulo, SP"
                      className="pl-10 bg-background text-foreground border-input"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="event_date" className="text-foreground">Data do Evento</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="event_date"
                      type="datetime-local"
                      value={formData.event_date}
                      onChange={(e) => handleInputChange('event_date', e.target.value)}
                      className="pl-10 bg-background text-foreground border-input"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-foreground">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Descreva o evento, horários, informações relevantes..."
                  rows={3}
                  className="bg-background text-foreground border-input"
                />
              </div>

              <div className="p-3 bg-primary/10 dark:bg-primary/20 border border-primary/30 rounded-lg">
                <p className="text-sm text-foreground">
                  💰 <strong>Comissão:</strong> Você recebe 91% do valor de cada foto vendida. 
                  A plataforma retém 9% para manutenção do serviço.
                </p>
              </div>

              <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-primary/20">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Gift className="h-4 w-4 text-primary" />
                    <Label htmlFor="progressive_discount" className="text-sm font-medium cursor-pointer">
                      Ativar Descontos Progressivos
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Incentive compras maiores com descontos automáticos
                  </p>
                </div>
                <Switch 
                  id="progressive_discount"
                  checked={formData.progressive_discount_enabled} 
                  onCheckedChange={(checked) => handleInputChange('progressive_discount_enabled', checked)}
                />
              </div>

              {formData.progressive_discount_enabled && (
                <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                  <Gift className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <AlertDescription className="text-blue-900 dark:text-blue-100">
                    <div className="space-y-1 text-xs">
                      <p className="font-medium mb-1">Tabela de descontos:</p>
                      <div className="flex justify-between"><span>• 2 a 4 fotos</span><span className="font-semibold">5% OFF</span></div>
                      <div className="flex justify-between"><span>• 5 a 9 fotos</span><span className="font-semibold">10% OFF</span></div>
                      <div className="flex justify-between"><span>• 10 ou mais</span><span className="font-semibold">20% OFF</span></div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            {/* Tab: Capa */}
            <TabsContent value="cover" className="space-y-4">
              <div className="space-y-4">
                <Label className="text-base font-semibold">Imagem de Capa</Label>
                <p className="text-sm text-muted-foreground">
                  Adicione uma imagem de capa para destacar seu evento (máximo 5MB)
                </p>
                
                {previewUrl ? (
                  <div className="relative">
                    <img 
                      src={previewUrl} 
                      alt="Preview" 
                      className="w-full aspect-video object-cover rounded-lg border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => {
                        setSelectedFile(null);
                        setPreviewUrl('');
                      }}
                    >
                      Remover
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                    <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground mb-3">
                      Arraste uma imagem ou clique para selecionar
                    </p>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="max-w-xs mx-auto"
                    />
                  </div>
                )}

                <Alert>
                  <ImageIcon className="h-4 w-4" />
                  <AlertDescription>
                    Se você não adicionar uma capa, a primeira foto enviada será usada automaticamente.
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>


            {/* Tab: Álbuns */}
            <TabsContent value="albums" className="space-y-4">
              <div className="space-y-2">
                <Label className="text-base font-semibold">Álbuns Iniciais (Opcional)</Label>
                <p className="text-sm text-muted-foreground">
                  Crie álbuns para organizar as fotos do evento
                </p>
              </div>
              
              {albums.map((album, index) => (
                <Card key={index} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Álbum {index + 1}</Label>
                    {albums.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setAlbums(albums.filter((_, i) => i !== index))}
                        className="h-8"
                      >
                        Remover
                      </Button>
                    )}
                  </div>
                  <Input
                    placeholder="Nome do álbum"
                    value={album.title}
                    onChange={(e) => {
                      const newAlbums = [...albums];
                      newAlbums[index].title = e.target.value;
                      setAlbums(newAlbums);
                    }}
                    className="bg-background text-foreground border-input"
                  />
                  <Textarea
                    placeholder="Descrição (opcional)"
                    value={album.description}
                    onChange={(e) => {
                      const newAlbums = [...albums];
                      newAlbums[index].description = e.target.value;
                      setAlbums(newAlbums);
                    }}
                    rows={2}
                    className="bg-background text-foreground border-input"
                  />
                </Card>
              ))}
              
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAlbums([...albums, { title: '', description: '' }])}
                className="w-full"
              >
                + Adicionar Outro Álbum
              </Button>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-3 pt-4 border-t mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar Evento'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
