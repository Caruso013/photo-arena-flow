import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/use-toast';
import { Save, Calendar, MapPin, AlignLeft, Upload, X, Image as ImageIcon, Gift } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface EditEventModalProps {
  campaignId: string;
  campaignData: {
    title: string;
    description?: string;
    location?: string;
    event_date?: string;
    is_active: boolean;
    cover_image_url?: string;
    progressive_discount_enabled?: boolean;
  };
  open: boolean;
  onClose: () => void;
  onEventUpdated: () => void;
}

const EditEventModal: React.FC<EditEventModalProps> = ({
  campaignId,
  campaignData,
  open,
  onClose,
  onEventUpdated
}) => {
  const [title, setTitle] = useState(campaignData.title);
  const [description, setDescription] = useState(campaignData.description || '');
  const [location, setLocation] = useState(campaignData.location || '');
  const [eventDate, setEventDate] = useState(campaignData.event_date || '');
  const [isActive, setIsActive] = useState(campaignData.is_active);
  const [progressiveDiscountEnabled, setProgressiveDiscountEnabled] = useState(campaignData.progressive_discount_enabled ?? true); // Habilitado por padrão
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>(campaignData.cover_image_url || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.size > 5 * 1024 * 1024) return;
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreviewUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setIsSubmitting(true);

    try {
      let coverImageUrl = campaignData.cover_image_url;

      if (selectedFile) {
        const fileName = `${campaignId}_${Date.now()}.${selectedFile.name.split('.').pop()}`;
        const { error: uploadError } = await supabase.storage.from('campaign-covers').upload(fileName, selectedFile);
        
        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast({ 
            title: "Erro no upload", 
            description: "Não foi possível enviar a imagem. Tente novamente.",
            variant: "destructive" 
          });
          throw uploadError;
        }
        
        const { data: urlData } = supabase.storage.from('campaign-covers').getPublicUrl(fileName);
        coverImageUrl = urlData.publicUrl;
      }

      const { error: updateError } = await supabase.from('campaigns').update({
        title: title.trim(),
        description: description.trim() || null,
        location: location.trim() || null,
        event_date: eventDate || null,
        is_active: isActive,
        progressive_discount_enabled: progressiveDiscountEnabled,
        cover_image_url: coverImageUrl
      }).eq('id', campaignId);

      if (updateError) throw updateError;

      toast({ title: "Evento atualizado!" });
      onEventUpdated();
      onClose();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Evento</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="info">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="cover">Capa</TabsTrigger>
          </TabsList>
          <TabsContent value="info" className="space-y-4">
            <div>
              <Label>Título *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>
            <div>
              <Label>Localização</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
            <div>
              <Label>Data</Label>
              <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
            </div>
            <div className="flex items-center justify-between p-3 border rounded">
              <Label>Evento Ativo</Label>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
            <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-primary/20">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Gift className="h-4 w-4 text-primary" />
                  <Label className="text-sm font-medium">Descontos Progressivos</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  {progressiveDiscountEnabled 
                    ? 'Clientes ganham descontos ao comprar múltiplas fotos' 
                    : 'Desativado - clientes pagam preço integral'}
                </p>
              </div>
              <Switch 
                checked={progressiveDiscountEnabled} 
                onCheckedChange={setProgressiveDiscountEnabled} 
              />
            </div>
            {progressiveDiscountEnabled && (
              <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                <Gift className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertDescription className="text-blue-900 dark:text-blue-100">
                  <div className="space-y-1 text-xs">
                    <p className="font-medium mb-1">Tabela de descontos automáticos:</p>
                    <div className="flex justify-between">
                      <span>• 2 a 4 fotos</span>
                      <span className="font-semibold">5% OFF</span>
                    </div>
                    <div className="flex justify-between">
                      <span>• 5 a 9 fotos</span>
                      <span className="font-semibold">10% OFF</span>
                    </div>
                    <div className="flex justify-between">
                      <span>• 10 ou mais fotos</span>
                      <span className="font-semibold">20% OFF</span>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
          <TabsContent value="cover" className="space-y-4">
            {previewUrl && <img src={previewUrl} className="w-full aspect-video object-cover rounded" />}
            <Input type="file" accept="image/*" onChange={handleFileSelect} />
          </TabsContent>
        </Tabs>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditEventModal;
