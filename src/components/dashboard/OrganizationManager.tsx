import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { Building2, Edit, Trash2, Plus, Power, PowerOff } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface Organization {
  id: string;
  name: string;
  description: string | null;
  admin_percentage: number;
  created_at: string;
  updated_at: string;
}

interface OrganizationManagerProps {
  organizations: Organization[];
  onRefresh: () => void;
}

export const OrganizationManager: React.FC<OrganizationManagerProps> = ({ organizations, onRefresh }) => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    admin_percentage: 30
  });

  const handleCreate = async () => {
    try {
      const { error } = await supabase
        .from('organizations')
        .insert([formData]);

      if (error) throw error;

      toast({
        title: "Organização criada!",
        description: "A organização foi criada com sucesso.",
      });

      setCreateDialogOpen(false);
      setFormData({ name: '', description: '', admin_percentage: 30 });
      onRefresh();
    } catch (error) {
      console.error('Error creating organization:', error);
      toast({
        title: "Erro ao criar",
        description: "Não foi possível criar a organização.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = async () => {
    if (!selectedOrg) return;

    try {
      const { error } = await supabase
        .from('organizations')
        .update(formData)
        .eq('id', selectedOrg.id);

      if (error) throw error;

      toast({
        title: "Organização atualizada!",
        description: "As informações foram atualizadas com sucesso.",
      });

      setEditDialogOpen(false);
      setSelectedOrg(null);
      onRefresh();
    } catch (error) {
      console.error('Error updating organization:', error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar a organização.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedOrg) return;

    try {
      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', selectedOrg.id);

      if (error) throw error;

      toast({
        title: "Organização excluída!",
        description: "A organização foi removida com sucesso.",
      });

      setDeleteDialogOpen(false);
      setSelectedOrg(null);
      onRefresh();
    } catch (error) {
      console.error('Error deleting organization:', error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir a organização.",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (org: Organization) => {
    setSelectedOrg(org);
    setFormData({
      name: org.name,
      description: org.description || '',
      admin_percentage: org.admin_percentage
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (org: Organization) => {
    setSelectedOrg(org);
    setDeleteDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Gerenciar Organizações
            </CardTitle>
            <CardDescription>
              Crie, edite ou exclua organizações da plataforma
            </CardDescription>
          </div>
          
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nova Organização
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Nova Organização</DialogTitle>
                <DialogDescription>
                  Preencha os dados para criar uma nova organização
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nome da organização"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descrição da organização"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="admin_percentage">Porcentagem Admin (%)</Label>
                  <Input
                    id="admin_percentage"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={formData.admin_percentage}
                    onChange={(e) => setFormData({ ...formData, admin_percentage: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <Button onClick={handleCreate} className="w-full">
                  Criar Organização
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {organizations.length === 0 ? (
          <div className="text-center p-8">
            <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma organização encontrada</h3>
            <p className="text-muted-foreground">Crie sua primeira organização</p>
          </div>
        ) : (
          <div className="space-y-4">
            {organizations.map((org) => (
              <Card key={org.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-lg">{org.name}</h4>
                      <p className="text-sm text-muted-foreground">{org.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-sm text-muted-foreground">
                          Criada em: {new Date(org.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="text-right mr-4">
                        <span className="text-lg font-bold text-primary">
                          {org.admin_percentage}%
                        </span>
                        <p className="text-xs text-muted-foreground">Admin</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditDialog(org)}
                        className="gap-1"
                      >
                        <Edit className="h-4 w-4" />
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => openDeleteDialog(org)}
                        className="gap-1"
                      >
                        <Trash2 className="h-4 w-4" />
                        Excluir
                      </Button>
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
            <DialogTitle>Editar Organização</DialogTitle>
            <DialogDescription>
              Atualize as informações da organização
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Nome</Label>
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
              <Label htmlFor="edit-admin-percentage">Porcentagem Admin (%)</Label>
              <Input
                id="edit-admin-percentage"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={formData.admin_percentage}
                onChange={(e) => setFormData({ ...formData, admin_percentage: parseFloat(e.target.value) || 0 })}
              />
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
              Esta ação não pode ser desfeita. A organização será permanentemente excluída.
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
