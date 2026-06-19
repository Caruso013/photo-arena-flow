import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/dashboard/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import {
  Building2,
  Users,
  Camera,
  UserCheck,
  Wallet,
  ArrowRight,
  Megaphone,
  Settings,
  RefreshCw,
  Clock3,
  Sparkles,
} from 'lucide-react';

const AdminOverview = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    organizations: 0,
    users: 0,
    photographers: 0,
    campaigns: 0,
    pendingApplications: 0,
    pendingPayouts: 0,
  });
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);

      const [orgs, users, photographers, campaigns, applications, pendingPayouts] = await Promise.all([
        supabase.from('organizations').select('id', { count: 'exact' }),
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'photographer'),
        supabase.from('campaigns').select('id', { count: 'exact' }).eq('is_active', true),
        supabase.from('photographer_applications').select('id', { count: 'exact' }).eq('status', 'pending'),
        supabase.from('payout_requests').select('id', { count: 'exact' }).eq('status', 'pending'),
      ]);

      setStats({
        organizations: orgs.count || 0,
        users: users.count || 0,
        photographers: photographers.count || 0,
        campaigns: campaigns.count || 0,
        pendingApplications: applications.count || 0,
        pendingPayouts: pendingPayouts.count || 0,
      });
    } catch (error) {
      console.error('Error fetching admin overview stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const runReconciliation = async () => {
    setReconciling(true);
    try {
      const { data, error } = await supabase.functions.invoke('reconcile-pending-purchases');
      if (error) throw error;

      const reconciled = data?.results?.reconciled || 0;
      toast({
        title: 'Reconciliacao concluida',
        description:
          reconciled > 0
            ? `${reconciled} compra(s) liberada(s) automaticamente.`
            : 'Nenhuma compra pendente para liberar no momento.',
      });

      fetchStats();
    } catch (error: any) {
      toast({
        title: 'Erro na reconciliacao',
        description: error?.message || 'Nao foi possivel executar a reconciliacao.',
        variant: 'destructive',
      });
    } finally {
      setReconciling(false);
    }
  };

  if (profile?.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-2">Acesso Negado</h2>
        <p className="text-muted-foreground">Apenas administradores podem acessar esta pagina</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Organizacoes',
      value: stats.organizations,
      subtitle: 'Parceiros cadastrados',
      icon: Building2,
      color: 'from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50',
      iconBg: 'bg-blue-500',
      link: '/dashboard/admin/organizations',
    },
    {
      title: 'Usuarios',
      value: stats.users,
      subtitle: 'Contas totais da plataforma',
      icon: Users,
      color: 'from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/50',
      iconBg: 'bg-green-500',
      link: '/dashboard/admin/users',
    },
    {
      title: 'Fotografos',
      value: stats.photographers,
      subtitle: `${stats.pendingApplications} candidatura(s) pendente(s)`,
      icon: Camera,
      color: 'from-indigo-50 to-indigo-100 dark:from-indigo-950/50 dark:to-indigo-900/50',
      iconBg: 'bg-indigo-500',
      link: '/dashboard/admin/photographers',
    },
    {
      title: 'Eventos Ativos',
      value: stats.campaigns,
      subtitle: 'Campanhas em andamento',
      icon: Camera,
      color: 'from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/50',
      iconBg: 'bg-purple-500',
      link: '/dashboard/admin/events',
    },
    {
      title: 'Repasses Pendentes',
      value: stats.pendingPayouts,
      subtitle: 'Solicitacoes aguardando analise',
      icon: Wallet,
      color: 'from-amber-50 to-amber-100 dark:from-amber-950/50 dark:to-amber-900/50',
      iconBg: 'bg-amber-500',
      link: '/dashboard/admin/financial',
    },
  ];

  const groupedFlows = [
    {
      title: 'Eventos e Destaques',
      description: 'Administre eventos ativos e quais aparecem na vitrine.',
      icon: Camera,
      primaryAction: { label: 'Eventos', path: '/dashboard/admin/events' },
      secondaryAction: { label: 'Destaques', path: '/dashboard/admin/featured-events' },
    },
    {
      title: 'Comercial e Descontos',
      description: 'Centralize campanhas de cupom e descontos progressivos.',
      icon: Megaphone,
      primaryAction: { label: 'Cupons', path: '/dashboard/admin/coupons' },
      secondaryAction: { label: 'Descontos', path: '/dashboard/admin/progressive-discounts' },
    },
    {
      title: 'Pessoas e Operacao',
      description: 'Aprove candidaturas, gerencie usuarios e mesarios.',
      icon: UserCheck,
      primaryAction: { label: 'Fotografos', path: '/dashboard/admin/photographers' },
      secondaryAction: { label: 'Mesarios', path: '/dashboard/admin/mesarios' },
    },
    {
      title: 'Configuracao da Plataforma',
      description: 'Ajuste permissoes, notificacoes e banner da home.',
      icon: Settings,
      primaryAction: { label: 'Hub de Config', path: '/dashboard/admin/config' },
      secondaryAction: { label: 'Banner Home', path: '/dashboard/admin/config/platform' },
    },
  ];

  const operationalPending = [
    {
      label: 'Candidaturas de fotografos',
      value: stats.pendingApplications,
      path: '/dashboard/admin/photographers',
      icon: UserCheck,
    },
    {
      label: 'Repasses pendentes',
      value: stats.pendingPayouts,
      path: '/dashboard/admin/financial',
      icon: Wallet,
    },
    {
      label: 'Reconcilia pagamentos',
      value: 0,
      path: '/dashboard/admin/financial',
      icon: RefreshCw,
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6 pb-24 md:pb-0">
        <div className="rounded-3xl border border-amber-200/60 bg-gradient-to-r from-amber-50 via-white to-orange-50 p-4 sm:p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <Badge variant="outline" className="w-fit border-amber-300 text-amber-700 bg-amber-100/60">
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                Centro de comando
              </Badge>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Painel Administrativo</h1>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Acesse rapidamente as areas criticas e reduza o tempo operacional diario.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              <Button variant="outline" className="justify-start" onClick={() => navigate('/dashboard/admin/config/platform')}>
                <Settings className="h-4 w-4 mr-2" />
                Personalizar Home
              </Button>
              <Button variant="outline" className="justify-start" onClick={() => navigate('/dashboard/admin/photographers')}>
                <UserCheck className="h-4 w-4 mr-2" />
                Aprovar fotografos
              </Button>
              <Button onClick={runReconciliation} disabled={reconciling} className="justify-start">
                <RefreshCw className={`h-4 w-4 mr-2 ${reconciling ? 'animate-spin' : ''}`} />
                Reconciliar pagamentos
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {statCards.map((stat) => (
            <Card
              key={stat.title}
              className={`bg-gradient-to-br ${stat.color} border-0 cursor-pointer hover:shadow-lg transition-shadow`}
              onClick={() => navigate(stat.link)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-muted-foreground mb-2">{stat.title}</p>
                    <p className="text-3xl font-bold leading-none">{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-2">{stat.subtitle}</p>
                  </div>
                  <div className={`p-2.5 ${stat.iconBg} text-white rounded-xl`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock3 className="h-5 w-5 text-amber-600" />
                Pendencias Operacionais
              </CardTitle>
              <CardDescription>O que precisa de acao imediata.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {operationalPending.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => navigate(item.path)}
                  className="w-full rounded-xl border bg-background px-3 py-3 text-left hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <item.icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm truncate">{item.label}</span>
                    </div>
                    <span className="text-sm font-semibold">{item.value}</span>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Fluxos Agrupados</CardTitle>
              <CardDescription>Paginas relacionadas juntas para facilitar a rotina do time admin.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {groupedFlows.map((flow) => (
                  <div key={flow.title} className="rounded-xl border p-4 bg-background/50">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="rounded-lg bg-primary/10 p-2 text-primary">
                        <flow.icon className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">{flow.title}</h3>
                        <p className="text-xs text-muted-foreground mt-1">{flow.description}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => navigate(flow.primaryAction.path)}>
                        {flow.primaryAction.label}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => navigate(flow.secondaryAction.path)} className="gap-1">
                        {flow.secondaryAction.label}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminOverview;
