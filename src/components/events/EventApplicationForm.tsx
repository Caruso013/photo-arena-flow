import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  MapPin, 
  Car, 
  Moon, 
  Phone, 
  FileText, 
  Download,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { MaskedInput } from '@/components/ui/masked-input';

interface Campaign {
  id: string;
  title: string;
  event_terms?: string | null;
  event_terms_pdf_url?: string | null;
}

interface EventApplicationFormProps {
  campaign: Campaign;
  message: string;
  onMessageChange: (msg: string) => void;
  onSubmit: (data: ApplicationFormData) => void;
  isSubmitting: boolean;
  onCancel: () => void;
}

export interface ApplicationFormData {
  message: string;
  city: string;
  state: string;
  has_vehicle: boolean;
  has_night_equipment: boolean;
  whatsapp: string;
  accepted_terms: boolean;
}

const BRAZILIAN_STATES = [
  { value: 'AC', label: 'Acre' },
  { value: 'AL', label: 'Alagoas' },
  { value: 'AP', label: 'Amapá' },
  { value: 'AM', label: 'Amazonas' },
  { value: 'BA', label: 'Bahia' },
  { value: 'CE', label: 'Ceará' },
  { value: 'DF', label: 'Distrito Federal' },
  { value: 'ES', label: 'Espírito Santo' },
  { value: 'GO', label: 'Goiás' },
  { value: 'MA', label: 'Maranhão' },
  { value: 'MT', label: 'Mato Grosso' },
  { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MG', label: 'Minas Gerais' },
  { value: 'PA', label: 'Pará' },
  { value: 'PB', label: 'Paraíba' },
  { value: 'PR', label: 'Paraná' },
  { value: 'PE', label: 'Pernambuco' },
  { value: 'PI', label: 'Piauí' },
  { value: 'RJ', label: 'Rio de Janeiro' },
  { value: 'RN', label: 'Rio Grande do Norte' },
  { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'RO', label: 'Rondônia' },
  { value: 'RR', label: 'Roraima' },
  { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'São Paulo' },
  { value: 'SE', label: 'Sergipe' },
  { value: 'TO', label: 'Tocantins' },
];

export const EventApplicationForm: React.FC<EventApplicationFormProps> = ({
  campaign,
  message,
  onMessageChange,
  onSubmit,
  isSubmitting,
  onCancel
}) => {
  const [formData, setFormData] = useState<ApplicationFormData>({
    message: message,
    city: '',
    state: '',
    has_vehicle: false,
    has_night_equipment: false,
    whatsapp: '',
    accepted_terms: false,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof ApplicationFormData, string>>>({});

  const hasTerms = !!(campaign.event_terms || campaign.event_terms_pdf_url);

  // Validar WhatsApp no formato brasileiro
  const validateWhatsApp = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length === 11 && cleaned[2] === '9';
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof ApplicationFormData, string>> = {};

    if (!formData.city.trim()) {
      newErrors.city = 'Cidade é obrigatória';
    }

    if (!formData.state) {
      newErrors.state = 'Estado é obrigatório';
    }

    if (!formData.whatsapp.trim()) {
      newErrors.whatsapp = 'WhatsApp é obrigatório';
    } else if (!validateWhatsApp(formData.whatsapp)) {
      newErrors.whatsapp = 'Formato inválido. Use (XX) 9XXXX-XXXX';
    }

    if (hasTerms && !formData.accepted_terms) {
      newErrors.accepted_terms = 'Você precisa aceitar os termos do evento';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit({ ...formData, message: formData.message });
    }
  };

  const updateField = <K extends keyof ApplicationFormData>(
    field: K, 
    value: ApplicationFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Localização */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <MapPin className="h-4 w-4 text-primary" />
          Onde você mora?
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="city">Cidade *</Label>
            <Input
              id="city"
              placeholder="Ex: São Paulo"
              value={formData.city}
              onChange={(e) => updateField('city', e.target.value)}
              className={errors.city ? 'border-destructive' : ''}
            />
            {errors.city && (
              <p className="text-xs text-destructive">{errors.city}</p>
            )}
          </div>
          
          <div className="space-y-1.5">
            <Label htmlFor="state">Estado *</Label>
            <Select 
              value={formData.state} 
              onValueChange={(v) => updateField('state', v)}
            >
              <SelectTrigger className={errors.state ? 'border-destructive' : ''}>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {BRAZILIAN_STATES.map(state => (
                  <SelectItem key={state.value} value={state.value}>
                    {state.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.state && (
              <p className="text-xs text-destructive">{errors.state}</p>
            )}
          </div>
        </div>
      </div>

      {/* Veículo */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Car className="h-4 w-4 text-primary" />
          Tem veículo próprio?
        </div>
        
        <RadioGroup
          value={formData.has_vehicle ? 'yes' : 'no'}
          onValueChange={(v) => updateField('has_vehicle', v === 'yes')}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="vehicle-yes" />
            <Label htmlFor="vehicle-yes" className="cursor-pointer">Sim</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="vehicle-no" />
            <Label htmlFor="vehicle-no" className="cursor-pointer">Não</Label>
          </div>
        </RadioGroup>
      </div>

      {/* Equipamento noturno */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Moon className="h-4 w-4 text-primary" />
          Caso o jogo seja à noite, tem equipamento para entregar alta qualidade?
        </div>
        
        <RadioGroup
          value={formData.has_night_equipment ? 'yes' : 'no'}
          onValueChange={(v) => updateField('has_night_equipment', v === 'yes')}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="night-yes" />
            <Label htmlFor="night-yes" className="cursor-pointer">Sim</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="night-no" />
            <Label htmlFor="night-no" className="cursor-pointer">Não</Label>
          </div>
        </RadioGroup>
      </div>

      {/* WhatsApp */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Phone className="h-4 w-4 text-primary" />
          WhatsApp *
        </div>
        
        <MaskedInput
          mask="(99) 99999-9999"
          placeholder="(11) 99999-9999"
          value={formData.whatsapp}
          onChange={(e) => updateField('whatsapp', e.target.value)}
          className={errors.whatsapp ? 'border-destructive' : ''}
        />
        {errors.whatsapp && (
          <p className="text-xs text-destructive">{errors.whatsapp}</p>
        )}
      </div>

      {/* Mensagem opcional */}
      <div className="space-y-1.5">
        <Label htmlFor="message">Mensagem (opcional)</Label>
        <Textarea
          id="message"
          value={formData.message}
          onChange={(e) => updateField('message', e.target.value)}
          placeholder="Conte sobre sua experiência, equipamentos que possui..."
          rows={3}
        />
      </div>

      {/* Termos do Evento */}
      {hasTerms && (
        <div className="space-y-3 p-4 bg-muted/50 rounded-lg border">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <FileText className="h-4 w-4 text-primary" />
            Termos do Evento
          </div>
          
          {campaign.event_terms && (
            <div className="text-sm text-muted-foreground whitespace-pre-wrap max-h-40 overflow-y-auto p-3 bg-background rounded border">
              {campaign.event_terms}
            </div>
          )}
          
          {campaign.event_terms_pdf_url && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => window.open(campaign.event_terms_pdf_url!, '_blank')}
            >
              <Download className="h-4 w-4" />
              Baixar Termos Completos (PDF)
            </Button>
          )}
          
          <div className="flex items-start gap-2 pt-2">
            <Checkbox
              id="accept-terms"
              checked={formData.accepted_terms}
              onCheckedChange={(checked) => updateField('accepted_terms', !!checked)}
              className={errors.accepted_terms ? 'border-destructive' : ''}
            />
            <Label 
              htmlFor="accept-terms" 
              className="text-sm cursor-pointer leading-tight"
            >
              Li e aceito os termos do evento descritos acima *
            </Label>
          </div>
          {errors.accepted_terms && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.accepted_terms}
            </p>
          )}
        </div>
      )}

      {/* Botões */}
      <div className="flex justify-end gap-3 pt-2">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Enviando...
            </>
          ) : (
            'Enviar Candidatura'
          )}
        </Button>
      </div>
    </form>
  );
};

export default EventApplicationForm;
