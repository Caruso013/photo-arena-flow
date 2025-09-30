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
import { Upload, X } from 'lucide-react';

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
  const [uploadProgress, setUploadProgress] = useState(0);

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
      const { data, error } = await supabase
        .from('campaigns')
        .select('id, title')
        .eq('photographer_id', profile?.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast({
        title: "Erro ao carregar eventos",
        description: "Não foi possível carregar seus eventos.",
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

  const MAX_FILE_SIZE = 2.5 * 1024 * 1024; // 2.5MB em bytes

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
        title: "Arquivos muito grandes",
        description: `Os seguintes arquivos excedem 2.5MB e não serão incluídos: ${invalidFiles.join(', ')}. Por favor, reduza o tamanho das imagens.`,
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

  const uploadPhoto = async (file: File, index: number) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${profile?.id}/${Date.now()}_${index}.${fileExt}`;
    const watermarkedFileName = `${profile?.id}/watermarked_${Date.now()}_${index}.${fileExt}`;

    // Upload original photo (private)
    const { data: originalData, error: originalError } = await supabase.storage
      .from('photos-original')
      .upload(fileName, file);

    if (originalError) throw originalError;

    // Create watermarked version (for now, just copy - in production you'd add actual watermark)
    const { data: watermarkedData, error: watermarkedError } = await supabase.storage
      .from('photos-watermarked')
      .upload(watermarkedFileName, file);

    if (watermarkedError) throw watermarkedError;

    // Get public URLs
    const { data: originalUrl } = supabase.storage
      .from('photos-original')
      .getPublicUrl(fileName);

    const { data: watermarkedUrl } = supabase.storage
      .from('photos-watermarked')
      .getPublicUrl(watermarkedFileName);

    // Save photo record to database
    const { error: dbError } = await supabase
      .from('photos')
      .insert({
        campaign_id: selectedCampaign,
        sub_event_id: selectedSubEvent || null,
        photographer_id: profile?.id,
        original_url: originalUrl.publicUrl,
        watermarked_url: watermarkedUrl.publicUrl,
        title: title || `Foto ${index + 1}`,
        price: parseFloat(price),
        is_available: true,
      });

    if (dbError) throw dbError;
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

    setUploading(true);
    setUploadProgress(0);

    try {
      const totalFiles = files.length;
      
      for (let i = 0; i < totalFiles; i++) {
        await uploadPhoto(files[i], i);
        setUploadProgress(((i + 1) / totalFiles) * 100);
      }

      toast({
        title: "Upload concluído",
        description: `${totalFiles} foto(s) foram enviadas com sucesso.`,
      });

      onUploadComplete();
      onClose();
    } catch (error) {
      console.error('Error uploading photos:', error);
      toast({
        title: "Erro no upload",
        description: "Ocorreu um erro ao enviar as fotos. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
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

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="campaign">Evento *</Label>
            <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um evento" />
              </SelectTrigger>
              <SelectContent>
                {campaigns.map((campaign) => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    {campaign.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedCampaign && subEvents.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="subEvent">Álbum (opcional)</Label>
              <Select value={selectedSubEvent} onValueChange={setSelectedSubEvent}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um álbum ou deixe em branco" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sem álbum específico</SelectItem>
                  {subEvents.map((subEvent) => (
                    <SelectItem key={subEvent.id} value={subEvent.id}>
                      {subEvent.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Organize suas fotos em álbuns dentro do evento
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Título das fotos (opcional)</Label>
            <Input
              id="title"
              placeholder="Ex: Final do Campeonato"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Preço por foto (R$)</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="files">Selecionar fotos</Label>
            <Input
              id="files"
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
            />
            {files && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-green-600">
                  ✓ {files.length} arquivo(s) selecionado(s)
                </p>
                {Array.from(files).map((file, index) => (
                  <p key={index} className="text-xs text-muted-foreground">
                    {file.name} - {(file.size / 1024 / 1024).toFixed(2)}MB
                  </p>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Tamanho máximo por arquivo: 2.5MB
            </p>
          </div>

          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progresso do upload</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={uploading}>
              Cancelar
            </Button>
            <Button onClick={handleUpload} disabled={uploading || !files || !selectedCampaign}>
              {uploading ? 'Enviando...' : 'Enviar Fotos'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UploadPhotoModal;