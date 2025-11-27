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
    <ResponsiveModal open={open} onOpenChange={onClose} className="sm:max-w-xl">
      <ResponsiveModalHeader className="border-b pb-4 bg-gradient-to-r from-primary/5 to-transparent">
        <ResponsiveModalTitle className="flex items-center gap-3 text-xl font-bold">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <FolderPlus className="h-5 w-5 text-primary" />
          </div>
          Criar Novo Álbum
        </ResponsiveModalTitle>
        <ResponsiveModalDescription className="text-sm mt-2">
          Organize as fotos de "<span className="font-semibold">{campaignTitle}</span>" em um novo álbum
        </ResponsiveModalDescription>
      </ResponsiveModalHeader>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          <div className="space-y-3">
            <Label htmlFor="title" className="font-semibold">Título do Álbum *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Ex: Final do Campeonato"
              required
              className="h-11"
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="description" className="font-semibold">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Descreva o momento ou a parte do evento..."
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-3">
              <Label htmlFor="location" className="font-semibold">Localização</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder="Ex: Estádio Principal"
                  className="pl-10 h-11"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="event_time" className="font-semibold">Data/Hora</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="event_time"
                  type="datetime-local"
                  value={formData.event_time}
                  onChange={(e) => handleInputChange('event_time', e.target.value)}
                  className="pl-10 h-11"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              size="lg"
              className="px-6"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              size="lg"
              className="px-8 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/95 hover:to-primary/85 font-bold shadow-lg hover:shadow-xl"
            >
              {loading ? "Criando..." : "Criar Álbum"}
            </Button>
          </div>
        </form>
    </ResponsiveModal>
  );
};

export default CreateAlbumModal;
