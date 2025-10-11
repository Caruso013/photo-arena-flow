import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { Camera, Edit, Power, PowerOff, MapPin, Calendar, Plus, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import CreateCampaignModal from '../modals/CreateCampaignModal';
import { CampaignPhotographersManager } from './CampaignPhotographersManager';

interface Campaign {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  event_date: string | null;
  is_active: boolean;
  created_at: string;
  organization_id: string | null;
  platform_percentage: number;
  photographer_percentage: number;
  organization_percentage: number;
}

interface CampaignManagerProps {
  campaigns: Campaign[];
  onRefresh: () => void;
}

export const CampaignManager: React.FC<CampaignManagerProps> = ({ campaigns, onRefresh }) => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string }>>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    event_date: '',
    organization_id: '',
    platform_percentage: 60,
    photographer_percentage: 10,
    organization_percentage: 30
  });

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    const { data } = await supabase
      .from('organizations')
      .select('id, name')
      .order('name');
    
    if (data) setOrganizations(data);
  };

  const handleToggleActive = async (campaign: Campaign) => {
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ is_active: !campaign.is_active })
        .eq('id', campaign.id);

      if (error) throw error;

      toast({
        title: campaign.is_active ? "Evento desativado!" : "Evento ativado!",
        description: `O evento foi ${campaign.is_active ? 'desativado' : 'ativado'} com sucesso.`,
      });

      onRefresh();
    } catch (error) {
      console.error('Error toggling campaign:', error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar o status do evento.",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setFormData({
      title: campaign.title,
      description: campaign.description || '',
      location: campaign.location || '',
      event_date: campaign.event_date || '',
      organization_id: campaign.organization_id || '',
      platform_percentage: campaign.platform_percentage,
      photographer_percentage: campaign.photographer_percentage,
      organization_percentage: campaign.organization_percentage
    });
    setEditDialogOpen(true);
  };

  const handleEdit = async () => {
    if (!selectedCampaign) return;

    try {
      const { error } = await supabase
        .from('campaigns')
        .update(formData)
        .eq('id', selectedCampaign.id);

      if (error) throw error;

      toast({
        title: "Evento atualizado!",
        description: "As informações foram atualizadas com sucesso.",
      });

      setEditDialogOpen(false);
      setSelectedCampaign(null);
      onRefresh();
    } catch (error) {
      console.error('Error updating campaign:', error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar o evento.",
        variant: "destructive",
      });
    }
  };

  const openDeleteDialog = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedCampaign) return;

    try {
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', selectedCampaign.id);

      if (error) throw error;

      toast({
        title: "Evento excluído!",
        description: "O evento foi removido com sucesso.",
      });

      setDeleteDialogOpen(false);
      setSelectedCampaign(null);
      onRefresh();
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir o evento.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Gerenciar Eventos
            </CardTitle>
            <CardDescription>
              Crie, edite ou exclua eventos da plataforma
            </CardDescription>
          </div>
          <CreateCampaignModal 
            organizations={organizations}
            onCampaignCreated={onRefresh}
          />
        </div>
      </CardHeader>
      <CardContent>
        {campaigns.length === 0 ? (
          <div className="text-center p-8">
            <Camera className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum evento encontrado</h3>
          </div>
        ) : (
          <div className="space-y-4">
            {campaigns.map((campaign) => (
              <Card key={campaign.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium text-lg">{campaign.title}</h4>
                        <Badge variant={campaign.is_active ? 'default' : 'secondary'}>
                          {campaign.is_active ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </div>
                      {campaign.description && (
                        <p className="text-sm text-muted-foreground mb-2">{campaign.description}</p>
                      )}
                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-2">
                        {campaign.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {campaign.location}
                          </span>
                        )}
                        {campaign.event_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(campaign.event_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2 text-xs">
                        <Badge variant="outline">Plataforma: {campaign.platform_percentage}%</Badge>
                        <Badge variant="outline">Fotógrafo: {campaign.photographer_percentage}%</Badge>
                        {campaign.organization_id && (
                          <Badge variant="outline">Organização: {campaign.organization_percentage}%</Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <CampaignPhotographersManager
                          campaignId={campaign.id}
                          campaignTitle={campaign.title}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(campaign)}
                          className="gap-1"
                        >
                          <Edit className="h-4 w-4" />
                          Editar
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant={campaign.is_active ? 'destructive' : 'default'}
                          onClick={() => handleToggleActive(campaign)}
                          className="gap-1"
                        >
                          {campaign.is_active ? (
                            <>
                              <PowerOff className="h-4 w-4" />
                              Desativar
                            </>
                          ) : (
                            <>
                              <Power className="h-4 w-4" />
                              Ativar
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => openDeleteDialog(campaign)}
                          className="gap-1"
                        >
                          <Trash2 className="h-4 w-4" />
                          Excluir
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Evento</DialogTitle>
            <DialogDescription>
              Atualize as informações do evento
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Título</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Descrição</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="edit-location">Localização</Label>
              <Input
                id="edit-location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-event-date">Data do Evento</Label>
              <Input
                id="edit-event-date"
                type="date"
                value={formData.event_date}
                onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
              />
            </div>
            
            <div className="space-y-2 pt-2 border-t">
              <h4 className="font-medium text-sm">Organização e Comissões</h4>
              <div>
                <Label htmlFor="edit-organization">Organização</Label>
                <select
                  id="edit-organization"
                  value={formData.organization_id}
                  onChange={(e) => setFormData({ ...formData, organization_id: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                >
                  <option value="">Nenhuma (Plataforma)</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label htmlFor="edit-platform-percentage">Plataforma (%)</Label>
                  <Input
                    id="edit-platform-percentage"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.platform_percentage}
                    onChange={(e) => setFormData({ ...formData, platform_percentage: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-photographer-percentage">Fotógrafo (%)</Label>
                  <Input
                    id="edit-photographer-percentage"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.photographer_percentage}
                    onChange={(e) => setFormData({ ...formData, photographer_percentage: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-organization-percentage">Organização (%)</Label>
                  <Input
                    id="edit-organization-percentage"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.organization_percentage}
                    onChange={(e) => setFormData({ ...formData, organization_percentage: Number(e.target.value) })}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Total: {formData.platform_percentage + formData.photographer_percentage + formData.organization_percentage}%
              </p>
            </div>

            <Button onClick={handleEdit} className="w-full">
              Salvar Alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Alert Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O evento será permanentemente excluído.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
