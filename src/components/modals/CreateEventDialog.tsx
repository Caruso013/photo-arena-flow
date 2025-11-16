import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Calendar, MapPin, Loader2 } from 'lucide-react';

interface CreateEventDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onEventCreated: () => void;
}

export default function CreateEventDialog({ isOpen, onClose, onEventCreated }: CreateEventDialogProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    event_date: '',
  });
  const { toast } = useToast();

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
        description: "Título do evento é obrigatório",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('campaigns')
        .insert({
          title: formData.title,
          description: formData.description || null,
          location: formData.location || null,
          event_date: formData.event_date || null,
          photographer_percentage: 91, // Padrão: 91% para fotógrafo (9% plataforma)
          organization_percentage: 0,
          is_active: true,
          photographer_id: profile?.id,
        });

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Evento criado com sucesso! Você já pode fazer upload de fotos.",
      });

      // Reset form
      setFormData({
        title: '',
        description: '',
        location: '',
        event_date: '',
      });
      
      onEventCreated();
    } catch (error: any) {
      console.error('Error creating campaign:', error);
      const errorMessage = error?.message || "Falha ao criar evento. Tente novamente.";
      toast({
        title: "Erro ao criar evento",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">Criar Novo Evento</DialogTitle>
          <DialogDescription>
            Preencha os dados do evento. Você poderá fazer upload de fotos após a criação.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-foreground">
              Título do Evento <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Ex: Casamento João e Maria"
              required
              className="bg-background text-foreground border-input"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location" className="text-foreground">Localização</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder="Ex: São Paulo, SP"
                  className="pl-10 bg-background text-foreground border-input"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="event_date" className="text-foreground">Data do Evento</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="event_date"
                  type="datetime-local"
                  value={formData.event_date}
                  onChange={(e) => handleInputChange('event_date', e.target.value)}
                  className="pl-10 bg-background text-foreground border-input"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-foreground">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Descreva o evento, horários, informações relevantes..."
              rows={4}
              className="bg-background text-foreground border-input"
            />
          </div>

          <div className="p-3 bg-primary/10 dark:bg-primary/20 border border-primary/30 rounded-lg">
            <p className="text-sm text-foreground">
              💰 <strong>Comissão:</strong> Você recebe 91% do valor de cada foto vendida. 
              A plataforma retém 9% para manutenção do serviço.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar Evento'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
