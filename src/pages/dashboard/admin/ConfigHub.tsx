import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Bell, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ConfigHub = () => {
  const navigate = useNavigate();

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
