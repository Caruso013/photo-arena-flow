import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Calendar, MapPin, Percent } from 'lucide-react';

interface CreateCampaignModalProps {
  organizationId: string;
  organizationName: string;
  onCampaignCreated: () => void;
}

export default function CreateCampaignModal({ 
  organizationId, 
  organizationName, 
  onCampaignCreated 
}: CreateCampaignModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    event_date: '',
    organization_percentage: 30, // Padrão: 30% para organização
  });
  const { toast } = useToast();

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const calculatePercentages = () => {
    const photographerPercentage = 10; // Fotógrafo sempre fica com 10%
    const organizationPercentage = formData.organization_percentage;
    const platformPercentage = 90 - organizationPercentage; // Plataforma pega o restante dos 90%
    
    return {
      platform: platformPercentage,
      organization: organizationPercentage,
      photographer: photographerPercentage
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast({
        title: "Erro",
        description: "Título da campanha é obrigatório",
        variant: "destructive",
      });
      return;
    }

    const percentages = calculatePercentages();
    if (percentages.photographer !== 10) {
      toast({
        title: "Erro",
        description: "Porcentagem do fotógrafo é fixa em 10%",
        variant: "destructive",
      });
      return;
    }

    if (percentages.organization < 10 || percentages.organization > 80) {
      toast({
        title: "Erro",
        description: "Porcentagem da organização deve estar entre 10% e 80%",
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
          organization_id: organizationId,
          organization_percentage: formData.organization_percentage,
          is_active: true,
          photographer_id: '', // Será definido quando fotógrafo for aprovado
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Campanha criada com sucesso! Fotógrafos podem se candidatar agora.",
      });

      // Reset form
      setFormData({
        title: '',
        description: '',
        location: '',
        event_date: '',
        organization_percentage: 30,
      });
      
      setOpen(false);
      onCampaignCreated();
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast({
        title: "Erro",
        description: "Falha ao criar campanha",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const percentages = calculatePercentages();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nova Campanha
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Criar Nova Campanha</DialogTitle>
          <DialogDescription>
            Crie uma campanha para {organizationName}. Fotógrafos poderão se candidatar para cobrir este evento.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título da Campanha *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Ex: Corrida de São Silvestre 2024"
                required
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
                  placeholder="Ex: São Paulo, SP"
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Descreva o evento, horários, expectativas..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="event_date">Data do Evento</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="event_date"
                  type="datetime-local"
                  value={formData.event_date}
                  onChange={(e) => handleInputChange('event_date', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="organization_percentage">
                <div className="flex items-center gap-2">
                  <Percent className="h-4 w-4" />
                  Porcentagem da Organização
                </div>
              </Label>
              <Input
                id="organization_percentage"
                type="number"
                min="10"
                max="80"
                value={formData.organization_percentage}
                onChange={(e) => handleInputChange('organization_percentage', Number(e.target.value))}
                placeholder="30"
              />
              <p className="text-xs text-muted-foreground">
                Fotógrafo sempre recebe 10%. O restante (90%) é dividido entre plataforma e organização.
              </p>
            </div>
          </div>

          {/* Preview das Porcentagens */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Percent className="h-4 w-4" />
              Distribuição de Receita
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <Badge variant="outline" className="w-full justify-center">
                  Plataforma: {percentages.platform}%
                </Badge>
              </div>
              <div className="text-center">
                <Badge variant="default" className="w-full justify-center bg-amber-500 hover:bg-amber-600">
                  {organizationName}: {percentages.organization}%
                </Badge>
              </div>
              <div className="text-center">
                <Badge variant="secondary" className="w-full justify-center bg-green-500 hover:bg-green-600 text-white">
                  Fotógrafo: {percentages.photographer}%
                </Badge>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2 text-center">
              Cada venda será dividida conforme as porcentagens acima. Fotógrafo sempre recebe 10%.
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Criando..." : "Criar Campanha"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}