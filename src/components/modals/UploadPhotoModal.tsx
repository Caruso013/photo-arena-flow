import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { Upload, X } from 'lucide-react';

interface Campaign {
  id: string;
  title: string;
}

interface UploadPhotoModalProps {
  onClose: () => void;
  onUploadComplete: () => void;
}

const UploadPhotoModal: React.FC<UploadPhotoModalProps> = ({ onClose, onUploadComplete }) => {
  const { profile } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('10.00');
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    fetchCampaigns();
  }, []);

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
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
            <Label htmlFor="campaign">Evento</Label>
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
              <p className="text-sm text-muted-foreground">
                {files.length} arquivo(s) selecionado(s)
              </p>
            )}
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