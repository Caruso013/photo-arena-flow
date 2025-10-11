import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/components/ui/use-toast';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

interface EditCampaignCoverModalProps {
  campaignId: string;
  campaignTitle: string;
  currentCoverUrl?: string;
  open: boolean;
  onClose: () => void;
  onCoverUpdated: () => void;
}

const EditCampaignCoverModal: React.FC<EditCampaignCoverModalProps> = ({
  campaignId,
  campaignTitle,
  currentCoverUrl,
  open,
  onClose,
  onCoverUpdated
}) => {
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>(currentCoverUrl || '');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione uma imagem válida');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('A imagem deve ter no máximo 5MB');
      return;
    }

    setError('');
    setSelectedFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setPreviewUrl(currentCoverUrl || '');
    setError('');
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) return;

    setIsUploading(true);
    setError('');

    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${campaignId}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('campaign-covers')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('campaign-covers')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('campaigns')
        .update({ cover_image_url: urlData.publicUrl })
        .eq('id', campaignId);

      if (updateError) throw updateError;

      if (currentCoverUrl) {
        try {
          const oldPath = currentCoverUrl.split('/campaign-covers/')[1];
          if (oldPath) {
            await supabase.storage
              .from('campaign-covers')
              .remove([oldPath]);
          }
        } catch (deleteError) {
          console.log('Erro ao deletar imagem antiga:', deleteError);
        }
      }

      toast({
        title: "Capa atualizada!",
        description: "A capa do evento foi atualizada com sucesso.",
      });

      onCoverUpdated();
      onClose();
    } catch (error: any) {
      console.error('Error uploading cover:', error);
      setError(error.message || 'Erro ao fazer upload da capa');
      toast({
        title: "Erro no upload",
        description: "Não foi possível atualizar a capa. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Editar Capa do Evento
          </DialogTitle>
          <DialogDescription>
            Atualize a imagem de capa de: <span className="font-semibold">{campaignTitle}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {previewUrl && (
            <div className="relative">
              <Label>Preview da Capa</Label>
              <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-muted mt-2">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                {selectedFile && (
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={handleRemoveFile}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="cover-upload">
              {selectedFile ? 'Trocar Imagem' : 'Nova Imagem de Capa'}
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="cover-upload"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="cursor-pointer"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => document.getElementById('cover-upload')?.click()}
              >
                <Upload className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Formatos aceitos: JPG, PNG, WEBP (máx 5MB). Recomendado: 1920x1080px
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isUploading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Atualizar Capa
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditCampaignCoverModal;