import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  UserCheck, Plus, Trash2, Copy, Clock, QrCode, RefreshCw, AlertTriangle, 
  CheckCircle, MessageCircle, KeyRound, UserPlus, Power, PowerOff
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format, differenceInHours, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MesarioSession {
  id: string;
  access_code: string;
  mesario_name: string;
  expires_at: string;
  is_active: boolean;
  created_at: string;
  campaign: { id: string; title: string; event_date: string | null } | null;
}

interface MesarioAccount {
  id: string;
  username: string;
  full_name: string;
  organization_id: string | null;
  is_active: boolean;
  created_at: string;
  organization?: { name: string } | null;
}

interface Campaign {
  id: string;
  title: string;
  event_date: string | null;
}

interface Organization {
  id: string;
  name: string;
}

const MesarioManager: React.FC = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<MesarioSession[]>([]);
  const [accounts, setAccounts] = useState<MesarioAccount[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  // Create account form
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newOrgId, setNewOrgId] = useState('');
  const [creatingAccount, setCreatingAccount] = useState(false);

  // Create session form (legacy)
  const [mesarioName, setMesarioName] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [creatingSession, setCreatingSession] = useState(false);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [campaignsRes, sessionsRes, accountsRes, orgsRes] = await Promise.all([
        supabase.from('campaigns').select('id, title, event_date').eq('is_active', true).order('event_date', { ascending: false }),
        supabase.from('mesario_sessions').select('id, access_code, mesario_name, expires_at, is_active, created_at, campaign:campaigns(id, title, event_date)').order('created_at', { ascending: false }),
        supabase.from('mesario_accounts' as any).select('id, username, full_name, organization_id, is_active, created_at').order('created_at', { ascending: false }),
        supabase.from('organizations').select('id, name').order('name'),
      ]);

      if (campaignsRes.data) setCampaigns(campaignsRes.data);
      if (sessionsRes.data) setSessions(sessionsRes.data as MesarioSession[]);
      if (orgsRes.data) setOrganizations(orgsRes.data);

      // Enrich accounts with org names
      if (accountsRes.data) {
        const orgMap = new Map((orgsRes.data || []).map(o => [o.id, o.name]));
        setAccounts((accountsRes.data as any[]).map((a: any) => ({
          ...a,
          organization: a.organization_id ? { name: orgMap.get(a.organization_id) || 'Desconhecida' } : null,
        })));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // ---- Account Management ----
  const createAccount = async () => {
    if (!newUsername.trim() || !newPassword.trim() || !newFullName.trim()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setCreatingAccount(true);
    try {
      const { error } = await supabase
        .from('mesario_accounts' as any)
        .insert({
          username: newUsername.trim().toLowerCase(),
          password_hash: newPassword, // trigger will hash it
          full_name: newFullName.trim(),
          organization_id: newOrgId && newOrgId !== 'none' ? newOrgId : null,
        } as any);

      if (error) {
        if (error.code === '23505') {
          toast.error('Este nome de usuário já existe');
        } else {
          throw error;
        }
        return;
      }

      toast.success('Conta de mesário criada!');
      setNewUsername('');
      setNewPassword('');
      setNewFullName('');
      setNewOrgId('');
      fetchData();
    } catch (error: any) {
      toast.error('Erro ao criar conta', { description: error.message });
    } finally {
      setCreatingAccount(false);
    }
  };

  const toggleAccountActive = async (account: MesarioAccount) => {
    try {
      const { error } = await supabase
        .from('mesario_accounts' as any)
        .update({ is_active: !account.is_active } as any)
        .eq('id', account.id);
      if (error) throw error;
      toast.success(account.is_active ? 'Conta desativada' : 'Conta ativada');
      fetchData();
    } catch (error: any) {
      toast.error('Erro ao atualizar conta');
    }
  };

  const deleteAccount = async (id: string) => {
    try {
      const { error } = await supabase.from('mesario_accounts' as any).delete().eq('id', id);
      if (error) throw error;
      toast.success('Conta excluída');
      fetchData();
    } catch (error: any) {
      toast.error('Erro ao excluir conta');
    }
  };

  // ---- Legacy Session Management ----
  const createSession = async () => {
    if (!mesarioName.trim() || !selectedCampaign) {
      toast.error('Preencha todos os campos');
      return;
    }
    setCreatingSession(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke('create-mesario-session', {
        body: { campaign_id: selectedCampaign, mesario_name: mesarioName.trim() },
        headers: { Authorization: `Bearer ${sessionData.session?.access_token}` }
      });
      if (response.error) throw new Error(response.error.message);
      if (response.data?.success) {
        toast.success('Sessão criada!', { description: `Código: ${response.data.session.access_code}` });
        setMesarioName('');
        setSelectedCampaign('');
        fetchData();
      } else {
        throw new Error(response.data?.error || 'Erro desconhecido');
      }
    } catch (error: any) {
      toast.error('Erro ao criar sessão', { description: error.message });
    } finally {
      setCreatingSession(false);
    }
  };

  const deactivateSession = async (sessionId: string) => {
    try {
      const { error } = await supabase.from('mesario_sessions').update({ is_active: false }).eq('id', sessionId);
      if (error) throw error;
      toast.success('Sessão desativada');
      fetchData();
    } catch { toast.error('Erro ao desativar sessão'); }
  };

  const deleteSession = async (sessionId: string) => {
    try {
      const { error } = await supabase.from('mesario_sessions').delete().eq('id', sessionId);
      if (error) throw error;
      toast.success('Sessão excluída');
      fetchData();
    } catch { toast.error('Erro ao excluir sessão'); }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Código copiado!');
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    if (expiry <= now) return { expired: true, text: 'Expirado' };
    const hoursLeft = differenceInHours(expiry, now);
    const minutesLeft = differenceInMinutes(expiry, now) % 60;
    return { expired: false, text: hoursLeft > 0 ? `${hoursLeft}h ${minutesLeft}m` : `${minutesLeft}m` };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserCheck className="h-6 w-6" />
            Gerenciamento de Mesários
          </h1>
          <p className="text-muted-foreground">Crie contas e gerencie acessos para mesários</p>
        </div>
        <Button variant="outline" onClick={fetchData} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </Button>
      </div>

      <Tabs defaultValue="accounts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="accounts" className="gap-2">
            <KeyRound className="h-4 w-4" />
            Contas (User/Senha)
          </TabsTrigger>
          <TabsTrigger value="sessions" className="gap-2">
            <QrCode className="h-4 w-4" />
            Sessões (Código)
          </TabsTrigger>
        </TabsList>

        {/* ---- ACCOUNTS TAB ---- */}
        <TabsContent value="accounts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Criar Conta de Mesário
              </CardTitle>
              <CardDescription>
                Crie uma conta com usuário e senha para o mesário acessar /mesario
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome Completo *</Label>
                  <Input placeholder="João Silva" value={newFullName} onChange={e => setNewFullName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Organização</Label>
                  <Select value={newOrgId} onValueChange={setNewOrgId}>
                    <SelectTrigger><SelectValue placeholder="Selecione (opcional)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem organização</SelectItem>
                      {organizations.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Usuário *</Label>
                  <Input placeholder="joao.silva" value={newUsername} onChange={e => setNewUsername(e.target.value.toLowerCase().replace(/\s/g, ''))} />
                </div>
                <div className="space-y-2">
                  <Label>Senha *</Label>
                  <Input type="password" placeholder="Mínimo 4 caracteres" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                </div>
              </div>
              <Button onClick={createAccount} disabled={creatingAccount || !newUsername || !newPassword || !newFullName} className="mt-4 gap-2">
                {creatingAccount ? <RefreshCw className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                Criar Conta
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contas de Mesários</CardTitle>
              <CardDescription>{accounts.length} conta(s) cadastrada(s)</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Carregando...</div>
              ) : accounts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">Nenhuma conta criada.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Organização</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Criado em</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accounts.map(account => (
                      <TableRow key={account.id}>
                        <TableCell><code className="bg-muted px-2 py-1 rounded text-sm">{account.username}</code></TableCell>
                        <TableCell className="font-medium">{account.full_name}</TableCell>
                        <TableCell>{account.organization?.name || '—'}</TableCell>
                        <TableCell>
                          <Badge variant={account.is_active ? 'default' : 'secondary'}>
                            {account.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(account.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => toggleAccountActive(account)}>
                              {account.is_active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                            </Button>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => deleteAccount(account.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- SESSIONS TAB (legacy) ---- */}
        <TabsContent value="sessions" className="space-y-4">
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Sessões com código de 6 dígitos (sistema legado). Para o novo sistema com user/senha, use a aba "Contas".
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5" />Criar Sessão (Código)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Nome do Mesário</Label>
                  <Input placeholder="Ex: João Silva" value={mesarioName} onChange={e => setMesarioName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Evento</Label>
                  <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                    <SelectTrigger><SelectValue placeholder="Selecione o evento" /></SelectTrigger>
                    <SelectContent>
                      {campaigns.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.title} {c.event_date && `(${format(new Date(c.event_date), 'dd/MM/yyyy', { locale: ptBR })})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={createSession} disabled={creatingSession || !mesarioName || !selectedCampaign} className="w-full gap-2">
                    {creatingSession ? <RefreshCw className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                    Gerar Código
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sessões de Mesário</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Carregando...</div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">Nenhuma sessão criada.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Evento</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tempo</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map(session => {
                      const timeInfo = getTimeRemaining(session.expires_at);
                      const isExpired = timeInfo.expired;
                      const isActive = session.is_active && !isExpired;

                      return (
                        <TableRow key={session.id}>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <code className="bg-muted px-2 py-1 rounded font-mono">{session.access_code}</code>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyCode(session.access_code)}>
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{session.mesario_name}</TableCell>
                          <TableCell>{session.campaign?.title || '—'}</TableCell>
                          <TableCell>
                            <Badge variant={isActive ? 'default' : isExpired ? 'destructive' : 'secondary'}>
                              {isActive ? 'Ativo' : isExpired ? 'Expirado' : 'Inativo'}
                            </Badge>
                          </TableCell>
                          <TableCell className={isExpired ? 'text-destructive' : 'text-muted-foreground'}>{timeInfo.text}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {isActive && (
                                <Button variant="outline" size="sm" onClick={() => deactivateSession(session.id)}>Desativar</Button>
                              )}
                              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteSession(session.id)}>
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
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MesarioManager;
