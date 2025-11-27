import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, ArrowLeft, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PermissionsManager = () => {
  const navigate = useNavigate();

  const roles = [
    {
      name: 'Administrador',
      description: 'Acesso total ao sistema',
      permissions: ['gerenciar_usuarios', 'gerenciar_eventos', 'gerenciar_financeiro', 'configuracoes_sistema'],
      color: 'destructive' as const,
    },
    {
      name: 'Fotógrafo',
      description: 'Pode criar eventos e gerenciar suas fotos',
      permissions: ['criar_eventos', 'upload_fotos', 'visualizar_vendas'],
      color: 'default' as const,
    },
    {
      name: 'Organização',
      description: 'Gerencia eventos da organização',
      permissions: ['gerenciar_eventos_org', 'visualizar_financeiro_org'],
      color: 'secondary' as const,
    },
    {
      name: 'Usuário',
      description: 'Pode comprar fotos e favoritar',
      permissions: ['comprar_fotos', 'favoritar'],
      color: 'outline' as const,
    },
  ];

  const permissionLabels: Record<string, string> = {
    gerenciar_usuarios: 'Gerenciar Usuários',
    gerenciar_eventos: 'Gerenciar Eventos',
    gerenciar_financeiro: 'Gerenciar Financeiro',
    configuracoes_sistema: 'Configurações do Sistema',
    criar_eventos: 'Criar Eventos',
    upload_fotos: 'Upload de Fotos',
    visualizar_vendas: 'Visualizar Vendas',
    gerenciar_eventos_org: 'Gerenciar Eventos (Org)',
    visualizar_financeiro_org: 'Financeiro (Org)',
    comprar_fotos: 'Comprar Fotos',
    favoritar: 'Favoritar Fotos',
  };

  return (
    <div className="container max-w-4xl py-8">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => navigate('/dashboard/admin/config')}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Voltar
      </Button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="h-8 w-8" />
          Gerenciar Permissões
        </h1>
        <p className="text-muted-foreground mt-2">
          Visualize e gerencie permissões por papel de usuário
        </p>
      </div>

      <div className="space-y-4">
        {roles.map((role) => (
          <Card key={role.name}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    {role.name}
                  </CardTitle>
                  <CardDescription className="mt-1.5">
                    {role.description}
                  </CardDescription>
                </div>
                <Badge variant={role.color}>{role.permissions.length} permissões</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Permissões:</p>
                <div className="flex flex-wrap gap-2">
                  {role.permissions.map((permission) => (
                    <Badge key={permission} variant="outline">
                      {permissionLabels[permission] || permission}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6 border-dashed">
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">
              As permissões são gerenciadas automaticamente pelo sistema baseado no papel do usuário.
            </p>
            <p className="text-sm mt-1">
              Para alterar o papel de um usuário, acesse <strong>Usuários</strong> no menu admin.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PermissionsManager;
