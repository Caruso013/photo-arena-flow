import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, User, Camera, DollarSign, Bell, Package } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { ExtraServicesManager } from '@/components/dashboard/ExtraServicesManager';

const PhotographerSettings = () => {
  const { profile } = useAuth();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie suas preferências e informações
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <User className="h-5 w-5" />
                Informações Pessoais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-foreground">Nome Completo</Label>
                <Input 
                  id="name" 
                  defaultValue={profile?.full_name || ''} 
                  className="bg-background text-foreground border-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">E-mail</Label>
                <Input 
                  id="email" 
                  type="email" 
                  defaultValue={profile?.email || ''} 
                  disabled 
                  className="bg-muted text-muted-foreground"
                />
                <p className="text-xs text-muted-foreground">
                  O e-mail não pode ser alterado
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-foreground">Telefone</Label>
                <Input 
                  id="phone" 
                  type="tel" 
                  placeholder="(00) 00000-0000" 
                  className="bg-background text-foreground border-input"
                />
              </div>
              <Button>Salvar Alterações</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Camera className="h-5 w-5" />
                Configurações de Fotógrafo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bio" className="text-foreground">Biografia</Label>
                <textarea 
                  id="bio"
                  rows={4}
                  placeholder="Conte um pouco sobre você e seu trabalho..."
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="portfolio" className="text-foreground">Link do Portfólio</Label>
                <Input 
                  id="portfolio" 
                  type="url" 
                  placeholder="https://..." 
                  className="bg-background text-foreground border-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instagram" className="text-foreground">Instagram</Label>
                <Input 
                  id="instagram" 
                  placeholder="@seu_usuario" 
                  className="bg-background text-foreground border-input"
                />
              </div>
              <Button>Salvar Configurações</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <DollarSign className="h-5 w-5" />
                Configurações Financeiras
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pix" className="text-foreground">Chave PIX</Label>
                <Input 
                  id="pix" 
                  placeholder="CPF, e-mail ou telefone" 
                  className="bg-background text-foreground border-input"
                />
                <p className="text-xs text-muted-foreground">
                  Utilizada para receber seus pagamentos
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank" className="text-foreground">Banco</Label>
                <Input 
                  id="bank" 
                  placeholder="Nome do banco" 
                  className="bg-background text-foreground border-input"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="agency" className="text-foreground">Agência</Label>
                  <Input 
                    id="agency" 
                    placeholder="0000" 
                    className="bg-background text-foreground border-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account" className="text-foreground">Conta</Label>
                  <Input 
                    id="account" 
                    placeholder="00000-0" 
                    className="bg-background text-foreground border-input"
                  />
                </div>
              </div>
              <Button>Salvar Dados Bancários</Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Bell className="h-5 w-5" />
                Notificações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Nova Venda</p>
                  <p className="text-xs text-muted-foreground">
                    Quando alguém comprar uma foto
                  </p>
                </div>
                <input 
                  type="checkbox" 
                  defaultChecked 
                  className="h-4 w-4 rounded border-input"
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Novo Upload</p>
                  <p className="text-xs text-muted-foreground">
                    Quando um upload for concluído
                  </p>
                </div>
                <input 
                  type="checkbox" 
                  defaultChecked 
                  className="h-4 w-4 rounded border-input"
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Pagamentos</p>
                  <p className="text-xs text-muted-foreground">
                    Atualizações sobre pagamentos
                  </p>
                </div>
                <input 
                  type="checkbox" 
                  defaultChecked 
                  className="h-4 w-4 rounded border-input"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Settings className="h-5 w-5" />
                Preferências
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="language" className="text-foreground">Idioma</Label>
                <select 
                  id="language"
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="pt-BR">Português (Brasil)</option>
                  <option value="en">English</option>
                  <option value="es">Español</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone" className="text-foreground">Fuso Horário</Label>
                <select 
                  id="timezone"
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="America/Sao_Paulo">Brasília (GMT-3)</option>
                  <option value="America/Manaus">Manaus (GMT-4)</option>
                  <option value="America/Rio_Branco">Rio Branco (GMT-5)</option>
                </select>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Seção de Serviços Extras */}
      <div className="mt-6">
        <ExtraServicesManager />
      </div>
    </div>
  );
};

export default PhotographerSettings;
