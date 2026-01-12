import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Calendar, MapPin, Percent, DollarSign, Lock } from 'lucide-react';
import { usePlatformPercentage } from '@/hooks/usePlatformPercentage';
import { Switch } from '@/components/ui/switch';

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
  const { percentage: platformPercentage, loading: loadingPercentage } = usePlatformPercentage();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Atualiza os valores iniciais quando a plataforma percentage é carregada
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    event_date: '',
    photographer_percentage: 91, // 100 - 9 (taxa fixa da plataforma)
    organization_percentage: 0,
    organization_id: organizationId || '',
    price_locked: false, // Se o preço é imutável
    locked_price: 10.00, // Preço fixo definido pelo admin
  });

  // Atualiza photographer_percentage quando platformPercentage muda
  useEffect(() => {
    if (!loadingPercentage && platformPercentage > 0) {
      setFormData(prev => ({
        ...prev,
        photographer_percentage: 100 - platformPercentage,
      }));
    }
  }, [platformPercentage, loadingPercentage]);
  const { toast } = useToast();

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Quando muda a porcentagem do fotógrafo, ajusta automaticamente a organização
  const handlePhotographerPercentageChange = (value: number) => {
    const availableForSplit = 100 - platformPercentage;
    const photographerPct = Math.max(0, Math.min(availableForSplit, value));
    const organizationPct = availableForSplit - photographerPct;
    
    setFormData(prev => ({
      ...prev,
      photographer_percentage: photographerPct,
      organization_percentage: organizationPct
    }));
  };

  // Quando muda a porcentagem da organização, ajusta automaticamente o fotógrafo
  const handleOrganizationPercentageChange = (value: number) => {
    const availableForSplit = 100 - platformPercentage;
    const organizationPct = Math.max(0, Math.min(availableForSplit, value));
    const photographerPct = availableForSplit - organizationPct;
    
    setFormData(prev => ({
      ...prev,
      photographer_percentage: photographerPct,
      organization_percentage: organizationPct
    }));
  };

  const calculatePercentages = () => {
    const platform = platformPercentage;
    const photographer = formData.photographer_percentage;
    const organization = formData.organization_percentage;
    const sum = platform + photographer + organization;
    const availableForSplit = 100 - platformPercentage;
    const isValid = sum === 100 && photographer + organization === availableForSplit;
    
    return {
      platform,
      photographer,
      organization,
      sum,
      isValid,
      remaining: availableForSplit - photographer - organization
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
    const availableForSplit = 100 - platformPercentage;
    
    if (!percentages.isValid) {
      toast({
        title: "Erro na divisão de receita",
        description: `A divisão entre fotógrafo e organização deve somar ${availableForSplit}% (plataforma mantém ${platformPercentage}% fixo). Atualmente: ${percentages.photographer + percentages.organization}%`,
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
          photographer_percentage: formData.photographer_percentage,
          organization_percentage: formData.organization_percentage,
          is_active: true,
          photographer_id: isAdmin ? null : profile?.id,
          created_by_admin: isAdmin,
          price_locked: isAdmin && formData.price_locked,
          locked_price: isAdmin && formData.price_locked ? formData.locked_price : null,
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
        photographer_percentage: 91, // 100 - 9 (taxa fixa)
        organization_percentage: 0,
        organization_id: organizationId || '',
        price_locked: false,
        locked_price: 10.00,
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
                  <p className="font-semibold text-primary">Taxa da plataforma: {platformPercentage}% | Você recebe: {100 - platformPercentage}% de cada venda</p>
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

          {/* Seção de Preço Bloqueado - apenas para admin */}
          {isAdmin && (
            <div className="space-y-4 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border-2 border-amber-300 dark:border-amber-800">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="font-semibold text-lg flex items-center gap-2">
                  <Lock className="h-5 w-5 text-amber-600" />
                  Preço Bloqueado (Imutável)
                </h4>
                <Switch
                  checked={formData.price_locked}
                  onCheckedChange={(checked) => setFormData({ ...formData, price_locked: checked })}
                />
              </div>
              
              {formData.price_locked && (
                <div className="space-y-3">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    ⚠️ Quando ativado, os fotógrafos NÃO poderão alterar o preço das fotos. 
                    Todas as fotos deste evento terão o preço fixo definido abaixo.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="locked_price" className="font-medium flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Preço Fixo por Foto (R$)
                    </Label>
                    <Input
                      id="locked_price"
                      type="number"
                      step="0.01"
                      min="1"
                      max="500"
                      value={formData.locked_price}
                      onChange={(e) => setFormData({ ...formData, locked_price: parseFloat(e.target.value) || 10 })}
                      className="w-full max-w-xs text-lg font-bold"
                    />
                    <p className="text-xs text-muted-foreground">
                      💡 Todas as fotos enviadas neste evento terão este preço
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Seção de Divisão de Receita - apenas para admin */}
          {isAdmin && (
          <div className="space-y-4 p-4 bg-muted/50 rounded-lg border-2 border-border">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h4 className="font-semibold text-lg flex items-center gap-2">
                <Percent className="h-5 w-5 text-primary" />
                Divisão de Receita
              </h4>
              <Badge variant="secondary">
                Taxa Plataforma: {platformPercentage}% (fixa)
              </Badge>
            </div>
            
            <div className="p-3 bg-card rounded-md border">
              <p className="text-sm text-muted-foreground">
                ℹ️ A plataforma mantém <strong>{platformPercentage}% fixo</strong> de cada venda. 
                Os <strong>{100 - platformPercentage}% restantes</strong> são divididos entre fotógrafo e organização (se houver).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="photographer_percentage" className="text-base font-medium">
                  <div className="flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    % Fotógrafo (dos {100 - platformPercentage}%)
                  </div>
                </Label>
                <Input
                  id="photographer_percentage"
                  type="number"
                  min="0"
                  max={100 - platformPercentage}
                  value={formData.photographer_percentage}
                  onChange={(e) => handlePhotographerPercentageChange(Number(e.target.value))}
                  className="text-lg font-semibold"
                />
                <p className="text-xs text-muted-foreground">
                  Máximo: {100 - platformPercentage}% (sem organização)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="organization_percentage" className="text-base font-medium">
                  <div className="flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    % Organização (dos {100 - platformPercentage}%)
                  </div>
                </Label>
                <Input
                  id="organization_percentage"
                  type="number"
                  min="0"
                  max={100 - platformPercentage}
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
                ? 'bg-success/10 border-success/30' 
                : 'bg-destructive/10 border-destructive/30'
            }`}>
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h5 className="font-semibold flex items-center gap-2">
                  Exemplo de Venda: R$ 100,00
                </h5>
                {percentages.isValid ? (
                  <Badge variant="default">✓ Divisão Válida</Badge>
                ) : (
                  <Badge variant="destructive">✗ Deve somar {100 - platformPercentage}%</Badge>
                )}
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 bg-primary/10 rounded">
                  <span className="font-medium">Plataforma ({platformPercentage}%)</span>
                  <span className="font-bold text-primary">R$ {platformPercentage.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-success/10 rounded">
                  <span className="font-medium">Fotógrafo ({percentages.photographer}%)</span>
                  <span className="font-bold text-success">
                    R$ {percentages.photographer.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-accent/10 rounded">
                  <span className="font-medium">Organização ({percentages.organization}%)</span>
                  <span className="font-bold text-accent-foreground">
                    R$ {percentages.organization.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-muted rounded font-bold border-t-2 border-border">
                  <span>TOTAL</span>
                  <span>{percentages.sum}%</span>
                </div>
              </div>
              
              {!percentages.isValid && (
                <p className="text-sm text-destructive mt-2 font-medium">
                  ⚠️ A soma de fotógrafo + organização deve ser exatamente {100 - platformPercentage}%! (Atualmente: {percentages.photographer + percentages.organization}%)
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