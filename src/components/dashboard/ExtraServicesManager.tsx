import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { Zap, Video, Mic, Plus, Edit, Trash2, Package, Loader2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';

interface ExtraService {
  id: string;
  photographer_id: string;
  name: string;
  description: string | null;
  price: number;
  is_active: boolean;
  service_type: string;
  created_at: string;
}

const SERVICE_TYPE_ICONS: Record<string, React.ReactNode> = {
  fast_delivery: <Zap className="h-4 w-4 text-yellow-500" />,
  video: <Video className="h-4 w-4 text-blue-500" />,
  recording: <Mic className="h-4 w-4 text-red-500" />,
  custom: <Package className="h-4 w-4 text-gray-500" />
};

const SERVICE_TYPE_LABELS: Record<string, string> = {
  fast_delivery: 'Entrega Rápida',
  video: 'Vídeo',
  recording: 'Gravação',
  custom: 'Personalizado'
};

export const ExtraServicesManager: React.FC = () => {
  const { user } = useAuth();
  const [services, setServices] = useState<ExtraService[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<ExtraService | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    is_active: true,
    service_type: 'custom'
  });

  useEffect(() => {
    if (user) {
      fetchServices();
    }
  }, [user]);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('extra_services')
        .select('*')
        .eq('photographer_id', user?.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Error fetching services:', error);
      toast({
        title: "Erro ao carregar serviços",
        description: "Não foi possível carregar seus serviços extras.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, informe o nome do serviço.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase
        .from('extra_services')
        .insert([{
          ...formData,
          photographer_id: user?.id
        }]);

      if (error) throw error;

      toast({
        title: "Serviço criado!",
        description: "O serviço extra foi adicionado com sucesso.",
      });

      setCreateDialogOpen(false);
      setFormData({ name: '', description: '', price: 0, is_active: true, service_type: 'custom' });
      fetchServices();
    } catch (error) {
      console.error('Error creating service:', error);
      toast({
        title: "Erro ao criar serviço",
        description: "Não foi possível criar o serviço.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedService) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('extra_services')
        .update(formData)
        .eq('id', selectedService.id);

      if (error) throw error;

      toast({
        title: "Serviço atualizado!",
        description: "As alterações foram salvas.",
      });

      setEditDialogOpen(false);
      setSelectedService(null);
      fetchServices();
    } catch (error) {
      console.error('Error updating service:', error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar o serviço.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedService) return;

    try {
      const { error } = await supabase
        .from('extra_services')
        .delete()
        .eq('id', selectedService.id);

      if (error) throw error;

      toast({
        title: "Serviço excluído!",
        description: "O serviço foi removido.",
      });

      setDeleteDialogOpen(false);
      setSelectedService(null);
      fetchServices();
    } catch (error) {
      console.error('Error deleting service:', error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir o serviço.",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (service: ExtraService) => {
    try {
      const { error } = await supabase
        .from('extra_services')
        .update({ is_active: !service.is_active })
        .eq('id', service.id);

      if (error) throw error;

      toast({
        title: service.is_active ? "Serviço desativado" : "Serviço ativado",
        description: `O serviço "${service.name}" foi ${service.is_active ? 'desativado' : 'ativado'}.`,
      });

      fetchServices();
    } catch (error) {
      console.error('Error toggling service:', error);
    }
  };

  const openEditDialog = (service: ExtraService) => {
    setSelectedService(service);
    setFormData({
      name: service.name,
      description: service.description || '',
      price: service.price,
      is_active: service.is_active,
      service_type: service.service_type
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (service: ExtraService) => {
    setSelectedService(service);
    setDeleteDialogOpen(true);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Serviços Extras
            </CardTitle>
            <CardDescription>
              Ofereça serviços adicionais aos seus clientes (entrega rápida, vídeos, gravação)
            </CardDescription>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Serviço
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Serviço Extra</DialogTitle>
                <DialogDescription>
                  Adicione um novo serviço para seus clientes
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="service-type">Tipo de Serviço</Label>
                  <select
                    id="service-type"
                    value={formData.service_type}
                    onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  >
                    <option value="fast_delivery">⚡ Entrega Rápida</option>
                    <option value="video">🎬 Vídeo de Fotos</option>
                    <option value="recording">🎙️ Gravação Pessoal</option>
                    <option value="custom">📦 Personalizado</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="name">Nome do Serviço</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Entrega Express 12h"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descreva o que está incluído neste serviço..."
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="price">Preço (R$)</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="active">Serviço Ativo</Label>
                  <Switch
                    id="active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                </div>
                <Button onClick={handleCreate} className="w-full" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Criar Serviço
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {services.length === 0 ? (
          <div className="text-center py-8">
            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum serviço extra</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Crie serviços adicionais para aumentar sua receita
            </p>
            <Button onClick={() => setCreateDialogOpen(true)} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Criar primeiro serviço
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {services.map((service) => (
              <div 
                key={service.id} 
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  service.is_active ? 'bg-card' : 'bg-muted/50 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    {SERVICE_TYPE_ICONS[service.service_type] || SERVICE_TYPE_ICONS.custom}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{service.name}</h4>
                      <Badge variant={service.is_active ? 'default' : 'secondary'}>
                        {service.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                      <Badge variant="outline">
                        {SERVICE_TYPE_LABELS[service.service_type] || 'Personalizado'}
                      </Badge>
                    </div>
                    {service.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {service.description}
                      </p>
                    )}
                    <p className="text-sm font-semibold text-primary mt-1">
                      R$ {service.price.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={service.is_active}
                    onCheckedChange={() => handleToggleActive(service)}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEditDialog(service)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => openDeleteDialog(service)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Serviço</DialogTitle>
            <DialogDescription>
              Atualize as informações do serviço
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-service-type">Tipo de Serviço</Label>
              <select
                id="edit-service-type"
                value={formData.service_type}
                onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              >
                <option value="fast_delivery">⚡ Entrega Rápida</option>
                <option value="video">🎬 Vídeo de Fotos</option>
                <option value="recording">🎙️ Gravação Pessoal</option>
                <option value="custom">📦 Personalizado</option>
              </select>
            </div>
            <div>
              <Label htmlFor="edit-name">Nome do Serviço</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
              <Label htmlFor="edit-price">Preço (R$)</Label>
              <Input
                id="edit-price"
                type="number"
                min="0"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-active">Serviço Ativo</Label>
              <Switch
                id="edit-active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
            <Button onClick={handleEdit} className="w-full" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar Alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Alert Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir serviço?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O serviço "{selectedService?.name}" será permanentemente excluído.
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

export default ExtraServicesManager;
