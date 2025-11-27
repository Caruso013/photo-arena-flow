import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ResponsiveModal, ResponsiveModalHeader, ResponsiveModalTitle, ResponsiveModalDescription } from '@/components/ui/responsive-modal';
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
      // VALIDAÇÕES DE SEGURANÇA
      const MAX_SIZE = 5 * 1024 * 1024; // 5MB
      const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      
      if (selectedFile.size > MAX_SIZE) {
        throw new Error(`Arquivo muito grande (${(selectedFile.size / 1024 / 1024).toFixed(2)}MB). Máximo: 5MB`);
      }
      
      if (!ALLOWED_TYPES.includes(selectedFile.type)) {
        throw new Error('Tipo de arquivo inválido. Use apenas: JPG, PNG ou WebP');
      }

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
    <ResponsiveModal open={open} onOpenChange={onClose} className="max-w-3xl">
      <ResponsiveModalHeader className="border-b pb-4 bg-gradient-to-r from-primary/5 to-transparent">
        <ResponsiveModalTitle className="flex items-center gap-3 text-xl font-bold">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <ImageIcon className="h-5 w-5 text-primary" />
          </div>
          Editar Capa do Evento
        </ResponsiveModalTitle>
        <ResponsiveModalDescription className="text-sm mt-2">
          Atualize a imagem de capa de: <span className="font-semibold">{campaignTitle}</span>
        </ResponsiveModalDescription>
      </ResponsiveModalHeader>

        <div className="space-y-6 p-6">
          {previewUrl && (
            <div className="space-y-3">
              <Label className="font-semibold">Preview da Capa</Label>
              <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-muted border-2 border-border">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                {selectedFile && (
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-3 right-3 rounded-full shadow-lg"
                    onClick={handleRemoveFile}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Label htmlFor="cover-upload" className="font-semibold">
              {selectedFile ? 'Trocar Imagem' : 'Selecionar Nova Capa'}
            </Label>
            <label 
              htmlFor="cover-upload"
              className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-primary/50 rounded-xl cursor-pointer bg-gradient-to-br from-primary/5 to-primary/10 hover:from-primary/10 hover:to-primary/15 transition-all group"
            >
              <div className="flex flex-col items-center gap-2">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Upload className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm font-bold text-foreground">Clique para selecionar</p>
                <p className="text-xs text-muted-foreground">JPG, PNG, WEBP • Máx 5MB</p>
              </div>
              <Input
                id="cover-upload"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isUploading}
              size="lg"
              className="px-6"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              size="lg"
              className="px-8 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/95 hover:to-primary/85 font-bold shadow-lg hover:shadow-xl"
            >
              {isUploading ? (
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Enviando
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Atualizar Capa
                </div>
              )}
            </Button>
          </div>
        </div>
    </ResponsiveModal>
  );
};

export default EditCampaignCoverModal;