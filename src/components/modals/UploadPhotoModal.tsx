import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
  import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Upload, X, Camera, CheckCircle2, FolderOpen, Image as ImageIcon, Info } from 'lucide-react';
import { backgroundUploadService } from '@/lib/backgroundUploadService';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Campaign {
  id: string;
  title: string;
}

interface SubEvent {
  id: string;
  title: string;
  campaign_id: string;
}

interface UploadPhotoModalProps {
  onClose: () => void;
  onUploadComplete: () => void;
}

const UploadPhotoModal: React.FC<UploadPhotoModalProps> = ({ onClose, onUploadComplete }) => {
  const { profile } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [subEvents, setSubEvents] = useState<SubEvent[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [selectedSubEvent, setSelectedSubEvent] = useState('');
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('10.00');
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [creatingNewFolder, setCreatingNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDescription, setNewFolderDescription] = useState('');
  
  useEffect(() => {
    fetchCampaigns();
  }, []);

  useEffect(() => {
    if (selectedCampaign) {
      fetchSubEvents(selectedCampaign);
    } else {
      setSubEvents([]);
      setSelectedSubEvent('');
    }
  }, [selectedCampaign]);

  const fetchCampaigns = async () => {
    try {
      if (!profile?.id) {
        toast({
          title: "Erro de autenticação",
          description: "Você precisa estar logado.",
          variant: "destructive",
        });
        return;
      }

      // Buscar APENAS eventos onde o fotógrafo está atribuído via campaign_photographers
      const { data: assignments, error: assignError } = await supabase
        .from('campaign_photographers')
        .select(`
          campaign_id,
          campaigns (
            id,
            title,
            event_date,
            is_active
          )
        `)
        .eq('photographer_id', profile.id)
        .eq('is_active', true);

      if (assignError) throw assignError;

      if (!assignments || assignments.length === 0) {
        toast({
          title: "Nenhum evento atribuído",
          description: "Você ainda não foi atribuído a nenhum evento. Candidate-se na página 'Eventos Próximos'.",
          variant: "destructive",
        });
        setCampaigns([]);
        return;
      }

      // Filtrar campanhas ativas e validar data (mesmo mês)
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();

      const validCampaigns = assignments
        .map(a => a.campaigns)
        .filter(c => {
          if (!c || !c.is_active) return false;
          
          // Validar data do evento: deve estar no mesmo mês
          if (c.event_date) {
            const eventDate = new Date(c.event_date);
            const eventMonth = eventDate.getMonth();
            const eventYear = eventDate.getFullYear();
            
            // Permitir upload apenas no mês do evento
            return (eventYear === currentYear && eventMonth === currentMonth);
          }
          
          return true; // Se não tem data, permitir
        });

      if (validCampaigns.length === 0) {
        toast({
          title: "Nenhum evento disponível para upload",
          description: "Seus eventos atribuídos não estão no período de upload válido (mesmo mês do evento).",
          variant: "destructive",
        });
      }

      setCampaigns(validCampaigns as Campaign[]);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast({
        title: "Erro ao carregar eventos",
        description: "Não foi possível carregar seus eventos atribuídos.",
        variant: "destructive",
      });
    }
  };

  const fetchSubEvents = async (campaignId: string) => {
    try {
      const { data, error } = await supabase
        .from('sub_events')
        .select('id, title, campaign_id')
        .eq('campaign_id', campaignId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubEvents(data || []);
    } catch (error) {
      console.error('Error fetching sub events:', error);
      toast({
        title: "Erro ao carregar álbuns",
        description: "Não foi possível carregar os álbuns deste evento.",
        variant: "destructive",
      });
    }
  };

  const MAX_FILE_SIZE = 2.5 * 1024 * 1024; // 2.5MB por arquivo
  // Sem limite de quantidade - fotógrafos podem enviar quantas fotos quiserem

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;

    // Validar tamanho de cada arquivo
    const invalidFiles: string[] = [];
    const validFiles: File[] = [];
    
    Array.from(selectedFiles).forEach(file => {
      if (file.size > MAX_FILE_SIZE) {
        invalidFiles.push(`${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      } else {
        validFiles.push(file);
      }
    });

    if (invalidFiles.length > 0) {
      toast({
        title: "Alguns arquivos são muito grandes",
        description: `${invalidFiles.length} arquivos excedem 2.5MB e foram removidos. ${validFiles.length} fotos válidas selecionadas.`,
        variant: "destructive",
      });
      
      // Se não houver arquivos válidos, limpar seleção
      if (validFiles.length === 0) {
        e.target.value = '';
        setFiles(null);
        return;
      }
      
      // Criar FileList apenas com arquivos válidos
      const dataTransfer = new DataTransfer();
      validFiles.forEach(file => dataTransfer.items.add(file));
      setFiles(dataTransfer.files);
      return;
    }

    setFiles(selectedFiles);
  };

  const handleCreateNewFolder = async () => {
    if (!selectedCampaign || !newFolderName.trim()) {
      toast({
        title: "Dados incompletos",
        description: "Digite um nome para a nova pasta.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('sub_events')
        .insert({
          campaign_id: selectedCampaign,
          title: newFolderName.trim(),
          description: newFolderDescription.trim() || null,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "✅ Pasta criada!",
        description: `A pasta "${newFolderName}" foi criada com sucesso.`,
      });

      // Atualizar lista de sub-eventos e selecionar o novo
      await fetchSubEvents(selectedCampaign);
      setSelectedSubEvent(data.id);
      setNewFolderName('');
      setNewFolderDescription('');
      setCreatingNewFolder(false);
    } catch (error) {
      console.error('Error creating folder:', error);
      toast({
        title: "Erro ao criar pasta",
        description: "Não foi possível criar a pasta. Verifique se você está atribuído a este evento.",
        variant: "destructive",
      });
    }
  };

  const handleUpload = async () => {
    if (!files || !selectedCampaign) {
      toast({
        title: "Dados incompletos",
        description: "Por favor, selecione um evento e pelo menos uma foto.",
        variant: "destructive",
      });
      return;
    }

    if (!profile?.id) {
      toast({
        title: "Erro de autenticação",
        description: "Você precisa estar logado para fazer upload de fotos.",
        variant: "destructive",
      });
      return;
    }

    // Criar lote de upload em background
    const batchId = backgroundUploadService.createUploadBatch(
      files,
      selectedCampaign,
      selectedSubEvent,
      title,
      parseFloat(price),
      profile.id
    );

    // Informar sucesso e permitir que o modal seja fechado
    toast({
      title: "✅ Upload iniciado!",
      description: `${files.length} foto(s) adicionadas à fila. O upload continuará em background. Acompanhe o progresso no canto inferior direito da tela.`,
    });

    // Callback para atualizar a interface
    onUploadComplete();
    
    // Fechar modal após pequeno delay para mostrar a mensagem
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
          <DialogTitle className="flex items-center gap-3 text-xl font-bold">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload className="h-5 w-5 text-primary" />
            </div>
            Upload de Fotos
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-2">
            Envie suas fotos para o evento selecionado
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 px-6 py-4">
          <form className="space-y-6">
          {campaigns.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed rounded-xl bg-muted/30">
              <div className="h-16 w-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                <Camera className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-bold mb-2">Nenhum evento disponível</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                Você ainda não foi atribuído a eventos. Candidate-se na página 'Eventos Próximos'.
              </p>
              <Button onClick={onClose} variant="outline">
                Fechar
              </Button>
            </div>
          ) : (
            <>
          {/* Seleção de Evento */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Camera className="h-4 w-4 text-primary" />
              </div>
              <Label htmlFor="campaign" className="font-semibold text-base">
                Selecione o Evento
              </Label>
            </div>
            <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Escolha o evento" />
              </SelectTrigger>
              <SelectContent>
                {campaigns.map((campaign) => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    <div className="flex items-center gap-2">
                      <Camera className="h-4 w-4" />
                      {campaign.title}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Seleção de Álbum (Opcional) */}
          {selectedCampaign && (
            <div className="space-y-3 p-4 bg-muted/30 border border-border/50 rounded-xl">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-background flex items-center justify-center flex-shrink-0">
                    <FolderOpen className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <Label className="font-semibold text-base">
                    Álbum (Opcional)
                  </Label>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setCreatingNewFolder(!creatingNewFolder)}
                  className="gap-1 h-9"
                >
                  <FolderOpen className="h-4 w-4" />
                  {creatingNewFolder ? 'Cancelar' : 'Novo Álbum'}
                </Button>
              </div>
              
              {/* Formulário de criar pasta */}
              {creatingNewFolder && (
                <div className="space-y-3 p-4 bg-card border border-border rounded-lg shadow-sm">
                  <Input
                    placeholder="Nome do álbum (ex: Final do Campeonato)"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="h-11"
                  />
                  <Textarea
                    placeholder="Descrição opcional"
                    value={newFolderDescription}
                    onChange={(e) => setNewFolderDescription(e.target.value)}
                    rows={2}
                    className="resize-none"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCreateNewFolder}
                    className="gap-2 w-full"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Criar Álbum
                  </Button>
                </div>
              )}
              
              {/* Select de álbuns existentes */}
              {subEvents.length > 0 ? (
                <div className="space-y-2">
                  <Select value={selectedSubEvent || "none"} onValueChange={(value) => setSelectedSubEvent(value === "none" ? "" : value)}>
                    <SelectTrigger className="h-11 bg-card">
                      <SelectValue placeholder="Escolha um álbum" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        📂 Sem álbum (raiz do evento)
                      </SelectItem>
                      {subEvents.map((subEvent) => (
                        <SelectItem key={subEvent.id} value={subEvent.id}>
                          📁 {subEvent.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                !creatingNewFolder && (
                  <p className="text-xs text-muted-foreground italic p-3 bg-muted/50 rounded-lg text-center">
                    Nenhum álbum criado. Clique em "Novo Álbum" para organizar melhor suas fotos
                  </p>
                )
              )}
            </div>
          )}

          {/* Campos Título e Preço */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">
                Título (opcional)
              </Label>
              <Input
                id="title"
                placeholder="Ex: Final do Campeonato"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">
                Mesmo título para todas as fotos
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price" className="font-semibold">
                Preço por foto (R$) *
              </Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="h-11 font-medium"
              />
            </div>
          </div>

          {/* Seleção de Fotos */}
          <div className="space-y-3">
            <Label className="font-semibold flex items-center gap-2 text-base">
              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Upload className="h-4 w-4 text-primary" />
              </div>
              Selecionar Fotos
            </Label>
            
            <label 
              htmlFor="files" 
              className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-primary/50 rounded-2xl cursor-pointer bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 hover:from-primary/10 hover:via-primary/15 hover:to-primary/10 transition-all duration-300 group shadow-sm hover:shadow-md"
            >
              <div className="flex flex-col items-center justify-center p-4 text-center">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                  <Upload className="h-8 w-8 text-primary" />
                </div>
                <p className="mb-1 text-sm font-bold text-foreground">
                  Clique ou arraste suas fotos
                </p>
                <p className="text-xs text-muted-foreground">
                  Sem limite de quantidade • Máx 2.5MB por foto
                </p>
              </div>
              <input
                id="files"
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
            
            {files && (
              <div className="space-y-3 p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-2 border-green-200 dark:border-green-800 rounded-xl">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="h-5 w-5 text-white" />
                  </div>
                  <p className="text-sm font-bold text-foreground">
                    {files.length} foto(s) pronta(s)
                  </p>
                </div>
                <div className="max-h-20 overflow-y-auto space-y-1 bg-white/50 dark:bg-black/20 rounded-lg p-2">
                  {Array.from(files).slice(0, 5).map((file, index) => (
                    <p key={index} className="text-xs text-muted-foreground flex items-center gap-2">
                      <ImageIcon className="h-3 w-3 text-primary" />
                      {file.name}
                    </p>
                  ))}
                  {files.length > 5 && (
                    <p className="text-xs font-semibold text-primary">
                      + {files.length - 5} fotos
                    </p>
                  )}
                </div>
              </div>
            )}

            <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="text-xs text-blue-900 dark:text-blue-100">
                <strong>Upload em Background:</strong> O envio continuará mesmo se você fechar este modal!
              </AlertDescription>
            </Alert>
          </div>
            </>
          )}
          </form>
        </div>

        {/* Footer com Botões */}
        {campaigns.length > 0 && (
          <div className="flex justify-end gap-3 px-6 py-5 border-t bg-muted/20 backdrop-blur-sm">
            <Button 
              variant="outline" 
              onClick={onClose} 
              disabled={uploading}
              size="lg"
              className="px-8 font-semibold"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={uploading || !files || !selectedCampaign}
              size="lg"
              className="px-10 bg-gradient-to-r from-primary via-primary/95 to-primary/90 hover:from-primary/95 hover:via-primary/90 hover:to-primary/85 font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
            >
              {uploading ? (
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Preparando
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Enviar {files?.length || 0} Foto(s)
                </div>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UploadPhotoModal;