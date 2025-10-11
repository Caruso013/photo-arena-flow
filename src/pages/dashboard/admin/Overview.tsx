import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, Users, Camera, UserCheck } from 'lucide-react';
import AdminLayout from '@/components/dashboard/AdminLayout';

const AdminOverview = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    organizations: 0,
    activeOrganizations: 0,
    users: 0,
    campaigns: 0,
    pendingApplications: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);

      const [orgs, users, campaigns, applications] = await Promise.all([
        supabase.from('organizations').select('id', { count: 'exact' }),
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase.from('campaigns').select('id', { count: 'exact' }).eq('is_active', true),
        supabase.from('event_applications').select('id', { count: 'exact' }).eq('status', 'pending')
      ]);

      setStats({
        organizations: orgs.count || 0,
        activeOrganizations: orgs.count || 0,
        users: users.count || 0,
        campaigns: campaigns.count || 0,
        pendingApplications: applications.count || 0
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

  const statCards = [
    {
      title: 'Organizações Ativas',
      value: stats.activeOrganizations,
      total: stats.organizations,
      trend: '+12%',
      icon: Building2,
      color: 'from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50',
      iconBg: 'bg-blue-500',
      link: '/dashboard/admin/organizations'
    },
    {
      title: 'Usuários Registrados',
      value: stats.users,
      trend: '+8%',
      subtitle: 'Crescimento mensal',
      icon: Users,
      color: 'from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/50',
      iconBg: 'bg-green-500',
      link: '/dashboard/admin/users'
    },
    {
      title: 'Eventos Ativos',
      value: stats.campaigns,
      total: stats.campaigns,
      trend: '+15%',
      icon: Camera,
      color: 'from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/50',
      iconBg: 'bg-purple-500',
      link: '/dashboard/admin/events'
    },
    {
      title: 'Candidaturas Pendentes',
      value: stats.pendingApplications,
      trend: '+5%',
      subtitle: 'Requer aprovação',
      icon: UserCheck,
      color: 'from-orange-50 to-orange-100 dark:from-orange-950/50 dark:to-orange-900/50',
      iconBg: 'bg-orange-500',
      link: '/dashboard/admin/photographers'
    }
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bem-vindo ao Painel Administrativo</h1>
          <p className="text-muted-foreground">Gerencie organizações, eventos e fotógrafos da plataforma</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <Card 
              key={stat.title}
              className={`bg-gradient-to-br ${stat.color} border-0 cursor-pointer hover:shadow-lg transition-shadow`}
              onClick={() => navigate(stat.link)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground mb-2">{stat.title}</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-4xl font-bold">{stat.value}</p>
                      {stat.trend && (
                        <span className="text-sm font-medium text-green-600 dark:text-green-400">
                          {stat.trend}
                        </span>
                      )}
                    </div>
                    {stat.total !== undefined && (
                      <p className="text-sm text-muted-foreground mt-1">{stat.total} total</p>
                    )}
                    {stat.subtitle && (
                      <p className="text-sm text-muted-foreground mt-1">{stat.subtitle}</p>
                    )}
                  </div>
                  <div className={`p-3 ${stat.iconBg} text-white rounded-xl`}>
                    <stat.icon className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="p-8 text-center">
            <Camera className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-xl font-semibold mb-2">Solicitações Pendentes (0)</h3>
            <p className="text-muted-foreground">Nenhuma solicitação pendente no momento</p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminOverview;
