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
  organizationId?: string;
  organizationName?: string;
  onCampaignCreated: () => void;
  organizations?: Array<{ id: string; name: string }>;
}

export default function CreateCampaignModal({ 
  organizationId, 
  organizationName, 
  onCampaignCreated,
  organizations = []
}: CreateCampaignModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    event_date: '',
    platform_percentage: 60,
    photographer_percentage: 10,
    organization_percentage: 30,
    organization_id: organizationId || '',
  });
  const { toast } = useToast();

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const calculatePercentages = () => {
    const sum = formData.platform_percentage + formData.photographer_percentage + formData.organization_percentage;
    const isValid = sum === 100;
    
    return {
      platform: formData.platform_percentage,
      photographer: formData.photographer_percentage,
      organization: formData.organization_percentage,
      sum,
      isValid,
    };
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

    const percentages = calculatePercentages();
    if (!percentages.isValid) {
      toast({
        title: "Erro",
        description: `A soma das porcentagens deve ser 100%. Atualmente: ${percentages.sum}%`,
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
          organization_id: formData.organization_id || null,
          platform_percentage: formData.platform_percentage,
          photographer_percentage: formData.photographer_percentage,
          organization_percentage: formData.organization_percentage,
          is_active: true,
          photographer_id: null,
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Evento criado com sucesso! Fotógrafos podem se candidatar agora.",
      });

      // Reset form
      setFormData({
        title: '',
        description: '',
        location: '',
        event_date: '',
        platform_percentage: 60,
        photographer_percentage: 10,
        organization_percentage: 30,
        organization_id: organizationId || '',
      });
      
      setOpen(false);
      onCampaignCreated();
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast({
        title: "Erro",
        description: "Falha ao criar evento",
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
          Novo Evento
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Criar Novo Evento</DialogTitle>
          <DialogDescription>
            {organizationName 
              ? `Crie um evento para ${organizationName}. Fotógrafos poderão se candidatar para cobrir este evento.`
              : 'Crie um novo evento. Fotógrafos poderão se candidatar para cobrir este evento.'
            }
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {organizations.length > 0 && !organizationId && (
            <div className="space-y-2">
              <Label htmlFor="organization">Organização *</Label>
              <select
                id="organization"
                value={formData.organization_id}
                onChange={(e) => handleInputChange('organization_id', e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                required
              >
                <option value="">Selecione uma organização</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título do Evento *</Label>
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
              <Label htmlFor="platform_percentage">
                <div className="flex items-center gap-2">
                  <Percent className="h-4 w-4" />
                  % Plataforma
                </div>
              </Label>
              <Input
                id="platform_percentage"
                type="number"
                min="0"
                max="100"
                value={formData.platform_percentage}
                onChange={(e) => handleInputChange('platform_percentage', Number(e.target.value))}
                placeholder="60"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="photographer_percentage">
                <div className="flex items-center gap-2">
                  <Percent className="h-4 w-4" />
                  % Fotógrafo
                </div>
              </Label>
              <Input
                id="photographer_percentage"
                type="number"
                min="0"
                max="100"
                value={formData.photographer_percentage}
                onChange={(e) => handleInputChange('photographer_percentage', Number(e.target.value))}
                placeholder="10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="organization_percentage">
                <div className="flex items-center gap-2">
                  <Percent className="h-4 w-4" />
                  % Organização
                </div>
              </Label>
              <Input
                id="organization_percentage"
                type="number"
                min="0"
                max="100"
                value={formData.organization_percentage}
                onChange={(e) => handleInputChange('organization_percentage', Number(e.target.value))}
                placeholder="30"
              />
            </div>
          </div>

          {/* Preview das Porcentagens */}
          <div className={`p-4 rounded-lg border-2 transition-all ${
            percentages.isValid 
              ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900/30' 
              : 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900/30'
          }`}>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Percent className="h-4 w-4" />
              Distribuição de Receita
              {!percentages.isValid && (
                <Badge variant="destructive" className="ml-2">Soma: {percentages.sum}%</Badge>
              )}
              {percentages.isValid && (
                <Badge className="ml-2 bg-green-600">✓ Válido</Badge>
              )}
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <Badge variant="outline" className="w-full justify-center bg-blue-50 dark:bg-blue-950/20">
                  Plataforma: {percentages.platform}%
                </Badge>
              </div>
              <div className="text-center">
                <Badge variant="default" className="w-full justify-center bg-amber-500 hover:bg-amber-600">
                  Organização: {percentages.organization}%
                </Badge>
              </div>
              <div className="text-center">
                <Badge variant="secondary" className="w-full justify-center bg-green-500 hover:bg-green-600 text-white">
                  Fotógrafo: {percentages.photographer}%
                </Badge>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2 text-center">
              {percentages.isValid 
                ? 'Cada venda será dividida conforme as porcentagens acima.' 
                : '⚠️ A soma das porcentagens deve ser exatamente 100%'}
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