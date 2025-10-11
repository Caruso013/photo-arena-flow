import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/components/ui/use-toast';
import { UserPlus, Trash2, AlertCircle, Building2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface Organizer {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
  campaigns_count: number;
  total_revenue: number;
}

export const OrganizerManager = () => {
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOrganizers();
  }, []);

  const fetchOrganizers = async () => {
    try {
      // Buscar todos os usuários com role = 'organizer'
      const { data: organizersData, error: organizersError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'organizer' as any) // Type assertion temporário
        .order('created_at', { ascending: false });

      if (organizersError) throw organizersError;

      // Para cada organizador, buscar estatísticas
      const organizersWithStats = await Promise.all(
        (organizersData || []).map(async (org) => {
          // Contar campanhas
          const { count: campaignsCount } = await supabase
            .from('campaigns')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', org.id);

          // Buscar receita total
          const { data: revenueData } = await supabase
            .from('revenue_shares')
            .select('organization_amount')
            .eq('organization_id', org.id);

          const totalRevenue = revenueData?.reduce(
            (sum, r) => sum + Number(r.organization_amount),
            0
          ) || 0;

          return {
            ...org,
            campaigns_count: campaignsCount || 0,
            total_revenue: totalRevenue
          };
        })
      );

      setOrganizers(organizersWithStats);
    } catch (error) {
      console.error('Error fetching organizers:', error);
      toast({
        title: "Erro ao carregar organizadores",
        description: "Não foi possível carregar a lista de organizadores.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrganizer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setError('');

    try {
      // Validações
      if (!email || !fullName || !password) {
        setError('Todos os campos são obrigatórios');
        return;
      }

      if (password.length < 6) {
        setError('A senha deve ter no mínimo 6 caracteres');
        return;
      }

      // Criar usuário via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: 'organizer'
          }
        }
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('Usuário não foi criado');
      }

      // Atualizar o perfil para role = 'organizer'
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          role: 'organizer' as any, // Type assertion temporário
          full_name: fullName 
        })
        .eq('id', authData.user.id);

      if (updateError) throw updateError;

      toast({
        title: "Organizador criado!",
        description: `O organizador ${fullName} foi criado com sucesso.`,
      });

      setShowCreateDialog(false);
      setEmail('');
      setFullName('');
      setPassword('');
      fetchOrganizers();
    } catch (error: any) {
      console.error('Error creating organizer:', error);
      setError(error.message || 'Erro ao criar organizador');
      toast({
        title: "Erro ao criar organizador",
        description: error.message || "Não foi possível criar o organizador.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteOrganizer = async (organizerId: string, organizerName: string) => {
    if (!confirm(`Tem certeza que deseja remover o organizador ${organizerName}?`)) {
      return;
    }

    try {
      // Verificar se há campanhas vinculadas
      const { count: campaignsCount } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizerId);

      if (campaignsCount && campaignsCount > 0) {
        toast({
          title: "Não é possível remover",
          description: `Este organizador possui ${campaignsCount} campanha(s) vinculada(s). Remova ou transfira as campanhas primeiro.`,
          variant: "destructive",
        });
        return;
      }

      // Atualizar role para 'user' ao invés de deletar
      const { error } = await supabase
        .from('profiles')
        .update({ role: 'user' as any })
        .eq('id', organizerId);

      if (error) throw error;

      toast({
        title: "Organizador removido",
        description: `O organizador ${organizerName} foi removido com sucesso.`,
      });

      fetchOrganizers();
    } catch (error: any) {
      console.error('Error deleting organizer:', error);
      toast({
        title: "Erro ao remover organizador",
        description: error.message || "Não foi possível remover o organizador.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
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
              <Building2 className="h-5 w-5" />
              Gerenciar Organizadores
            </CardTitle>
            <CardDescription>
              Crie e gerencie perfis de organizadores. Apenas administradores podem criar organizadores.
            </CardDescription>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" />
                Novo Organizador
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Novo Organizador</DialogTitle>
                <DialogDescription>
                  Preencha os dados para criar um novo perfil de organizador.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateOrganizer} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nome Completo *</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nome da organização ou responsável"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@organizacao.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                    minLength={6}
                  />
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCreateDialog(false);
                      setEmail('');
                      setFullName('');
                      setPassword('');
                      setError('');
                    }}
                    disabled={isCreating}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isCreating}>
                    {isCreating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Criando...
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Criar Organizador
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {organizers.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum organizador cadastrado</h3>
            <p className="text-muted-foreground mb-4">
              Crie o primeiro perfil de organizador para começar
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-center">Eventos</TableHead>
                <TableHead className="text-right">Receita Total</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {organizers.map((org) => (
                <TableRow key={org.id}>
                  <TableCell className="font-medium">{org.full_name}</TableCell>
                  <TableCell>{org.email}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{org.campaigns_count}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold text-green-600">
                    {formatCurrency(org.total_revenue)}
                  </TableCell>
                  <TableCell>
                    {new Date(org.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteOrganizer(org.id, org.full_name)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default OrganizerManager;
