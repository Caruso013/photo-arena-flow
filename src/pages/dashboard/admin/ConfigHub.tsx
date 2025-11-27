import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Bell, Users, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const ConfigHub = () => {
  const navigate = useNavigate();
  const [generatingCodes, setGeneratingCodes] = useState(false);

  const generateShortCodes = async () => {
    setGeneratingCodes(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-campaign-short-codes');
      
      if (error) throw error;
      
      toast.success(data.message || 'Códigos curtos gerados com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar códigos:', error);
      toast.error('Erro ao gerar códigos curtos');
    } finally {
      setGeneratingCodes(false);
    }
  };

  const configSections = [
    {
      title: 'Configurações Gerais',
      items: [
        {
          icon: Settings,
          label: 'Configurações da Plataforma',
          description: 'Gerencie taxas, porcentagens e links curtos',
          path: '/dashboard/admin/config/platform',
        },
        {
          icon: Bell,
          label: 'Preferências de Notificação',
          description: 'Configure notificações do sistema',
          path: '/dashboard/admin/config/notifications',
        },
      ],
    },
    {
      title: 'Gestão de Usuários',
      items: [
        {
          icon: Users,
          label: 'Gerenciar Permissões',
          description: 'Configure permissões e papéis de usuários',
          path: '/dashboard/admin/config/permissions',
        },
      ],
    },
  ];

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Settings className="h-8 w-8" />
          Configurações do Sistema
        </h1>
        <p className="text-muted-foreground mt-2">
          Configure preferências e configurações administrativas
        </p>
      </div>

      <div className="space-y-6">
        {/* Card de Ação Rápida - Links Curtos */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <LinkIcon className="h-5 w-5" />
              Links Curtos para Eventos
            </CardTitle>
            <CardDescription>
              Garanta que todos os eventos tenham códigos curtos para compartilhamento fácil (formato: <code className="bg-muted px-1 rounded">sta.com/E/ABC123</code>)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={generateShortCodes}
              disabled={generatingCodes}
              className="w-full"
            >
              <LinkIcon className="h-4 w-4 mr-2" />
              {generatingCodes ? 'Gerando códigos...' : 'Gerar Códigos para Eventos Sem Link'}
            </Button>
          </CardContent>
        </Card>

        {configSections.map((section) => (
          <Card key={section.title}>
            <CardHeader>
              <CardTitle className="text-lg">{section.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.label}
                    variant="outline"
                    className="w-full justify-start h-auto py-4 px-4"
                    onClick={() => navigate(item.path)}
                  >
                    <div className="flex items-start gap-3 w-full">
                      <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 text-left">
                        <div className="font-medium">{item.label}</div>
                        <div className="text-sm text-muted-foreground font-normal">
                          {item.description}
                        </div>
                      </div>
                    </div>
                  </Button>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ConfigHub;
