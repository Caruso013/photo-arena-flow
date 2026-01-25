import React from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Building2, Cpu } from 'lucide-react';

interface OrganizerSelectorProps {
  organizationType: 'platform' | 'organization';
  organizationId: string | null;
  photographerPercentage: number;
  organizationPercentage: number;
  platformPercentage: number;
  organizations: Array<{ id: string; name: string }>;
  onChange: (data: {
    organizationType: 'platform' | 'organization';
    organizationId: string | null;
    photographerPercentage: number;
    organizationPercentage: number;
  }) => void;
  disabled?: boolean;
}

export const OrganizerSelector: React.FC<OrganizerSelectorProps> = ({
  organizationType,
  organizationId,
  photographerPercentage,
  organizationPercentage,
  platformPercentage,
  organizations,
  onChange,
  disabled = false,
}) => {
  const availablePercentage = 100 - platformPercentage;

  const handleTypeChange = (type: 'platform' | 'organization') => {
    if (type === 'platform') {
      onChange({
        organizationType: 'platform',
        organizationId: null,
        photographerPercentage: availablePercentage,
        organizationPercentage: 0,
      });
    } else {
      onChange({
        organizationType: 'organization',
        organizationId: organizationId || (organizations[0]?.id || null),
        photographerPercentage: Math.round(availablePercentage * 0.77), // ~70% do disponível
        organizationPercentage: Math.round(availablePercentage * 0.23), // ~21% do disponível
      });
    }
  };

  const handleOrganizationChange = (orgId: string) => {
    onChange({
      organizationType: 'organization',
      organizationId: orgId,
      photographerPercentage,
      organizationPercentage,
    });
  };

  const handlePhotographerSliderChange = (value: number[]) => {
    const photographerPct = value[0];
    const organizationPct = availablePercentage - photographerPct;
    onChange({
      organizationType: 'organization',
      organizationId,
      photographerPercentage: photographerPct,
      organizationPercentage: organizationPct,
    });
  };

  const exampleSale = 100;
  const platformAmount = (exampleSale * platformPercentage) / 100;
  const photographerAmount = (exampleSale * photographerPercentage) / 100;
  const organizationAmount = (exampleSale * organizationPercentage) / 100;

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-base font-semibold mb-3 block">
          Quem está organizando este evento?
        </Label>
        
        <RadioGroup
          value={organizationType}
          onValueChange={(value) => handleTypeChange(value as 'platform' | 'organization')}
          className="space-y-3"
          disabled={disabled}
        >
          {/* Opção: Plataforma STA */}
          <div 
            className={`flex items-start space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer ${
              organizationType === 'platform' 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-muted-foreground/50'
            }`}
            onClick={() => !disabled && handleTypeChange('platform')}
          >
            <RadioGroupItem value="platform" id="platform" className="mt-1" />
            <div className="flex-1">
              <Label htmlFor="platform" className="flex items-center gap-2 cursor-pointer font-medium">
                <Cpu className="h-4 w-4 text-primary" />
                Plataforma STA (sem organização externa)
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                A plataforma organiza diretamente. Fotógrafo recebe <strong>{availablePercentage}%</strong>, plataforma mantém <strong>{platformPercentage}%</strong>.
              </p>
            </div>
          </div>

          {/* Opção: Organização Externa */}
          <div 
            className={`flex items-start space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer ${
              organizationType === 'organization' 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-muted-foreground/50'
            }`}
            onClick={() => !disabled && handleTypeChange('organization')}
          >
            <RadioGroupItem value="organization" id="organization" className="mt-1" />
            <div className="flex-1">
              <Label htmlFor="organization" className="flex items-center gap-2 cursor-pointer font-medium">
                <Building2 className="h-4 w-4 text-accent-foreground" />
                Organização Externa
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Evento organizado por parceiro externo. Divisão de receita personalizada.
              </p>
            </div>
          </div>
        </RadioGroup>
      </div>

      {/* Seletor de Organização + Sliders */}
      {organizationType === 'organization' && (
        <div className="space-y-5 pl-4 border-l-2 border-primary/30 ml-2">
          {/* Dropdown de Organizações */}
          <div className="space-y-2">
            <Label>Selecione a Organização</Label>
            <Select
              value={organizationId || ''}
              onValueChange={handleOrganizationChange}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Escolha uma organização..." />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {organizations.length === 0 && (
              <p className="text-xs text-destructive">
                Nenhuma organização cadastrada. Crie uma primeiro.
              </p>
            )}
          </div>

          {/* Slider de Divisão */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Divisão de Receita</Label>
              <Badge variant="secondary" className="text-xs">
                Plataforma: {platformPercentage}% fixo
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>📸 Fotógrafo: <strong>{photographerPercentage}%</strong></span>
                <span>🏛️ Organização: <strong>{organizationPercentage}%</strong></span>
              </div>
              <Slider
                value={[photographerPercentage]}
                min={0}
                max={availablePercentage}
                step={1}
                onValueChange={handlePhotographerSliderChange}
                disabled={disabled}
                className="py-2"
              />
              <p className="text-xs text-muted-foreground text-center">
                Ajuste a divisão dos {availablePercentage}% disponíveis entre fotógrafo e organização
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Preview Visual */}
      <div className="p-4 bg-muted/50 rounded-lg border">
        <h5 className="text-sm font-semibold mb-3 flex items-center gap-2">
          💰 Exemplo: Venda de R$ {exampleSale.toFixed(2)}
        </h5>
        <div className="space-y-2">
          <div className="flex justify-between items-center p-2 bg-primary/10 rounded text-sm">
            <span>Plataforma ({platformPercentage}%)</span>
            <span className="font-bold text-primary">R$ {platformAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center p-2 bg-green-500/10 rounded text-sm">
            <span>Fotógrafo ({photographerPercentage}%)</span>
            <span className="font-bold text-green-600 dark:text-green-400">R$ {photographerAmount.toFixed(2)}</span>
          </div>
          {organizationType === 'organization' && (
            <div className="flex justify-between items-center p-2 bg-amber-500/10 rounded text-sm">
              <span>Organização ({organizationPercentage}%)</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">R$ {organizationAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between items-center p-2 bg-card rounded font-bold text-sm border-t">
            <span>TOTAL</span>
            <span>{platformPercentage + photographerPercentage + organizationPercentage}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrganizerSelector;
