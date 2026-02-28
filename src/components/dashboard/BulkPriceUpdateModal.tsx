import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { DollarSign, AlertTriangle, Loader2 } from 'lucide-react';

interface Organization {
  id: string;
  name: string;
}

interface BulkPriceUpdateModalProps {
  open: boolean;
  onClose: () => void;
}

const BulkPriceUpdateModal = ({ open, onClose }: BulkPriceUpdateModalProps) => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [preview, setPreview] = useState<{ campaigns: number; photos: number } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    if (open) {
      fetchOrganizations();
      setSelectedOrgId('');
      setNewPrice('');
      setPreview(null);
    }
  }, [open]);

  useEffect(() => {
    if (selectedOrgId) {
      fetchPreview();
    } else {
      setPreview(null);
    }
  }, [selectedOrgId]);

  const fetchOrganizations = async () => {
    setLoadingOrgs(true);
    const { data } = await supabase.from('organizations').select('id, name').order('name');
    setOrganizations(data || []);
    setLoadingOrgs(false);
  };

  const fetchPreview = async () => {
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

  const handleUpdate = async () => {
    const price = parseFloat(newPrice.replace(',', '.'));
    if (!selectedOrgId || isNaN(price) || price <= 0) {
      toast({ title: 'Preencha todos os campos corretamente', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      // Get campaign IDs for the org
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id')
        .eq('organization_id', selectedOrgId);

      const campaignIds = campaigns?.map(c => c.id) || [];

      if (campaignIds.length === 0) {
        toast({ title: 'Nenhuma campanha encontrada para esta organização', variant: 'destructive' });
        setLoading(false);
        return;
      }

      // Update photos price in batches
      const { error: photosError } = await supabase
        .from('photos')
        .update({ price })
        .in('campaign_id', campaignIds);

      if (photosError) throw photosError;

      // Update campaign display price
      const { error: campaignError } = await supabase
        .from('campaigns')
        .update({ photo_price_display: price })
        .eq('organization_id', selectedOrgId);

      if (campaignError) throw campaignError;

      const orgName = organizations.find(o => o.id === selectedOrgId)?.name || '';
      toast({
        title: 'Preços atualizados!',
        description: `Todas as fotos de "${orgName}" foram atualizadas para R$ ${price.toFixed(2).replace('.', ',')}`,
      });
      onClose();
    } catch (error: any) {
      console.error('Error updating prices:', error);
      toast({ title: 'Erro ao atualizar preços', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Atualizar Preço em Massa
          </DialogTitle>
          <DialogDescription>
            Altere o valor de todas as fotos de uma organização de uma vez.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Organização</Label>
            <Select value={selectedOrgId} onValueChange={setSelectedOrgId} disabled={loadingOrgs}>
              <SelectTrigger>
                <SelectValue placeholder={loadingOrgs ? 'Carregando...' : 'Selecione uma organização'} />
              </SelectTrigger>
              <SelectContent>
                {organizations.map(org => (
                  <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {preview && (
            <div className="rounded-md border border-border bg-muted/50 p-3 text-sm space-y-1">
              <p><strong>{preview.campaigns}</strong> eventos encontrados</p>
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
          <Button
            onClick={handleUpdate}
            disabled={loading || !selectedOrgId || !newPrice}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Atualizar Preços
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkPriceUpdateModal;
