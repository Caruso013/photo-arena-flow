import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  UserCheck, 
  Plus, 
  Trash2, 
  Copy, 
  Clock, 
  QrCode,
  RefreshCw,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format, differenceInMinutes, differenceInHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MesarioSession {
  id: string;
  access_code: string;
  mesario_name: string;
  expires_at: string;
  is_active: boolean;
  created_at: string;
  campaign: {
    id: string;
    title: string;
    event_date: string | null;
  } | null;
}

interface Campaign {
  id: string;
  title: string;
  event_date: string | null;
}

const MesarioManager: React.FC = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<MesarioSession[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [mesarioName, setMesarioName] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState('');

  useEffect(() => {
    fetchData();
    
    // Auto-refresh every minute to update expiration times
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      // Fetch active campaigns
      const { data: campaignsData } = await supabase
        .from('campaigns')
        .select('id, title, event_date')
        .eq('is_active', true)
        .order('event_date', { ascending: false });

      if (campaignsData) {
        setCampaigns(campaignsData);
      }

      // Fetch mesario sessions
      const { data: sessionsData } = await supabase
        .from('mesario_sessions')
        .select(`
          id,
          access_code,
          mesario_name,
          expires_at,
          is_active,
          created_at,
          campaign:campaigns(id, title, event_date)
        `)
        .order('created_at', { ascending: false });

      if (sessionsData) {
        setSessions(sessionsData as MesarioSession[]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createSession = async () => {
    if (!mesarioName.trim() || !selectedCampaign) {
      toast.error('Preencha todos os campos');
      return;
    }

    setCreating(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('create-mesario-session', {
        body: {
          campaign_id: selectedCampaign,
          mesario_name: mesarioName.trim()
        },
        headers: {
          Authorization: `Bearer ${sessionData.session?.access_token}`
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.success) {
        toast.success('Sessão de mesário criada!', {
          description: `Código: ${response.data.session.access_code}`
        });
        setMesarioName('');
        setSelectedCampaign('');
        fetchData();
      } else {
        throw new Error(response.data?.error || 'Erro desconhecido');
      }
    } catch (error: any) {
      toast.error('Erro ao criar sessão', {
        description: error.message
      });
    } finally {
      setCreating(false);
    }
  };

  const deactivateSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('mesario_sessions')
        .update({ is_active: false })
        .eq('id', sessionId);

      if (error) throw error;

      toast.success('Sessão desativada');
      fetchData();
    } catch (error: any) {
      toast.error('Erro ao desativar sessão');
    }
  };

  const deleteSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('mesario_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      toast.success('Sessão excluída');
      fetchData();
    } catch (error: any) {
      toast.error('Erro ao excluir sessão');
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Código copiado!');
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    
    if (expiry <= now) {
      return { expired: true, text: 'Expirado' };
    }

    const hoursLeft = differenceInHours(expiry, now);
    const minutesLeft = differenceInMinutes(expiry, now) % 60;

    if (hoursLeft > 0) {
      return { expired: false, text: `${hoursLeft}h ${minutesLeft}m restantes` };
    }
    return { expired: false, text: `${minutesLeft}m restantes` };
  };

  const getSessionStatus = (session: MesarioSession) => {
    const timeInfo = getTimeRemaining(session.expires_at);
    
    if (!session.is_active) {
      return { status: 'inactive', label: 'Desativado', variant: 'secondary' as const };
    }
    if (timeInfo.expired) {
      return { status: 'expired', label: 'Expirado', variant: 'destructive' as const };
    }
    return { status: 'active', label: 'Ativo', variant: 'default' as const };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserCheck className="h-6 w-6" />
            Gerenciamento de Mesários
          </h1>
          <p className="text-muted-foreground">
            Crie e gerencie acessos temporários para mesários validarem fotógrafos
          </p>
        </div>
        <Button variant="outline" onClick={fetchData} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </Button>
      </div>

      <Alert>
        <Clock className="h-4 w-4" />
        <AlertDescription>
          Os acessos de mesário expiram automaticamente após <strong>12 horas</strong> e são removidos do sistema.
          Cada mesário recebe um código de 6 dígitos para acessar o scanner.
        </AlertDescription>
      </Alert>

      {/* Create New Session */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Criar Novo Acesso de Mesário
          </CardTitle>
          <CardDescription>
            Gere um código temporário para um mesário validar fotógrafos em um evento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mesario-name">Nome do Mesário</Label>
              <Input
                id="mesario-name"
                placeholder="Ex: João Silva"
                value={mesarioName}
                onChange={(e) => setMesarioName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="campaign">Evento</Label>
              <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o evento" />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.map((campaign) => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.title}
                      {campaign.event_date && (
                        <span className="text-muted-foreground ml-2">
                          ({format(new Date(campaign.event_date), 'dd/MM/yyyy', { locale: ptBR })})
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                onClick={createSession} 
                disabled={creating || !mesarioName || !selectedCampaign}
                className="w-full gap-2"
              >
                {creating ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <QrCode className="h-4 w-4" />
                )}
                Gerar Código
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sessions List */}
      <Card>
        <CardHeader>
          <CardTitle>Sessões de Mesário</CardTitle>
          <CardDescription>
            Lista de todos os acessos criados (ativos e expirados)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando...
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma sessão de mesário criada ainda.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Evento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tempo Restante</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => {
                  const statusInfo = getSessionStatus(session);
                  const timeInfo = getTimeRemaining(session.expires_at);

                  return (
                    <TableRow key={session.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="bg-muted px-2 py-1 rounded font-mono text-lg">
                            {session.access_code}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyCode(session.access_code)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {session.mesario_name}
                      </TableCell>
                      <TableCell>
                        {session.campaign?.title || 'Evento não encontrado'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusInfo.variant}>
                          {statusInfo.status === 'active' && <CheckCircle className="h-3 w-3 mr-1" />}
                          {statusInfo.status === 'expired' && <AlertTriangle className="h-3 w-3 mr-1" />}
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={timeInfo.expired ? 'text-destructive' : 'text-muted-foreground'}>
                          {timeInfo.text}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(session.created_at), 'dd/MM HH:mm', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {session.is_active && !timeInfo.expired && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deactivateSession(session.id)}
                            >
                              Desativar
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteSession(session.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MesarioManager;
