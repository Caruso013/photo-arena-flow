import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, Camera, UserCheck, TrendingUp, Activity } from 'lucide-react';
import StatCard from '@/components/dashboard/StatCard';

const AdminOverview = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    organizations: 0,
    users: 0,
    campaigns: 0,
    pendingApplications: 0,
    photographers: 0,
    totalRevenue: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);

      const [orgs, users, campaigns, applications, photographers] = await Promise.all([
        supabase.from('organizations').select('id', { count: 'exact' }),
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase.from('campaigns').select('id', { count: 'exact' }).eq('is_active', true),
        supabase.from('event_applications').select('id', { count: 'exact' }).eq('status', 'pending'),
        supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'photographer')
      ]);

      setStats({
        organizations: orgs.count || 0,
        users: users.count || 0,
        campaigns: campaigns.count || 0,
        pendingApplications: applications.count || 0,
        photographers: photographers.count || 0,
        totalRevenue: 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (profile?.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-2">Acesso Negado</h2>
        <p className="text-muted-foreground">Apenas administradores podem acessar esta página</p>
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Visão Geral</h1>
        <p className="text-muted-foreground">Painel administrativo da plataforma</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Organizações"
          value={stats.organizations}
          subtitle="Total de organizações"
          icon={Building2}
          iconColor="bg-amber-500 text-white"
          bgGradient="from-amber-50 to-amber-100"
        />
        
        <StatCard
          title="Usuários"
          value={stats.users}
          subtitle="Total de usuários"
          icon={Users}
          iconColor="bg-amber-500 text-white"
          bgGradient="from-amber-50 to-amber-100"
        />
        
        <StatCard
          title="Fotógrafos"
          value={stats.photographers}
          subtitle="Fotógrafos ativos"
          icon={Camera}
          iconColor="bg-amber-500 text-white"
          bgGradient="from-amber-50 to-amber-100"
        />
        
        <StatCard
          title="Eventos Ativos"
          value={stats.campaigns}
          subtitle="Campanhas em andamento"
          icon={Activity}
          iconColor="bg-amber-500 text-white"
          bgGradient="from-amber-50 to-amber-100"
        />
        
        <StatCard
          title="Candidaturas"
          value={stats.pendingApplications}
          subtitle="Aguardando aprovação"
          icon={UserCheck}
          iconColor="bg-amber-500 text-white"
          bgGradient="from-amber-50 to-amber-100"
        />
        
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground mb-1">Receita Total</p>
                <p className="text-2xl font-bold">R$ {stats.totalRevenue.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">Todas as transações</p>
              </div>
              <div className="p-3 bg-amber-500 text-white rounded-lg">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Atividade Recente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Nenhuma atividade recente</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alertas do Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Nenhum alerta no momento</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminOverview;
