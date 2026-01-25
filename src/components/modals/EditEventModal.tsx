import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Save, Calendar, MapPin, Image as ImageIcon, Gift, FileText, Building2, Loader2 } from 'lucide-react';
import { EventTermsEditor } from '@/components/events/EventTermsEditor';
import { OrganizerSelector } from '@/components/events/OrganizerSelector';
import { usePlatformPercentage } from '@/hooks/usePlatformPercentage';

interface EditEventModalProps {
  campaignId: string;
  campaignData: {
    title: string;
    description?: string;
    location?: string;
    event_date?: string;
    is_active: boolean;
    cover_image_url?: string;
    progressive_discount_enabled?: boolean;
    event_terms?: string | null;
    event_terms_pdf_url?: string | null;
    organization_id?: string | null;
    photographer_percentage?: number;
    organization_percentage?: number;
    platform_percentage?: number;
  };
  organizations?: Array<{ id: string; name: string }>;
  open: boolean;
  onClose: () => void;
  onEventUpdated: () => void;
}

const EditEventModal: React.FC<EditEventModalProps> = ({
  campaignId,
  campaignData,
  organizations = [],
  open,
  onClose,
  onEventUpdated
}) => {
  const { percentage: platformPercentage } = usePlatformPercentage();
  
  // Info tab state
  const [title, setTitle] = useState(campaignData.title);
  const [description, setDescription] = useState(campaignData.description || '');
  const [location, setLocation] = useState(campaignData.location || '');
  const [eventDate, setEventDate] = useState(campaignData.event_date || '');
  const [isActive, setIsActive] = useState(campaignData.is_active);
  const [progressiveDiscountEnabled, setProgressiveDiscountEnabled] = useState(campaignData.progressive_discount_enabled ?? true);
  
  // Organizer tab state
  const [organizerData, setOrganizerData] = useState<{
    organizationType: 'platform' | 'organization';
    organizationId: string | null;
    photographerPercentage: number;
    organizationPercentage: number;
  }>({
    organizationType: campaignData.organization_id ? 'organization' : 'platform',
    organizationId: campaignData.organization_id || null,
    photographerPercentage: campaignData.photographer_percentage || (100 - platformPercentage),
    organizationPercentage: campaignData.organization_percentage || 0,
  });
  
  // Terms tab state
  const [eventTerms, setEventTerms] = useState(campaignData.event_terms || null);
  const [eventTermsPdfUrl, setEventTermsPdfUrl] = useState(campaignData.event_terms_pdf_url || null);
  
  // Cover tab state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>(campaignData.cover_image_url || '');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentTab, setCurrentTab] = useState('info');

  // Update state when campaignData changes
  useEffect(() => {
    setTitle(campaignData.title);
    setDescription(campaignData.description || '');
    setLocation(campaignData.location || '');
    setEventDate(campaignData.event_date || '');
    setIsActive(campaignData.is_active);
    setProgressiveDiscountEnabled(campaignData.progressive_discount_enabled ?? true);
    setEventTerms(campaignData.event_terms || null);
    setEventTermsPdfUrl(campaignData.event_terms_pdf_url || null);
    setPreviewUrl(campaignData.cover_image_url || '');
    setOrganizerData({
      organizationType: campaignData.organization_id ? 'organization' : 'platform',
      organizationId: campaignData.organization_id || null,
      photographerPercentage: campaignData.photographer_percentage || (100 - platformPercentage),
      organizationPercentage: campaignData.organization_percentage || 0,
    });
  }, [campaignData, platformPercentage]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.size > 5 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "A imagem deve ter no máximo 5MB",
        variant: "destructive",
      });
      return;
    }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreviewUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({
        title: "Erro",
        description: "Título é obrigatório",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      let coverImageUrl = campaignData.cover_image_url;

      // Upload new cover if selected
      if (selectedFile) {
        const fileName = `${campaignId}_${Date.now()}.${selectedFile.name.split('.').pop()}`;
        const { error: uploadError } = await supabase.storage
          .from('campaign-covers')
          .upload(fileName, selectedFile);
        
        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast({ 
            title: "Erro no upload", 
            description: "Não foi possível enviar a imagem.",
            variant: "destructive" 
          });
          throw uploadError;
        }
        
        const { data: urlData } = supabase.storage
          .from('campaign-covers')
          .getPublicUrl(fileName);
        coverImageUrl = urlData.publicUrl;
      }

      // Update campaign
      const { error: updateError } = await supabase
        .from('campaigns')
        .update({
          title: title.trim(),
          description: description.trim() || null,
          location: location.trim() || null,
          event_date: eventDate || null,
          is_active: isActive,
          progressive_discount_enabled: progressiveDiscountEnabled,
          cover_image_url: coverImageUrl,
          organization_id: organizerData.organizationType === 'organization' ? organizerData.organizationId : null,
          photographer_percentage: organizerData.photographerPercentage,
          organization_percentage: organizerData.organizationPercentage,
          platform_percentage: platformPercentage,
        })
        .eq('id', campaignId);

      if (updateError) throw updateError;

      toast({ title: "Evento atualizado com sucesso!" });
      onEventUpdated();
      onClose();
    } catch (error: any) {
      console.error('Error updating campaign:', error);
      toast({ 
        title: "Erro ao atualizar", 
        description: error.message || "Não foi possível atualizar o evento.",
        variant: "destructive" 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-3xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Editar Evento</DialogTitle>
        </DialogHeader>
        
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="info" className="text-xs sm:text-sm">
              <span className="hidden sm:inline">Informações</span>
              <span className="sm:hidden">Info</span>
            </TabsTrigger>
            <TabsTrigger value="organizer" className="text-xs sm:text-sm">
              <Building2 className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Organizador</span>
            </TabsTrigger>
            <TabsTrigger value="cover" className="text-xs sm:text-sm">
              <ImageIcon className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Capa</span>
            </TabsTrigger>
            <TabsTrigger value="terms" className="text-xs sm:text-sm">
              <FileText className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Termos</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab: Informações */}
          <TabsContent value="info" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input 
                id="title"
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                className="h-11"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location">Localização</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="location"
                    value={location} 
                    onChange={(e) => setLocation(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="event_date">Data</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="event_date"
                    type="date" 
                    value={eventDate} 
                    onChange={(e) => setEventDate(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea 
                id="description"
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                rows={3} 
              />
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label className="font-medium">Evento Ativo</Label>
                <p className="text-xs text-muted-foreground">
                  Eventos inativos não aparecem para clientes
                </p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
            
            <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-primary/20">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Gift className="h-4 w-4 text-primary" />
                  <Label className="text-sm font-medium">Descontos Progressivos</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  {progressiveDiscountEnabled 
                    ? 'Clientes ganham descontos ao comprar múltiplas fotos' 
                    : 'Desativado - clientes pagam preço integral'}
                </p>
              </div>
              <Switch 
                checked={progressiveDiscountEnabled} 
                onCheckedChange={setProgressiveDiscountEnabled} 
              />
            </div>
            
            {progressiveDiscountEnabled && (
              <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                <Gift className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertDescription className="text-blue-900 dark:text-blue-100">
                  <div className="space-y-1 text-xs">
                    <p className="font-medium mb-1">Tabela de descontos:</p>
                    <div className="flex justify-between"><span>• 2 a 4 fotos</span><span className="font-semibold">5% OFF</span></div>
                    <div className="flex justify-between"><span>• 5 a 9 fotos</span><span className="font-semibold">10% OFF</span></div>
                    <div className="flex justify-between"><span>• 10 ou mais</span><span className="font-semibold">20% OFF</span></div>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          {/* Tab: Organizador */}
          <TabsContent value="organizer" className="space-y-4">
            <OrganizerSelector
              organizationType={organizerData.organizationType}
              organizationId={organizerData.organizationId}
              photographerPercentage={organizerData.photographerPercentage}
              organizationPercentage={organizerData.organizationPercentage}
              platformPercentage={platformPercentage}
              organizations={organizations}
              onChange={setOrganizerData}
            />
          </TabsContent>

          {/* Tab: Capa */}
          <TabsContent value="cover" className="space-y-4">
            <div className="space-y-4">
              <Label className="text-base font-semibold">Imagem de Capa</Label>
              
              {previewUrl ? (
                <div className="relative">
                  <img 
                    src={previewUrl} 
                    alt="Preview" 
                    className="w-full aspect-video object-cover rounded-lg border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewUrl('');
                    }}
                  >
                    Remover
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                  <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground mb-3">
                    Nenhuma imagem de capa
                  </p>
                </div>
              )}
              
              <Input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
              />
              <p className="text-xs text-muted-foreground">Máximo 5MB</p>
            </div>
          </TabsContent>
          
          {/* Tab: Termos */}
          <TabsContent value="terms" className="space-y-4">
            <EventTermsEditor
              campaignId={campaignId}
              eventTerms={eventTerms}
              eventTermsPdfUrl={eventTermsPdfUrl}
              onUpdate={(terms, pdfUrl) => {
                setEventTerms(terms);
                setEventTermsPdfUrl(pdfUrl);
              }}
            />
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditEventModal;
