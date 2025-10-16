import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    event_date: '',
    photographer_percentage: 93, // Padrão: fotógrafo fica com tudo (93%)
    organization_percentage: 0,   // Padrão: sem organização
    organization_id: organizationId || '',
  });
  const { toast } = useToast();

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Quando muda a porcentagem do fotógrafo, ajusta automaticamente a organização
  const handlePhotographerPercentageChange = (value: number) => {
    const photographerPct = Math.max(0, Math.min(93, value));
    const organizationPct = 93 - photographerPct;
    
    setFormData(prev => ({
      ...prev,
      photographer_percentage: photographerPct,
      organization_percentage: organizationPct
    }));
  };

  // Quando muda a porcentagem da organização, ajusta automaticamente o fotógrafo
  const handleOrganizationPercentageChange = (value: number) => {
    const organizationPct = Math.max(0, Math.min(93, value));
    const photographerPct = 93 - organizationPct;
    
    setFormData(prev => ({
      ...prev,
      photographer_percentage: photographerPct,
      organization_percentage: organizationPct
    }));
  };

  const calculatePercentages = () => {
    const platform = 7; // FIXO
    const photographer = formData.photographer_percentage;
    const organization = formData.organization_percentage;
    const sum = platform + photographer + organization;
    const isValid = sum === 100 && photographer + organization === 93;
    
    return {
      platform,
      photographer,
      organization,
      sum,
      isValid,
      remaining: 93 - photographer - organization
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
        title: "Erro na divisão de receita",
        description: `A divisão entre fotógrafo e organização deve somar 93% (plataforma mantém 7% fixo). Atualmente: ${percentages.photographer + percentages.organization}%`,
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
          platform_percentage: 7, // SEMPRE 7%
          photographer_percentage: formData.photographer_percentage,
          organization_percentage: formData.organization_percentage,
          is_active: true,
          photographer_id: profile?.id, // Pega o ID do fotógrafo logado
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
        photographer_percentage: 93,
        organization_percentage: 0,
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
        <Button className="flex items-center gap-2" variant="default" size="default">
          <Plus className="h-4 w-4" />
          Criar Evento
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[95vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="pb-2 sm:pb-4">
          <DialogTitle className="text-lg sm:text-xl">Criar Novo Evento</DialogTitle>
          <DialogDescription className="text-sm">
            {isAdmin 
              ? (organizationName 
                  ? `Crie um evento para ${organizationName}. Fotógrafos poderão se candidatar para cobrir este evento.`
                  : 'Crie um novo evento. Fotógrafos poderão se candidatar para cobrir este evento.')
              : (
                <div className="space-y-1">
                  <p>Crie seu evento e comece a fazer upload de fotos.</p>
                  <p className="font-semibold text-primary">Taxa da plataforma: 7% | Você recebe: 93% de cada venda</p>
                </div>
              )
            }
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {isAdmin && organizations.length > 0 && !organizationId && (
            <div className="space-y-2">
              <Label htmlFor="organization" className="text-sm">Organização *</Label>
              <select
                id="organization"
                value={formData.organization_id}
                onChange={(e) => handleInputChange('organization_id', e.target.value)}
                className="w-full px-3 py-2 h-11 sm:h-12 text-sm border rounded-md"
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm">Título do Evento *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Ex: Corrida de São Silvestre 2024"
                required
                className="h-11 sm:h-12 text-sm"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="location" className="text-sm">Localização</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 sm:top-3.5 h-4 w-4 text-muted-foreground" />
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
          </div>

          {/* Seção de Divisão de Receita - apenas para admin */}
          {isAdmin && (
          <div className="space-y-4 p-4 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg border-2 border-blue-200 dark:border-blue-900/30">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-lg flex items-center gap-2">
                <Percent className="h-5 w-5 text-blue-600" />
                Divisão de Receita
              </h4>
              <Badge className="bg-blue-600">
                Taxa Plataforma: 7% (fixa)
              </Badge>
            </div>
            
            <div className="p-3 bg-white/50 dark:bg-gray-900/50 rounded-md border">
              <p className="text-sm text-muted-foreground">
                ℹ️ A plataforma mantém <strong>7% fixo</strong> de cada venda. 
                Os <strong>93% restantes</strong> são divididos entre fotógrafo e organização (se houver).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="photographer_percentage" className="text-base font-medium">
                  <div className="flex items-center gap-2">
                    <Percent className="h-4 w-4 text-green-600" />
                    % Fotógrafo (dos 93%)
                  </div>
                </Label>
                <Input
                  id="photographer_percentage"
                  type="number"
                  min="0"
                  max="93"
                  value={formData.photographer_percentage}
                  onChange={(e) => handlePhotographerPercentageChange(Number(e.target.value))}
                  className="text-lg font-semibold"
                />
                <p className="text-xs text-muted-foreground">
                  Máximo: 93% (sem organização)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="organization_percentage" className="text-base font-medium">
                  <div className="flex items-center gap-2">
                    <Percent className="h-4 w-4 text-amber-600" />
                    % Organização (dos 93%)
                  </div>
                </Label>
                <Input
                  id="organization_percentage"
                  type="number"
                  min="0"
                  max="93"
                  value={formData.organization_percentage}
                  onChange={(e) => handleOrganizationPercentageChange(Number(e.target.value))}
                  className="text-lg font-semibold"
                  disabled={!formData.organization_id}
                />
                <p className="text-xs text-muted-foreground">
                  {formData.organization_id ? 'Ajuste conforme acordo' : 'Selecione uma organização primeiro'}
                </p>
              </div>
            </div>

            {/* Preview Visual da Divisão */}
            <div className={`p-4 rounded-lg border-2 transition-all ${
              percentages.isValid 
                ? 'bg-green-50 border-green-300 dark:bg-green-950/20 dark:border-green-800' 
                : 'bg-red-50 border-red-300 dark:bg-red-950/20 dark:border-red-800'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <h5 className="font-semibold flex items-center gap-2">
                  Exemplo de Venda: R$ 100,00
                </h5>
                {percentages.isValid ? (
                  <Badge className="bg-green-600">✓ Divisão Válida</Badge>
                ) : (
                  <Badge variant="destructive">✗ Deve somar 93%</Badge>
                )}
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 bg-blue-100 dark:bg-blue-900/30 rounded">
                  <span className="font-medium">Plataforma (7%)</span>
                  <span className="font-bold text-blue-700 dark:text-blue-400">R$ 7,00</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-green-100 dark:bg-green-900/30 rounded">
                  <span className="font-medium">Fotógrafo ({percentages.photographer}%)</span>
                  <span className="font-bold text-green-700 dark:text-green-400">
                    R$ {percentages.photographer.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-amber-100 dark:bg-amber-900/30 rounded">
                  <span className="font-medium">Organização ({percentages.organization}%)</span>
                  <span className="font-bold text-amber-700 dark:text-amber-400">
                    R$ {percentages.organization.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-200 dark:bg-gray-700 rounded font-bold border-t-2 border-gray-400">
                  <span>TOTAL</span>
                  <span>{percentages.sum}%</span>
                </div>
              </div>
              
              {!percentages.isValid && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-2 font-medium">
                  ⚠️ A soma de fotógrafo + organização deve ser exatamente 93%! (Atualmente: {percentages.photographer + percentages.organization}%)
                </p>
              )}
            </div>
          </div>
          )}

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