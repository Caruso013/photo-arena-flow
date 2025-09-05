import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { Plus } from 'lucide-react';

interface CreateCampaignModalProps {
  onClose: () => void;
  onCampaignCreated: () => void;
}

const CreateCampaignModal: React.FC<CreateCampaignModalProps> = ({ onClose, onCampaignCreated }) => {
  const { profile } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_date: '',
    location: '',
  });
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverImage(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.event_date) {
      toast({
        title: "Dados obrigatórios",
        description: "Por favor, preencha pelo menos o título e a data do evento.",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);

    try {
      let coverImageUrl = '';

      // Upload cover image if provided
      if (coverImage) {
        const fileExt = coverImage.name.split('.').pop();
        const fileName = `${profile?.id}/cover_${Date.now()}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('campaign-covers')
          .upload(fileName, coverImage);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('campaign-covers')
          .getPublicUrl(fileName);

        coverImageUrl = urlData.publicUrl;
      }

      // Create campaign
      const { error: campaignError } = await supabase
        .from('campaigns')
        .insert({
          photographer_id: profile?.id,
          title: formData.title,
          description: formData.description,
          event_date: formData.event_date,
          location: formData.location,
          cover_image_url: coverImageUrl,
          is_active: true,
        });

      if (campaignError) throw campaignError;

      toast({
        title: "Evento criado",
        description: "Seu evento foi criado com sucesso!",
      });

      onCampaignCreated();
      onClose();
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast({
        title: "Erro ao criar evento",
        description: "Ocorreu um erro ao criar o evento. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Criar Novo Evento
          </DialogTitle>
          <DialogDescription>
            Crie um novo evento para organizar suas fotos
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título do Evento *</Label>
            <Input
              id="title"
              name="title"
              placeholder="Ex: Campeonato Regional de Futebol"
              value={formData.title}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Descreva o evento..."
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="event_date">Data do Evento *</Label>
            <Input
              id="event_date"
              name="event_date"
              type="date"
              value={formData.event_date}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Local</Label>
            <Input
              id="location"
              name="location"
              placeholder="Ex: Estádio Municipal"
              value={formData.location}
              onChange={handleInputChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cover_image">Imagem de Capa (opcional)</Label>
            <Input
              id="cover_image"
              type="file"
              accept="image/*"
              onChange={handleCoverImageChange}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={creating}>
              Cancelar
            </Button>
            <Button type="submit" disabled={creating}>
              {creating ? 'Criando...' : 'Criar Evento'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateCampaignModal;