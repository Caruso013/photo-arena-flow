import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ResponsiveModal, ResponsiveModalHeader, ResponsiveModalTitle, ResponsiveModalDescription } from '@/components/ui/responsive-modal';
import { toast } from '@/hooks/use-toast';
import { FolderPlus, Calendar, MapPin } from 'lucide-react';

interface CreateAlbumModalProps {
  campaignId: string;
  campaignTitle: string;
  open: boolean;
  onClose: () => void;
  onAlbumCreated: () => void;
}

const CreateAlbumModal: React.FC<CreateAlbumModalProps> = ({ 
  campaignId, 
  campaignTitle, 
  open, 
  onClose, 
  onAlbumCreated 
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    event_time: '',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast({
        title: "Erro",
        description: "Título do álbum é obrigatório",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('sub_events')
        .insert({
          campaign_id: campaignId,
          title: formData.title,
          description: formData.description || null,
          location: formData.location || null,
          event_time: formData.event_time || null,
          is_active: true,
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Álbum criado com sucesso!",
      });

      // Reset form
      setFormData({
        title: '',
        description: '',
        location: '',
        event_time: '',
      });
      
      onAlbumCreated();
      onClose();
    } catch (error) {
      console.error('Error creating album:', error);
      toast({
        title: "Erro",
        description: "Falha ao criar álbum",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ResponsiveModal open={open} onOpenChange={onClose} className="sm:max-w-md">
      <ResponsiveModalHeader>
        <ResponsiveModalTitle className="flex items-center gap-2">
          <FolderPlus className="h-5 w-5" />
          Criar Novo Álbum
        </ResponsiveModalTitle>
        <ResponsiveModalDescription>
          Crie um álbum de fotos dentro de "{campaignTitle}"
        </ResponsiveModalDescription>
      </ResponsiveModalHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título do Álbum *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Ex: Final do Campeonato"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Descreva o momento ou a parte do evento..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Localização</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="Ex: Estádio Principal"
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="event_time">Data/Hora do Sub-evento</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="event_time"
                type="datetime-local"
                value={formData.event_time}
                onChange={(e) => handleInputChange('event_time', e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Criando..." : "Criar Álbum"}
            </Button>
          </div>
        </form>
    </ResponsiveModal>
  );
};

export default CreateAlbumModal;
