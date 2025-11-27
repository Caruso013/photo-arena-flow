import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { Bell, ArrowLeft, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const NotificationSettings = () => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  
  // Estados para diferentes tipos de notificações
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [saleNotifications, setSaleNotifications] = useState(true);
  const [payoutNotifications, setPayoutNotifications] = useState(true);
  const [applicationNotifications, setApplicationNotifications] = useState(true);
  const [systemAlerts, setSystemAlerts] = useState(true);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Aqui você implementaria a lógica para salvar as preferências
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulação
      
      toast({
        title: "Configurações salvas!",
        description: "As preferências de notificação foram atualizadas.",
      });
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
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
          <Bell className="h-8 w-8" />
          Preferências de Notificação
        </h1>
        <p className="text-muted-foreground mt-2">
          Configure como e quando receber notificações do sistema
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notificações por E-mail</CardTitle>
          <CardDescription>
            Configure quais notificações você deseja receber por e-mail
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-notifications" className="text-base">
                Notificações por E-mail
              </Label>
              <p className="text-sm text-muted-foreground">
                Receber todas as notificações por e-mail
              </p>
            </div>
            <Switch
              id="email-notifications"
              checked={emailNotifications}
              onCheckedChange={setEmailNotifications}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="sale-notifications" className="text-base">
                Notificações de Vendas
              </Label>
              <p className="text-sm text-muted-foreground">
                Alertas quando uma venda é realizada
              </p>
            </div>
            <Switch
              id="sale-notifications"
              checked={saleNotifications}
              onCheckedChange={setSaleNotifications}
              disabled={!emailNotifications}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="payout-notifications" className="text-base">
                Solicitações de Repasse
              </Label>
              <p className="text-sm text-muted-foreground">
                Alertas de novas solicitações de repasse
              </p>
            </div>
            <Switch
              id="payout-notifications"
              checked={payoutNotifications}
              onCheckedChange={setPayoutNotifications}
              disabled={!emailNotifications}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="application-notifications" className="text-base">
                Candidaturas de Fotógrafos
              </Label>
              <p className="text-sm text-muted-foreground">
                Alertas de novas candidaturas
              </p>
            </div>
            <Switch
              id="application-notifications"
              checked={applicationNotifications}
              onCheckedChange={setApplicationNotifications}
              disabled={!emailNotifications}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="system-alerts" className="text-base">
                Alertas do Sistema
              </Label>
              <p className="text-sm text-muted-foreground">
                Notificações críticas do sistema
              </p>
            </div>
            <Switch
              id="system-alerts"
              checked={systemAlerts}
              onCheckedChange={setSystemAlerts}
              disabled={!emailNotifications}
            />
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full gap-2"
            size="lg"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Salvar Preferências
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationSettings;
