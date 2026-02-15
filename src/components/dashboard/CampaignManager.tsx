import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { 
  Camera, Edit, Power, PowerOff, MapPin, Calendar, Trash2, 
  ClipboardList, Users, Search, Filter, UserCheck, FileText
} from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import CreateCampaignModal from '../modals/CreateCampaignModal';
import EditEventModal from '../modals/EditEventModal';
import { CampaignPhotographersManager } from './CampaignPhotographersManager';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  applications_open?: boolean;
}

interface CampaignManagerProps {
  campaigns: Campaign[];
  onRefresh: () => void;
}

interface CampaignStats {
  [campaignId: string]: {
    photographers: number;
    pendingApplications: number;
  };
}

export const CampaignManager: React.FC<CampaignManagerProps> = ({ campaigns, onRefresh }) => {
  const navigate = useNavigate();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string }>>([]);
  const [stats, setStats] = useState<CampaignStats>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive' | 'open'>('all');

  useEffect(() => {
    fetchOrganizations();
    fetchStats();
  }, [campaigns]);

  const fetchOrganizations = async () => {
    const { data } = await supabase
      .from('organizations')
      .select('id, name')
      .order('name');
    if (data) setOrganizations(data);
  };

  const fetchStats = async () => {
    if (campaigns.length === 0) return;
    const ids = campaigns.map(c => c.id);

    const [photosRes, appsRes] = await Promise.all([
      supabase
        .from('campaign_photographers')
        .select('campaign_id')
        .in('campaign_id', ids)
        .eq('is_active', true),
      supabase
        .from('event_applications')
        .select('campaign_id')
        .in('campaign_id', ids)
        .eq('status', 'pending'),
    ]);

    const newStats: CampaignStats = {};
    ids.forEach(id => {
      newStats[id] = {
        photographers: (photosRes.data || []).filter(p => p.campaign_id === id).length,
        pendingApplications: (appsRes.data || []).filter(a => a.campaign_id === id).length,
      };
    });
    setStats(newStats);
  };

  const handleToggleActive = async (campaign: Campaign) => {
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ is_active: !campaign.is_active })
        .eq('id', campaign.id);
      if (error) throw error;
      toast({ title: campaign.is_active ? "Evento desativado!" : "Evento ativado!" });
      onRefresh();
    } catch (error) {
      console.error('Error toggling campaign:', error);
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    }
  };

  const handleToggleApplications = async (campaign: Campaign) => {
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ applications_open: !campaign.applications_open })
        .eq('id', campaign.id);
      if (error) throw error;
      toast({ title: campaign.applications_open ? "Inscrições fechadas" : "Inscrições abertas" });
      onRefresh();
    } catch (error) {
      console.error('Error toggling applications:', error);
      toast({ title: "Erro ao atualizar", variant: "destructive" });
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
      toast({ title: "Erro ao excluir", variant: "destructive" });
    }
  };

  const filtered = campaigns.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.location?.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (filter === 'active') return c.is_active;
    if (filter === 'inactive') return !c.is_active;
    if (filter === 'open') return c.applications_open;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Gerenciar Eventos
          </h2>
          <p className="text-sm text-muted-foreground">
            {campaigns.length} evento{campaigns.length !== 1 ? 's' : ''} cadastrado{campaigns.length !== 1 ? 's' : ''}
          </p>
        </div>
        <CreateCampaignModal 
          organizations={organizations}
          onCampaignCreated={onRefresh}
        />
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou local..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="w-auto">
          <TabsList className="h-10">
            <TabsTrigger value="all" className="text-xs px-3">Todos</TabsTrigger>
            <TabsTrigger value="active" className="text-xs px-3">Ativos</TabsTrigger>
            <TabsTrigger value="inactive" className="text-xs px-3">Inativos</TabsTrigger>
            <TabsTrigger value="open" className="text-xs px-3">Inscrições</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Campaign Cards */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="text-center p-8">
            <Camera className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum evento encontrado</h3>
            <p className="text-sm text-muted-foreground">
              {searchTerm ? 'Tente outra busca' : 'Crie um novo evento para começar'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((campaign) => {
            const campaignStats = stats[campaign.id] || { photographers: 0, pendingApplications: 0 };

            return (
              <Card key={campaign.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex gap-0">
                    {/* Thumbnail */}
                    <div className="hidden sm:block w-32 h-auto shrink-0 bg-muted">
                      {campaign.cover_image_url ? (
                        <img
                          src={campaign.cover_image_url}
                          alt={campaign.title}
                          className="w-full h-full object-cover min-h-[120px]"
                        />
                      ) : (
                        <div className="w-full h-full min-h-[120px] flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                          <Camera className="h-8 w-8 text-primary/30" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-4 space-y-3">
                      {/* Title + Badges */}
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="space-y-1">
                          <h4 className="font-semibold text-base leading-tight">{campaign.title}</h4>
                          <div className="flex flex-wrap gap-1.5">
                            <Badge variant={campaign.is_active ? 'default' : 'secondary'} className="text-xs">
                              {campaign.is_active ? 'Ativa' : 'Inativa'}
                            </Badge>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${campaign.applications_open ? 'border-green-500/50 text-green-700 dark:text-green-400' : 'border-muted-foreground/30'}`}
                            >
                              {campaign.applications_open ? '📋 Inscrições Abertas' : 'Inscrições Fechadas'}
                            </Badge>
                            {campaignStats.pendingApplications > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {campaignStats.pendingApplications} candidatura{campaignStats.pendingApplications > 1 ? 's' : ''} pendente{campaignStats.pendingApplications > 1 ? 's' : ''}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Meta info */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        {campaign.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {campaign.location}
                          </span>
                        )}
                        {campaign.event_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {new Date(campaign.event_date).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <UserCheck className="h-3.5 w-3.5" />
                          {campaignStats.photographers} fotógrafo{campaignStats.photographers !== 1 ? 's' : ''}
                        </span>
                      </div>

                      {/* Percentages */}
                      <div className="flex gap-2 text-xs">
                        <Badge variant="outline" className="font-normal">Plat: {campaign.platform_percentage}%</Badge>
                        <Badge variant="outline" className="font-normal">Fot: {campaign.photographer_percentage}%</Badge>
                        {campaign.organization_id && (
                          <Badge variant="outline" className="font-normal">Org: {campaign.organization_percentage}%</Badge>
                        )}
                      </div>

                      {/* Actions row */}
                      <div className="flex flex-wrap items-center gap-2 pt-1 border-t">
                        {/* Applications toggle */}
                        <div className="flex items-center gap-2 mr-2">
                          <Switch
                            checked={campaign.applications_open ?? false}
                            onCheckedChange={() => handleToggleApplications(campaign)}
                          />
                          <span className="text-xs text-muted-foreground">Inscrições</span>
                        </div>

                        <div className="flex-1" />

                        <Button size="sm" variant="outline" className="h-8 gap-1 text-xs"
                          onClick={() => navigate(`/dashboard/admin/events/${campaign.id}/attendance`)}>
                          <ClipboardList className="h-3.5 w-3.5" />
                          Presença
                        </Button>
                        <CampaignPhotographersManager campaignId={campaign.id} campaignTitle={campaign.title} />
                        <Button size="sm" variant="outline" className="h-8 gap-1 text-xs"
                          onClick={() => openEditModal(campaign)}>
                          <Edit className="h-3.5 w-3.5" />
                          Editar
                        </Button>
                        <Button size="sm" variant={campaign.is_active ? 'destructive' : 'default'} className="h-8 gap-1 text-xs"
                          onClick={() => handleToggleActive(campaign)}>
                          {campaign.is_active ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                          {campaign.is_active ? 'Desativar' : 'Ativar'}
                        </Button>
                        <Button size="sm" variant="destructive" className="h-8 gap-1 text-xs"
                          onClick={() => openDeleteDialog(campaign)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

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
    </div>
  );
};
