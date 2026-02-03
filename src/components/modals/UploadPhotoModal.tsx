import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Upload, X, Camera, CheckCircle2, FolderOpen, Image as ImageIcon, Info, RefreshCw, DollarSign, KeyRound, Clock, FileImage, Key } from 'lucide-react';
import { backgroundUploadService } from '@/lib/backgroundUploadService';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { usePhotographerPix } from '@/hooks/usePhotographerPix';
import { SearchableEventSelect, EventOption } from '@/components/modals/SearchableEventSelect';

interface Campaign {
  id: string;
  title: string;
  event_date?: string | null;
  location?: string | null;
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
  const { hasPixKey, canUploadPhotos, loading: pixLoading } = usePhotographerPix();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [subEvents, setSubEvents] = useState<SubEvent[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [selectedSubEvent, setSelectedSubEvent] = useState('');
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('10.00');
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [creatingNewFolder, setCreatingNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDescription, setNewFolderDescription] = useState('');
  const [refreshingSubEvents, setRefreshingSubEvents] = useState(false);
  const [progressiveDiscountEnabled, setProgressiveDiscountEnabled] = useState(true);
  
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
    setLoadingCampaigns(true);
    try {
      if (!profile?.id) {
        toast({
          title: "Erro de autenticação",
          description: "Você precisa estar logado.",
          variant: "destructive",
        });
        setCampaigns([]);
        return;
      }

      // Buscar eventos criados pelo fotógrafo OU onde está atribuído via campaign_photographers
      const { data: ownCampaigns, error: ownError } = await supabase
        .from('campaigns')
        .select('id, title, event_date, is_active, location')
        .eq('photographer_id', profile.id)
        .eq('is_active', true);

      if (ownError) throw ownError;

      const { data: assignments, error: assignError } = await supabase
        .from('campaign_photographers')
        .select(`
          campaign_id,
          campaigns (
            id,
            title,
            event_date,
            is_active,
            location
          )
        `)
        .eq('photographer_id', profile.id)
        .eq('is_active', true);

      if (assignError) throw assignError;

      // Combinar eventos próprios + assignments
      const assignedCampaigns = assignments?.map(a => a.campaigns).filter(Boolean) || [];
      const allCampaigns = [...(ownCampaigns || []), ...assignedCampaigns];

      if (allCampaigns.length === 0) {
        toast({
          title: "Nenhum evento disponível",
          description: "Crie um evento ou candidate-se na página 'Eventos Próximos'.",
          variant: "destructive",
        });
        setCampaigns([]);
        return;
      }

      // Filtrar campanhas ativas e validar janela de upload
      // Regra: permite upload para eventos futuros e eventos passados até 60 dias.
      // Se não tiver data, permite.
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const MAX_PAST_DAYS = 30; // 30 dias de tolerância para eventos passados

      const validCampaigns = allCampaigns.filter((c: any) => {
        if (!c || !c.is_active) return false;
        if (!c.event_date) return true;

        const eventDate = new Date(c.event_date);
        if (Number.isNaN(eventDate.getTime())) return true;

        // Eventos futuros sempre OK
        if (eventDate.getTime() >= now.getTime()) return true;

        // Eventos passados: permitir por até 60 dias após o evento
        const diffMs = now.getTime() - eventDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        return diffDays <= MAX_PAST_DAYS;
      });

      setCampaigns(validCampaigns as Campaign[]);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast({
        title: "Erro ao carregar eventos",
        description: "Não foi possível carregar seus eventos atribuídos.",
        variant: "destructive",
      });
      setCampaigns([]);
    } finally {
      setLoadingCampaigns(false);
    }
  };

  const fetchSubEvents = async (campaignId: string, showToast = false) => {
    try {
      setRefreshingSubEvents(true);
      const { data, error } = await supabase
        .from('sub_events')
        .select('id, title, campaign_id')
        .eq('campaign_id', campaignId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubEvents(data || []);
      
      if (showToast) {
        toast({
          title: "✅ Lista atualizada",
          description: `${data?.length || 0} álbun(s) encontrado(s)`,
        });
      }
    } catch (error) {
      console.error('Error fetching sub events:', error);
      toast({
        title: "Erro ao carregar álbuns",
        description: "Não foi possível carregar os álbuns deste evento.",
        variant: "destructive",
      });
    } finally {
      setRefreshingSubEvents(false);
    }
  };

  const handleRefreshSubEvents = () => {
    if (selectedCampaign) {
      fetchSubEvents(selectedCampaign, true);
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

    // Validação do preço
    const priceValue = parseFloat(price);
    if (isNaN(priceValue) || priceValue < 1) {
      toast({
        title: "Preço inválido",
        description: "O preço mínimo é R$ 1,00",
        variant: "destructive",
      });
      return;
    }
    
    if (priceValue > 500) {
      toast({
        title: "Preço muito alto",
        description: "O preço máximo permitido é R$ 500,00",
        variant: "destructive",
      });
      return;
    }

    // Atualizar configuração de desconto progressivo na campanha
    try {
      await supabase
        .from('campaigns')
        .update({ progressive_discount_enabled: progressiveDiscountEnabled })
        .eq('id', selectedCampaign);
    } catch (error) {
      console.error('Error updating progressive discount:', error);
    }

    // Criar lote de upload em background
    const batchId = backgroundUploadService.createUploadBatch(
      files,
      selectedCampaign,
      selectedSubEvent,
      title,
      priceValue,
      profile.id
    );

    // Informar sucesso e permitir que o modal seja fechado
    toast({
      title: "✅ Upload iniciado!",
      description: `${files.length} foto(s) adicionadas à fila. ${progressiveDiscountEnabled ? '🎁 Desconto progressivo ativado!' : ''} O upload continuará em background.`,
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
          {/* Bloqueio se não tem PIX cadastrado */}
          {!pixLoading && !canUploadPhotos ? (
            <div className="p-8 text-center border-2 border-dashed border-destructive/50 rounded-xl bg-destructive/5">
              <div className="h-16 w-16 rounded-full bg-destructive/10 mx-auto mb-4 flex items-center justify-center">
                <KeyRound className="h-8 w-8 text-destructive" />
              </div>
              <h3 className="text-lg font-bold mb-2 text-destructive">Chave PIX Obrigatória</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                Para fazer upload de fotos e receber seus pagamentos, você precisa primeiro cadastrar uma chave PIX.
              </p>
              <div className="flex flex-col gap-2">
                <Button asChild variant="default">
                  <Link to="/dashboard/photographer/pix" onClick={onClose}>
                    <KeyRound className="h-4 w-4 mr-2" />
                    Cadastrar Chave PIX
                  </Link>
                </Button>
                <Button onClick={onClose} variant="outline">
                  Fechar
                </Button>
              </div>
            </div>
           ) : loadingCampaigns ? (
             <div className="p-8 text-center border-2 border-dashed rounded-xl bg-muted/30">
               <div className="h-16 w-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                 <RefreshCw className="h-8 w-8 text-muted-foreground animate-spin" />
               </div>
               <h3 className="text-lg font-bold mb-2">Carregando eventos…</h3>
               <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                 Aguarde um momento.
               </p>
               <Button onClick={onClose} variant="outline">
                 Fechar
               </Button>
             </div>
           ) : campaigns.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed rounded-xl bg-muted/30">
              <div className="h-16 w-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                <Camera className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-bold mb-2">Nenhum evento disponível</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                Você ainda não foi atribuído a eventos. Candidate-se na página 'Eventos Próximos'.
              </p>
               <div className="flex flex-col gap-2">
                 <Button onClick={fetchCampaigns} variant="default">
                   <RefreshCw className="h-4 w-4 mr-2" />
                   Recarregar eventos
                 </Button>
                 <Button onClick={onClose} variant="outline">
                   Fechar
                 </Button>
               </div>
            </div>
          ) : (
            <>

          {/* Seleção de Evento com Pesquisa */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Camera className="h-4 w-4 text-primary" />
              </div>
              <Label htmlFor="campaign" className="font-semibold text-base">
                Selecione o Evento
              </Label>
              <span className="text-xs text-muted-foreground">
                ({campaigns.length} disponíveis)
              </span>
            </div>
            <SearchableEventSelect
              events={campaigns as EventOption[]}
              value={selectedCampaign}
              onValueChange={setSelectedCampaign}
              placeholder="Buscar e selecionar evento..."
            />
            
            {/* Info sobre Visibilidade */}
            {selectedCampaign && (
              <div className="flex items-start gap-2 p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
                <div className="text-lg mt-0.5">✨</div>
                <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
                  <strong>Lembre-se:</strong> Seu evento aparecerá na página inicial após ter 5+ fotos disponíveis
                </p>
              </div>
            )}
          </div>

          {/* Seleção de Álbum (Opcional) */}
          {selectedCampaign && (
            <div className="space-y-3 p-4 bg-muted/30 border border-border/50 rounded-xl">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <div className="h-8 w-8 rounded-lg bg-background flex items-center justify-center flex-shrink-0">
                    <FolderOpen className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="font-semibold text-base">
                      Álbum (Opcional)
                    </Label>
                    {subEvents.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        ({subEvents.length})
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={handleRefreshSubEvents}
                    disabled={refreshingSubEvents}
                    className="gap-1 h-8 px-2"
                    title="Atualizar lista de álbuns"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${refreshingSubEvents ? 'animate-spin' : ''}`} />
                  </Button>
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

          {/* Campo Preço */}
          <div className="space-y-3 p-4 rounded-xl border bg-muted/30 border-border/50">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-background">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </div>
              <Label htmlFor="price" className="font-semibold text-base">
                Preço por foto (R$) *
              </Label>
            </div>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="1"
              max="500"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              onBlur={(e) => {
                const val = parseFloat(e.target.value);
                if (isNaN(val) || val < 1) setPrice('1.00');
                else if (val > 500) setPrice('500.00');
                else setPrice(val.toFixed(2));
              }}
              className="h-12 text-lg font-bold text-center"
              placeholder="10.00"
              required
            />
            <p className="text-xs text-muted-foreground text-center">
              💡 Preço de R$ 1,00 a R$ 500,00 por foto
            </p>
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
              className="flex flex-col items-center justify-center w-full h-28 sm:h-40 border-2 border-dashed border-primary/50 rounded-2xl cursor-pointer bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 hover:from-primary/10 hover:via-primary/15 hover:to-primary/10 transition-all duration-300 group shadow-sm hover:shadow-md"
            >
              <div className="flex flex-col items-center justify-center p-3 sm:p-4 text-center">
                <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-primary/10 flex items-center justify-center mb-2 sm:mb-3 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                  <Upload className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                </div>
                <p className="mb-1 text-xs sm:text-sm font-bold text-foreground">
                  Clique ou arraste suas fotos
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  Sem limite • Máx 2.5MB/foto
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

            {/* Seção de Desconto Progressivo */}
            <div className="space-y-4 p-5 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-2 border-purple-200 dark:border-purple-800 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-foreground mb-2 flex items-center gap-2">
                    🎁 Desconto Progressivo para Seus Clientes
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Ative descontos automáticos para incentivar seus clientes a comprarem mais fotos:
                  </p>
                  <div className="space-y-2 text-xs bg-white/60 dark:bg-black/20 rounded-lg p-3 border border-purple-200/50">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-green-600 dark:text-green-400">✓ 5-10 fotos:</span>
                      <span className="text-muted-foreground">5% de desconto</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-green-600 dark:text-green-400">✓ 11-20 fotos:</span>
                      <span className="text-muted-foreground">10% de desconto</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-green-600 dark:text-green-400">✓ 21+ fotos:</span>
                      <span className="text-muted-foreground">15% de desconto</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-4">
                    <input
                      type="checkbox"
                      id="progressiveDiscount"
                      checked={progressiveDiscountEnabled}
                      onChange={(e) => setProgressiveDiscountEnabled(e.target.checked)}
                      className="h-5 w-5 rounded border-2 border-purple-500 text-purple-600 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 cursor-pointer"
                    />
                    <label htmlFor="progressiveDiscount" className="text-sm font-medium cursor-pointer text-foreground">
                      {progressiveDiscountEnabled ? '✅ Ativado' : '⚪ Desativado'} - Descontos aplicados automaticamente no carrinho
                    </label>
                  </div>
                  {!progressiveDiscountEnabled && (
                    <Alert className="mt-3 bg-yellow-50 dark:bg-yellow-950/20 border-yellow-300 dark:border-yellow-800">
                      <Info className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                      <AlertDescription className="text-xs text-yellow-900 dark:text-yellow-100">
                        ⚠️ Sem descontos progressivos, seus clientes podem comprar menos fotos.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
            </div>

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