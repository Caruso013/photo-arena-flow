import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { OrganizationManager } from '@/components/dashboard/OrganizationManager';
import { toast } from '@/components/ui/use-toast';
import AdminLayout from '@/components/dashboard/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign } from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  description: string | null;
  admin_percentage: number;
  created_at: string;
  updated_at: string;
  monthly_revenue?: number;
}

const AdminOrganizations = () => {
  const { profile } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      
      // Buscar organizações
      const { data: orgsData, error: orgsError } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (orgsError) throw orgsError;

      // Para cada organização, calcular receita do mês atual
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

      const orgsWithRevenue = await Promise.all(
        (orgsData || []).map(async (org) => {
          const { data: revenueData } = await supabase
            .from('revenue_shares')
            .select('organization_amount')
            .eq('organization_id', org.id)
            .gte('created_at', firstDayOfMonth)
            .lte('created_at', lastDayOfMonth);

          const monthlyRevenue = (revenueData || []).reduce(
            (sum, rev) => sum + Number(rev.organization_amount), 
            0
          );

          return { ...org, monthly_revenue: monthlyRevenue };
        })
      );

      setOrganizations(orgsWithRevenue);
    } catch (error) {
      console.error('Error fetching organizations:', error);
      toast({
        title: "Erro ao carregar organizações",
        description: "Não foi possível carregar a lista de organizações.",
        variant: "destructive",
      });
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
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organizações</h1>
          <p className="text-muted-foreground">Gerencie organizações e suas configurações</p>
        </div>

        {/* Receita Mensal das Organizações */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {organizations.map((org) => (
            <Card key={org.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {org.name}
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  R$ {(org.monthly_revenue || 0).toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Receita do mês atual
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <OrganizationManager organizations={organizations} onRefresh={fetchOrganizations} />
      </div>
    </AdminLayout>
  );
};

export default AdminOrganizations;
