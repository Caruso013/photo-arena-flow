import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { DollarSign, AlertTriangle, Loader2 } from 'lucide-react';
import { SearchableEventSelect, EventOption } from '@/components/modals/SearchableEventSelect';

interface Organization {
  id: string;
  name: string;
}

interface BulkPriceUpdateModalProps {
  open: boolean;
  onClose: () => void;
}

type UpdateScope = 'organization' | 'event';

const BulkPriceUpdateModal = ({ open, onClose }: BulkPriceUpdateModalProps) => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [events, setEvents] = useState<EventOption[]>([]);
  const [newPrice, setNewPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [preview, setPreview] = useState<{ campaigns: number; photos: number } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [scope, setScope] = useState<UpdateScope>('event');

  useEffect(() => {
    if (open) {
      fetchOrganizations();
      fetchAllEvents();
      setSelectedOrgId('');
      setSelectedEventId('');
      setNewPrice('');
      setPreview(null);
      setScope('event');
    }
  }, [open]);

  // When org changes in event scope, filter events
  useEffect(() => {
    if (scope === 'event') {
      fetchAllEvents(selectedOrgId || undefined);
      setSelectedEventId('');
      setPreview(null);
    } else if (scope === 'organization' && selectedOrgId) {
      fetchOrgPreview();
    } else {
      setPreview(null);
    }
  }, [selectedOrgId, scope]);

  useEffect(() => {
    if (scope === 'event' && selectedEventId) {
      fetchEventPreview();
    }
  }, [selectedEventId]);

  const fetchOrganizations = async () => {
    setLoadingOrgs(true);
    const { data } = await supabase.from('organizations').select('id, name').order('name');
    setOrganizations(data || []);
    setLoadingOrgs(false);
  };

  const fetchAllEvents = async (orgId?: string) => {
    setLoadingEvents(true);
    let query = supabase
      .from('campaigns')
      .select('id, title, event_date, location')
      .order('event_date', { ascending: false, nullsFirst: false });

    if (orgId) {
      query = query.eq('organization_id', orgId);
    }

    const { data } = await query;
    setEvents(data || []);
    setLoadingEvents(false);
  };

  const fetchOrgPreview = async () => {
    setLoadingPreview(true);
    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('id')
      .eq('organization_id', selectedOrgId);

    const campaignIds = campaigns?.map(c => c.id) || [];
    
    let photoCount = 0;
    if (campaignIds.length > 0) {
      const { count } = await supabase
        .from('photos')
        .select('id', { count: 'exact', head: true })
        .in('campaign_id', campaignIds);
      photoCount = count || 0;
    }

    setPreview({ campaigns: campaignIds.length, photos: photoCount });
    setLoadingPreview(false);
  };

  const fetchEventPreview = async () => {
    setLoadingPreview(true);
    const { count } = await supabase
      .from('photos')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', selectedEventId);
    setPreview({ campaigns: 1, photos: count || 0 });
    setLoadingPreview(false);
  };

  const handleUpdate = async () => {
    const price = parseFloat(newPrice.replace(',', '.'));
    if (isNaN(price) || price <= 0) {
      toast({ title: 'Preencha o preço corretamente', variant: 'destructive' });
      return;
    }

    if (scope === 'event' && !selectedEventId) {
      toast({ title: 'Selecione um evento', variant: 'destructive' });
      return;
    }
    if (scope === 'organization' && !selectedOrgId) {
      toast({ title: 'Selecione uma organização', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      if (scope === 'event') {
        const { error: photosError } = await supabase
          .from('photos')
          .update({ price })
          .eq('campaign_id', selectedEventId);
        if (photosError) throw photosError;

        const { error: campaignError } = await supabase
          .from('campaigns')
          .update({ photo_price_display: price })
          .eq('id', selectedEventId);
        if (campaignError) throw campaignError;

        const eventName = events.find(e => e.id === selectedEventId)?.title || '';
        toast({
          title: 'Preços atualizados!',
          description: `Fotos de "${eventName}" atualizadas para R$ ${price.toFixed(2).replace('.', ',')}`,
        });
      } else {
        const { data: campaigns } = await supabase
          .from('campaigns')
          .select('id')
          .eq('organization_id', selectedOrgId);

        const campaignIds = campaigns?.map(c => c.id) || [];
        if (campaignIds.length === 0) {
          toast({ title: 'Nenhuma campanha encontrada', variant: 'destructive' });
          setLoading(false);
          return;
        }

        const { error: photosError } = await supabase
          .from('photos')
          .update({ price })
          .in('campaign_id', campaignIds);
        if (photosError) throw photosError;

        const { error: campaignError } = await supabase
          .from('campaigns')
          .update({ photo_price_display: price })
          .eq('organization_id', selectedOrgId);
        if (campaignError) throw campaignError;

        const orgName = organizations.find(o => o.id === selectedOrgId)?.name || '';
        toast({
          title: 'Preços atualizados!',
          description: `Todas as fotos de "${orgName}" atualizadas para R$ ${price.toFixed(2).replace('.', ',')}`,
        });
      }
      onClose();
    } catch (error: any) {
      console.error('Error updating prices:', error);
      toast({ title: 'Erro ao atualizar preços', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const isReady = scope === 'event' ? !!selectedEventId && !!newPrice : !!selectedOrgId && !!newPrice;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Atualizar Preço em Massa
          </DialogTitle>
          <DialogDescription>
            Altere o valor das fotos por evento ou por organização.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Scope selector */}
          <div className="space-y-2">
            <Label>Escopo</Label>
            <Select value={scope} onValueChange={(v) => setScope(v as UpdateScope)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="event">Por evento</SelectItem>
                <SelectItem value="organization">Toda organização</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Organization selector - optional filter for event scope, required for org scope */}
          <div className="space-y-2">
            <Label>{scope === 'event' ? 'Filtrar por organização (opcional)' : 'Organização'}</Label>
            <Select value={selectedOrgId} onValueChange={setSelectedOrgId} disabled={loadingOrgs}>
              <SelectTrigger>
                <SelectValue placeholder={loadingOrgs ? 'Carregando...' : 'Selecione uma organização'} />
              </SelectTrigger>
              <SelectContent>
                {scope === 'event' && (
                  <SelectItem value="all">Todas as organizações</SelectItem>
                )}
                {organizations.map(org => (
                  <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Event selector (only for 'event' scope) */}
          {scope === 'event' && (
            <div className="space-y-2">
              <Label>Evento</Label>
              {loadingEvents ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando eventos...
                </div>
              ) : events.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum evento encontrado</p>
              ) : (
                <SearchableEventSelect
                  events={events}
                  value={selectedEventId}
                  onValueChange={setSelectedEventId}
                  placeholder="Buscar evento..."
                />
              )}
            </div>
          )}

          {preview && (
            <div className="rounded-md border border-border bg-muted/50 p-3 text-sm space-y-1">
              {scope === 'organization' && <p><strong>{preview.campaigns}</strong> eventos encontrados</p>}
              <p><strong>{preview.photos}</strong> fotos serão atualizadas</p>
            </div>
          )}

          {loadingPreview && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Calculando...
            </div>
          )}

          <div className="space-y-2">
            <Label>Novo preço (R$)</Label>
            <Input
              type="text"
              placeholder="Ex: 12,90"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
            />
          </div>

          {preview && preview.photos > 0 && newPrice && (
            <div className="flex items-start gap-2 rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm">
              <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
              <p>
                Esta ação irá alterar o preço de <strong>{preview.photos} fotos</strong> para{' '}
                <strong>R$ {newPrice.replace('.', ',')}</strong>. Essa ação não pode ser desfeita.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleUpdate} disabled={loading || !isReady}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Atualizar Preços
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkPriceUpdateModal;