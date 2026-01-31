import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from '@/components/ui/use-toast';
import { UserPlus, X, Camera, RefreshCw } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { useQueryClient } from '@tanstack/react-query';

interface Photographer {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
}

interface AssignedPhotographer extends Photographer {
  assignment_id: string;
  assigned_at: string;
}

interface CampaignPhotographersManagerProps {
  campaignId: string;
  campaignTitle: string;
}

export const CampaignPhotographersManager: React.FC<CampaignPhotographersManagerProps> = ({
  campaignId,
  campaignTitle
}) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [assignedPhotographers, setAssignedPhotographers] = useState<AssignedPhotographer[]>([]);
  const [availablePhotographers, setAvailablePhotographers] = useState<Photographer[]>([]);
  const [selectedPhotographers, setSelectedPhotographers] = useState<string[]>([]);
  const queryClient = useQueryClient();

  // Função para invalidar cache relacionado
  const invalidateRelatedCaches = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    queryClient.invalidateQueries({ queryKey: ['campaign-photographers', campaignId] });
    queryClient.invalidateQueries({ queryKey: ['photographer-events'] });
  }, [queryClient, campaignId]);

  useEffect(() => {
    if (open) {
      fetchPhotographers();
    }
  }, [open, campaignId]);

  const fetchPhotographers = async () => {
    try {
      setLoading(true);

      // Buscar fotógrafos já atribuídos
      const { data: assigned, error: assignedError } = await supabase
        .from('campaign_photographers')
        .select(`
          id,
          photographer_id,
          assigned_at,
          profiles:photographer_id (
            id,
            full_name,
            email,
            avatar_url
          )
        `)
        .eq('campaign_id', campaignId)
        .eq('is_active', true);

      if (assignedError) throw assignedError;

      const assignedList: AssignedPhotographer[] = (assigned || []).map((item: any) => ({
        id: item.profiles.id,
        full_name: item.profiles.full_name,
        email: item.profiles.email,
        avatar_url: item.profiles.avatar_url,
        assignment_id: item.id,
        assigned_at: item.assigned_at
      }));

      setAssignedPhotographers(assignedList);

      // Buscar todos os fotógrafos disponíveis
      const { data: photographers, error: photogError } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .eq('role', 'photographer');

      if (photogError) throw photogError;

      // Filtrar fotógrafos que já estão atribuídos
      const assignedIds = assignedList.map(p => p.id);
      const available = (photographers || []).filter(
        (p: Photographer) => !assignedIds.includes(p.id)
      );

      setAvailablePhotographers(available);
    } catch (error) {
      console.error('Error fetching photographers:', error);
      toast({
        title: "Erro ao carregar",
        description: "Não foi possível carregar os fotógrafos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignPhotographers = async () => {
    if (selectedPhotographers.length === 0) {
      toast({
        title: "Atenção",
        description: "Selecione pelo menos um fotógrafo.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();

      const assignments = selectedPhotographers.map(photographerId => ({
        campaign_id: campaignId,
        photographer_id: photographerId,
        assigned_by: user?.id,
        is_active: true
      }));

      // Usar upsert para lidar com constraint única (evitar erro se fotógrafo já foi atribuído)
      const { error } = await supabase
        .from('campaign_photographers')
        .upsert(assignments, { 
          onConflict: 'campaign_id,photographer_id',
          ignoreDuplicates: false 
        });

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: `${selectedPhotographers.length} fotógrafo(s) atribuído(s) ao evento.`,
      });

      setSelectedPhotographers([]);
      await fetchPhotographers();
      invalidateRelatedCaches();
    } catch (error) {
      console.error('Error assigning photographers:', error);
      toast({
        title: "Erro ao atribuir",
        description: "Não foi possível atribuir os fotógrafos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePhotographer = async (assignmentId: string, photographerName: string) => {
    try {
      const { error } = await supabase
        .from('campaign_photographers')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;

      toast({
        title: "Removido!",
        description: `${photographerName} foi removido do evento.`,
      });

      await fetchPhotographers();
      invalidateRelatedCaches();
    } catch (error) {
      console.error('Error removing photographer:', error);
      toast({
        title: "Erro ao remover",
        description: "Não foi possível remover o fotógrafo.",
        variant: "destructive",
      });
    }
  };

  const togglePhotographerSelection = (photographerId: string) => {
    setSelectedPhotographers(prev =>
      prev.includes(photographerId)
        ? prev.filter(id => id !== photographerId)
        : [...prev, photographerId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <UserPlus className="h-4 w-4" />
          Gerenciar Fotógrafos
          {assignedPhotographers.length > 0 && (
            <Badge variant="secondary">{assignedPhotographers.length}</Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Fotógrafos do Evento</DialogTitle>
          <DialogDescription>
            Gerencie os fotógrafos atribuídos a "{campaignTitle}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Botão Atualizar */}
          <div className="flex justify-end">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => fetchPhotographers()}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar Lista
            </Button>
          </div>

          {/* Fotógrafos Atribuídos */}
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Fotógrafos Atribuídos ({assignedPhotographers.length})
            </h4>
            {assignedPhotographers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum fotógrafo atribuído ainda
              </p>
            ) : (
              <div className="space-y-2">
                {assignedPhotographers.map((photographer) => (
                  <div
                    key={photographer.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={photographer.avatar_url || undefined} />
                        <AvatarFallback>
                          {photographer.full_name?.[0] || photographer.email[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {photographer.full_name || photographer.email}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Atribuído em {new Date(photographer.assigned_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemovePhotographer(
                        photographer.assignment_id,
                        photographer.full_name || photographer.email
                      )}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Adicionar Novos Fotógrafos */}
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Adicionar Fotógrafos
            </h4>
            {availablePhotographers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Todos os fotógrafos já foram atribuídos
              </p>
            ) : (
              <>
                <ScrollArea className="h-[200px] border rounded-lg p-2">
                  <div className="space-y-2">
                    {availablePhotographers.map((photographer) => (
                      <div
                        key={photographer.id}
                        className="flex items-center space-x-3 p-2 hover:bg-muted rounded-lg cursor-pointer"
                        onClick={() => togglePhotographerSelection(photographer.id)}
                      >
                        <Checkbox
                          checked={selectedPhotographers.includes(photographer.id)}
                          onCheckedChange={() => togglePhotographerSelection(photographer.id)}
                        />
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={photographer.avatar_url || undefined} />
                          <AvatarFallback>
                            {photographer.full_name?.[0] || photographer.email[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {photographer.full_name || photographer.email}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {photographer.email}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <div className="flex justify-end gap-2 mt-4">
                  <Button
                    onClick={handleAssignPhotographers}
                    disabled={selectedPhotographers.length === 0 || loading}
                  >
                    {loading ? "Atribuindo..." : `Atribuir ${selectedPhotographers.length > 0 ? `(${selectedPhotographers.length})` : ""}`}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
