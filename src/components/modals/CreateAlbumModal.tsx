import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ResponsiveModal, ResponsiveModalHeader, ResponsiveModalTitle, ResponsiveModalDescription } from '@/components/ui/responsive-modal';
import { toast } from '@/hooks/use-toast';
import { FolderPlus, Calendar, MapPin, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';

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
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    setError(null);
    
    if (!formData.title.trim()) {
      setError("Título do álbum é obrigatório");
      toast({
        title: "Erro",
        description: "Título do álbum é obrigatório",
        variant: "destructive",
      });
      return;
    }

    if (!profile?.id) {
      setError("Você precisa estar logado para criar um álbum");
      toast({
        title: "Erro",
        description: "Você precisa estar logado para criar um álbum",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      console.log('Creating album:', { campaignId, userId: profile.id, title: formData.title });

      // Verificar se o fotógrafo está atribuído à campanha
      const { data: assignment, error: assignmentError } = await supabase
        .from('campaign_photographers')
        .select('is_active')
        .eq('campaign_id', campaignId)
        .eq('photographer_id', profile.id)
        .single();

      if (assignmentError || !assignment?.is_active) {
        console.error('Assignment check failed:', assignmentError);
        throw new Error('Você não tem permissão para criar álbuns neste evento. Verifique se você está atribuído a esta campanha.');
      }

      // Criar o álbum
      const { data, error: insertError } = await supabase
        .from('sub_events')
        .insert({
          campaign_id: campaignId,
          title: formData.title.trim(),
          description: formData.description?.trim() || null,
          location: formData.location?.trim() || null,
          event_time: formData.event_time || null,
          is_active: true,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Insert error:', insertError);
        throw insertError;
      }

      console.log('Album created successfully:', data);

      toast({
        title: "✅ Sucesso!",
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
    } catch (error: any) {
      console.error('Error creating album:', error);
      
      let errorMessage = "Falha ao criar álbum";
      
      if (error.message?.includes('permissão')) {
        errorMessage = error.message;
      } else if (error.code === '42501') {
        errorMessage = "Você não tem permissão para criar álbuns neste evento";
      } else if (error.code === '23503') {
        errorMessage = "Campanha inválida ou não encontrada";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      toast({
        title: "Erro ao criar álbum",
        description: errorMessage,
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
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
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
