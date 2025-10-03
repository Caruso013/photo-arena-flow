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
import { Upload, X, Camera, CheckCircle2, Clock, FolderOpen, Image as ImageIcon, Info } from 'lucide-react';
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload de Fotos
          </DialogTitle>
          <DialogDescription>
            Envie suas fotos para o evento selecionado
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4">
          {campaigns.length === 0 ? (
            <div className="p-6 text-center border-2 border-dashed rounded-lg bg-muted/50">
              <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Nenhum evento disponível</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Aguarde a criação de eventos pelos administradores para poder fazer upload de fotos.
              </p>
              <Button onClick={onClose} variant="outline">
                Fechar
              </Button>
            </div>
          ) : (
            <>
          {/* Explicação da estrutura */}
          <Alert className="bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm text-blue-900">
              <strong>Como funciona:</strong> Selecione um <strong>Evento</strong> e opcionalmente uma <strong>Pasta (Álbum)</strong> dentro dele para organizar suas fotos.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-primary" />
              <Label htmlFor="campaign" className="font-semibold">
                1. Evento Principal *
              </Label>
            </div>
            <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Escolha o evento esportivo" />
              </SelectTrigger>
              <SelectContent>
                {campaigns.map((campaign) => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    📸 {campaign.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <ImageIcon className="h-3 w-3" />
              O evento onde as fotos serão exibidas (ex: "Campeonato 2025")
            </p>
          </div>

          {selectedCampaign && (
            <div className="space-y-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-amber-700" />
                  <Label className="font-semibold text-amber-900">
                    2. Pasta/Álbum (Opcional)
                  </Label>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setCreatingNewFolder(!creatingNewFolder)}
                  className="gap-1 h-8 text-xs"
                >
                  <FolderOpen className="h-3 w-3" />
                  {creatingNewFolder ? 'Cancelar' : 'Nova Pasta'}
                </Button>
              </div>
              
              {/* Formulário de criar pasta */}
              {creatingNewFolder && (
                <div className="space-y-2 p-3 bg-white border border-amber-300 rounded">
                  <Input
                    placeholder="Nome da pasta (ex: Treino Manhã)"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="h-9"
                  />
                  <Input
                    placeholder="Descrição (opcional)"
                    value={newFolderDescription}
                    onChange={(e) => setNewFolderDescription(e.target.value)}
                    className="h-9"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCreateNewFolder}
                    className="gap-1 w-full h-9"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    Criar Pasta
                  </Button>
                </div>
              )}
              
              {/* Select de pastas existentes */}
              {subEvents.length > 0 ? (
                <>
                  <Select value={selectedSubEvent || "none"} onValueChange={(value) => setSelectedSubEvent(value === "none" ? "" : value)}>
                    <SelectTrigger className="h-11 bg-white">
                      <SelectValue placeholder="📁 Escolha uma pasta ou deixe em branco" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        <span className="flex items-center gap-2">
                          📂 Sem pasta específica (raiz do evento)
                        </span>
                      </SelectItem>
                      {subEvents.map((subEvent) => (
                        <SelectItem key={subEvent.id} value={subEvent.id}>
                          <span className="flex items-center gap-2">
                            📁 {subEvent.title}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-amber-800 font-medium flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    Organize suas fotos em pastas para facilitar a navegação (ex: "Jogo Final", "Treino", etc)
                  </p>
                </>
              ) : (
                <div className="p-3 bg-white rounded border border-amber-300">
                  <p className="text-sm text-amber-900">
                    💡 Nenhuma pasta criada. Clique em "Nova Pasta" para criar uma agora!
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    Suas fotos ficarão na pasta principal do evento se você não criar uma pasta específica.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm">
                Título (opcional)
              </Label>
              <Input
                id="title"
                placeholder="Ex: Final do Campeonato"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-10"
              />
              <p className="text-xs text-muted-foreground">
                Mesmo título para todas as fotos
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price" className="text-sm font-semibold">
                Preço por foto (R$) *
              </Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="h-10 font-medium"
              />
              <p className="text-xs text-green-700 font-medium">
                💰 Você receberá % por venda
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="files" className="font-semibold flex items-center gap-2">
              <Upload className="h-4 w-4" />
              3. Selecionar fotos (sem limite de quantidade)
            </Label>
            <Input
              id="files"
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              className="cursor-pointer"
            />
            {files && (
              <div className="space-y-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm font-semibold text-green-900 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  {files.length} foto(s) pronta(s) para envio
                </p>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {Array.from(files).slice(0, 10).map((file, index) => (
                    <p key={index} className="text-xs text-green-800 flex items-center gap-2">
                      <ImageIcon className="h-3 w-3" />
                      {file.name} - {(file.size / 1024 / 1024).toFixed(2)}MB
                    </p>
                  ))}
                  {files.length > 10 && (
                    <p className="text-xs text-green-700 font-medium">
                      + {files.length - 10} fotos a mais...
                    </p>
                  )}
                </div>
                <div className="pt-2 border-t border-green-300">
                  <p className="text-xs text-green-800">
                    📊 Total: {(Array.from(files).reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(2)}MB
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-2 p-2 bg-blue-50 rounded">
              <Info className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-xs text-blue-900">
                <p className="font-medium">✨ Upload em Background:</p>
                <p>• <strong>Sem limite</strong> de quantidade de fotos</p>
                <p>• Tamanho: <strong>2.5MB</strong> por foto</p>
                <p className="text-blue-700 mt-1">💡 O upload continuará mesmo se você fechar esta janela!</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={onClose} disabled={uploading} className="h-10">
              Cancelar
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={uploading || !files || !selectedCampaign}
              className="h-10 min-w-[200px] bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            >
              {uploading ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Preparando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Enviar {files?.length || 0} foto(s) em Background
                </>
              )}
            </Button>
          </div>
          </>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UploadPhotoModal;