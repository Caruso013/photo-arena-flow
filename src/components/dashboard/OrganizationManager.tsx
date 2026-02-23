import React, { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { Building2, Edit, Trash2, Plus, Key, Copy, Check, Upload, Palette, Image } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface Organization {
  id: string;
  name: string;
  description: string | null;
  admin_percentage: number;
  logo_url: string | null;
  primary_color: string | null;
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
  const [credentialsDialogOpen, setCredentialsDialogOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [creatingCredentials, setCreatingCredentials] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    admin_percentage: 30,
    logo_url: '',
    primary_color: '#D4AF37'
  });

  const generateCredentials = (orgName: string, createdAt?: string) => {
    // Nome limpo para o email (sem acentos e caracteres especiais)
    let login = orgName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim();
    
    // Se o nome tem mais de 15 caracteres, usar apenas as iniciais ou abreviar
    if (login.replace(/\s+/g, '').length > 15) {
      // Tentar pegar a primeira palavra (sigla se existir, ex: "apf")
      const words = login.split(/[\s-]+/).filter(w => w.length > 0);
      
      // Se a primeira palavra parece ser uma sigla (até 6 chars), usar ela
      if (words[0] && words[0].length <= 6) {
        login = words[0];
      } else {
        // Senão, criar sigla das primeiras letras (max 8 letras)
        login = words.map(w => w.charAt(0)).join('').substring(0, 8);
      }
    }
    
    // Remover espaços restantes
    login = login.replace(/\s+/g, '');
    
    // Garantir mínimo de 3 caracteres
    if (login.length < 3) {
      login = orgName.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '')
        .substring(0, 10);
    }
    
    // Senha determinística: Login@DataCriação (DDMMYYYY)
    // Capitaliza primeira letra para atender requisito de maiúscula do Supabase
    const date = createdAt ? new Date(createdAt) : new Date();
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const dateString = `${day}${month}${year}`;
    const capitalizedLogin = login.charAt(0).toUpperCase() + login.slice(1);
    
    return {
      email: `${login}@stafotos.com`,
      password: `${capitalizedLogin}@${dateString}`
    };
  };

  const handleCreateCredentials = async (org: Organization) => {
    setCreatingCredentials(true);
    try {
      const { email, password } = generateCredentials(org.name, org.created_at);

      // Tentar usar Edge Function primeiro (produção)
      try {
        const { data, error } = await supabase.functions.invoke(
          'create-organization-user',
          { 
            body: { 
              organizationId: org.id,
              organizationName: org.name,
              email,
              password
            } 
          }
        );

        if (error) throw error;

        toast({
          title: "✅ Credenciais criadas com sucesso!",
          description: (
            <div className="space-y-2 mt-2">
              <p className="font-semibold">Credenciais de acesso para {org.name}:</p>
              <div className="bg-muted p-3 rounded text-sm space-y-1">
                <p><strong>Email:</strong> {email}</p>
                <p><strong>Senha:</strong> {password}</p>
                <p className="text-muted-foreground mt-2">
                  Acesse em: /auth/organization
                </p>
              </div>
            </div>
          ),
          duration: 15000,
        });
        
        setCredentialsDialogOpen(false);
        return;
      } catch (funcError: any) {
        // Se Edge Function falhar (local), criar manualmente
        console.log('Edge Function não disponível, criando localmente...');
      }

      // Fallback: Criar usuário diretamente (SOMENTE ADMIN)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: org.name,
            role: 'organization',
            organization_name: org.name
          },
          emailRedirectTo: undefined // Não enviar email
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Usuário não criado');

      // Atualizar perfil manualmente
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: authData.user.id,
          email,
          full_name: org.name,
          role: 'organization'
        });

      if (profileError) throw profileError;

      // Vincular à organização
      const { error: linkError } = await supabase
        .from('organization_users')
        .insert({
          user_id: authData.user.id,
          organization_id: org.id
        });

      if (linkError) throw linkError;

      toast({
        title: "✅ Credenciais criadas com sucesso!",
        description: (
          <div className="space-y-2 mt-2">
            <p className="font-semibold">Credenciais de acesso para {org.name}:</p>
            <div className="bg-muted p-3 rounded text-sm space-y-1">
              <p><strong>Email:</strong> {email}</p>
              <p><strong>Senha:</strong> {password}</p>
              <p className="text-muted-foreground mt-2">
                Acesse em: /auth/organization
              </p>
            </div>
          </div>
        ),
        duration: 15000,
      });
      
      setCredentialsDialogOpen(false);
    } catch (error: any) {
      console.error('Error creating credentials:', error);
      toast({
        title: "Erro ao criar credenciais",
        description: error.message || "Não foi possível criar as credenciais. O usuário pode já existir.",
        variant: "destructive",
      });
    } finally {
      setCreatingCredentials(false);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const openCredentialsDialog = (org: Organization) => {
    setSelectedOrg(org);
    setCredentialsDialogOpen(true);
  };

  const handleCreate = async () => {
    try {
      // 1. Criar organização
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert([formData])
        .select()
        .single();

      if (orgError) throw orgError;

      // 2. Gerar credenciais de login
      const { email, password } = generateCredentials(formData.name);

      // 3. Tentar criar usuário via Edge Function (produção) ou diretamente (local)
      let userCreated = false;
      
      try {
        const { data: authData, error: authError } = await supabase.functions.invoke(
          'create-organization-user',
          { 
            body: { 
              organizationId: orgData.id,
              organizationName: formData.name,
              email,
              password
            } 
          }
        );

        if (!authError) {
          userCreated = true;
        }
      } catch (funcError) {
        console.log('Edge Function não disponível, criando localmente...');
      }

      // Fallback: Criar usuário diretamente se Edge Function falhar
      if (!userCreated) {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: formData.name,
              role: 'organization',
              organization_name: formData.name
            },
            emailRedirectTo: undefined
          }
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error('Usuário não criado');

        // Atualizar perfil
        await supabase
          .from('profiles')
          .upsert({
            id: authData.user.id,
            email,
            full_name: formData.name,
            role: 'organization'
          });

        // Vincular à organização
        await supabase
          .from('organization_users')
          .insert({
            user_id: authData.user.id,
            organization_id: orgData.id
          });
      }

      // 4. Mostrar credenciais em toast com instruções
      toast({
        title: "✅ Organização criada com sucesso!",
        description: (
          <div className="space-y-2 mt-2">
            <p className="font-semibold">Credenciais de acesso:</p>
            <div className="bg-muted p-3 rounded text-sm space-y-1">
              <p><strong>Email:</strong> {email}</p>
              <p><strong>Senha:</strong> {password}</p>
              <p className="text-muted-foreground mt-2">
                Acesse em: /auth/organization
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Copie e envie estas credenciais para a organização.
            </p>
          </div>
        ),
        duration: 15000,
      });

      setCreateDialogOpen(false);
      setFormData({ name: '', description: '', admin_percentage: 30, logo_url: '', primary_color: '#D4AF37' });
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
      admin_percentage: org.admin_percentage,
      logo_url: org.logo_url || '',
      primary_color: org.primary_color || '#D4AF37'
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
              <Card key={org.id} className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      {/* Logo */}
                      {org.logo_url ? (
                        <img 
                          src={org.logo_url} 
                          alt={`Logo ${org.name}`}
                          className="w-14 h-14 object-contain rounded-lg border bg-white p-1"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div 
                          className="w-14 h-14 rounded-lg flex items-center justify-center text-white font-bold text-xl"
                          style={{ backgroundColor: org.primary_color || '#D4AF37' }}
                        >
                          {org.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 
                            className="font-semibold text-lg"
                            style={{ color: org.primary_color || undefined }}
                          >
                            {org.name}
                          </h4>
                          {org.primary_color && (
                            <div 
                              className="w-4 h-4 rounded-full border"
                              style={{ backgroundColor: org.primary_color }}
                              title={`Cor: ${org.primary_color}`}
                            />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{org.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-sm text-muted-foreground">
                            Criada em: {new Date(org.created_at).toLocaleDateString()}
                          </span>
                        </div>
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
                        variant="secondary"
                        onClick={() => openCredentialsDialog(org)}
                        className="gap-1"
                      >
                        <Key className="h-4 w-4" />
                        Criar Acesso
                      </Button>
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

      {/* Create Credentials Dialog */}
      <Dialog open={credentialsDialogOpen} onOpenChange={setCredentialsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Criar Credenciais de Acesso
            </DialogTitle>
            <DialogDescription>
              Crie credenciais de login para a organização {selectedOrg?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedOrg && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg space-y-3">
                <p className="text-sm font-medium">Credenciais que serão criadas:</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs text-muted-foreground">Email</Label>
                      <p className="font-mono text-sm break-all">{generateCredentials(selectedOrg.name, selectedOrg.created_at).email}</p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => copyToClipboard(generateCredentials(selectedOrg.name, selectedOrg.created_at).email, 'email')}
                    >
                      {copiedField === 'email' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs text-muted-foreground">Senha</Label>
                      <p className="font-mono text-sm break-all">{generateCredentials(selectedOrg.name, selectedOrg.created_at).password}</p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => copyToClipboard(generateCredentials(selectedOrg.name, selectedOrg.created_at).password, 'password')}
                    >
                      {copiedField === 'password' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 rounded-lg">
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  ⚠️ Se o usuário já existir, a senha será atualizada. Anote e envie as credenciais para a organização.
                </p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3 rounded-lg">
                <p className="text-xs text-blue-800 dark:text-blue-200">
                  <strong>Acesso:</strong> A organização deve acessar em /auth/organization e usar estas credenciais.
                </p>
              </div>

              <Button 
                onClick={() => handleCreateCredentials(selectedOrg)} 
                className="w-full"
                disabled={creatingCredentials}
              >
                {creatingCredentials ? 'Criando/Atualizando...' : 'Criar/Atualizar Credenciais'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Organização</DialogTitle>
            <DialogDescription>
              Atualize as informações da organização
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
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

            {/* Cor Primária */}
            <div className="space-y-2">
              <Label htmlFor="edit-primary-color" className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Cor Primária
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  id="edit-primary-color"
                  type="color"
                  value={formData.primary_color}
                  onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                  className="w-16 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={formData.primary_color}
                  onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                  placeholder="#D4AF37"
                  className="flex-1 font-mono"
                />
                <div 
                  className="w-10 h-10 rounded-md border"
                  style={{ backgroundColor: formData.primary_color }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Esta cor será usada para destacar o nome da organização
              </p>
            </div>

            {/* Logo Upload */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Image className="h-4 w-4" />
                Logo da Organização
              </Label>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 5 * 1024 * 1024) {
                    toast({ title: 'Arquivo muito grande', description: 'Máximo 5MB', variant: 'destructive' });
                    return;
                  }
                  setUploadingLogo(true);
                  try {
                    const ext = file.name.split('.').pop();
                    const fileName = `${selectedOrg?.id || 'new'}_${Date.now()}.${ext}`;
                    const { error: uploadErr } = await supabase.storage.from('org-logos').upload(fileName, file);
                    if (uploadErr) throw uploadErr;
                    const { data: urlData } = supabase.storage.from('org-logos').getPublicUrl(fileName);
                    setFormData(prev => ({ ...prev, logo_url: urlData.publicUrl }));
                    toast({ title: 'Logo enviada com sucesso!' });
                  } catch (err: any) {
                    console.error('Upload error:', err);
                    toast({ title: 'Erro no upload', description: err.message, variant: 'destructive' });
                  } finally {
                    setUploadingLogo(false);
                  }
                }}
              />
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  disabled={uploadingLogo}
                  onClick={() => logoInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4" />
                  {uploadingLogo ? 'Enviando...' : 'Enviar Logo'}
                </Button>
                <Input
                  type="url"
                  value={formData.logo_url}
                  onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                  placeholder="ou cole a URL da logo"
                  className="flex-1"
                />
              </div>
              {formData.logo_url && (
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <img 
                    src={formData.logo_url} 
                    alt="Preview logo" 
                    className="w-12 h-12 object-contain rounded"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/48?text=Logo';
                    }}
                  />
                  <span className="text-sm text-muted-foreground">Preview da logo</span>
                </div>
              )}
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
