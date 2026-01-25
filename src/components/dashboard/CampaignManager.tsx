import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { Camera, Edit, Power, PowerOff, MapPin, Calendar, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import CreateCampaignModal from '../modals/CreateCampaignModal';
import EditEventModal from '../modals/EditEventModal';
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
  cover_image_url?: string | null;
  progressive_discount_enabled?: boolean;
  event_terms?: string | null;
  event_terms_pdf_url?: string | null;
}

interface CampaignManagerProps {
  campaigns: Campaign[];
  onRefresh: () => void;
}

export const CampaignManager: React.FC<CampaignManagerProps> = ({ campaigns, onRefresh }) => {
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string }>>([]);

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
      });

      onRefresh();
    } catch (error) {
      console.error('Error toggling campaign:', error);
      toast({
        title: "Erro ao atualizar",
        variant: "destructive",
      });
    }
  };

  const openEditModal = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setEditModalOpen(true);
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

      toast({ title: "Evento excluído!" });
      setDeleteDialogOpen(false);
      setSelectedCampaign(null);
      onRefresh();
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast({
        title: "Erro ao excluir",
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
                        {!campaign.organization_id && (
                          <Badge variant="outline" className="text-xs">Plataforma</Badge>
                        )}
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
                          onClick={() => openEditModal(campaign)}
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
                            <><PowerOff className="h-4 w-4" />Desativar</>
                          ) : (
                            <><Power className="h-4 w-4" />Ativar</>
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

      {/* Edit Modal */}
      {selectedCampaign && (
        <EditEventModal
          campaignId={selectedCampaign.id}
          campaignData={{
            title: selectedCampaign.title,
            description: selectedCampaign.description || undefined,
            location: selectedCampaign.location || undefined,
            event_date: selectedCampaign.event_date || undefined,
            is_active: selectedCampaign.is_active,
            cover_image_url: selectedCampaign.cover_image_url || undefined,
            progressive_discount_enabled: selectedCampaign.progressive_discount_enabled,
            event_terms: selectedCampaign.event_terms,
            event_terms_pdf_url: selectedCampaign.event_terms_pdf_url,
            organization_id: selectedCampaign.organization_id,
            photographer_percentage: selectedCampaign.photographer_percentage,
            organization_percentage: selectedCampaign.organization_percentage,
            platform_percentage: selectedCampaign.platform_percentage,
          }}
          organizations={organizations}
          open={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setSelectedCampaign(null);
          }}
          onEventUpdated={onRefresh}
        />
      )}

      {/* Delete Dialog */}
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
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
