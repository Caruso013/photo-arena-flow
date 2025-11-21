import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/use-toast';
import { Save, Calendar, MapPin, AlignLeft, Upload, X, Image as ImageIcon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface EditEventModalProps {
  campaignId: string;
  campaignData: {
    title: string;
    description?: string;
    location?: string;
    event_date?: string;
    is_active: boolean;
    cover_image_url?: string;
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
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('campaign-covers').getPublicUrl(fileName);
        coverImageUrl = urlData.publicUrl;
      }

      await supabase.from('campaigns').update({
        title: title.trim(),
        description: description.trim() || null,
        location: location.trim() || null,
        event_date: eventDate || null,
        is_active: isActive,
        cover_image_url: coverImageUrl
      }).eq('id', campaignId);

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
