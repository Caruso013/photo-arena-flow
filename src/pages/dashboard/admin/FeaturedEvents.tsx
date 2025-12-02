import { useAuth } from '@/contexts/AuthContext';
import AdminLayout from '@/components/dashboard/AdminLayout';
import { FeaturedEventsManager } from '@/components/dashboard/FeaturedEventsManager';

const AdminFeaturedEvents = () => {
  const { profile } = useAuth();

  if (profile?.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-2">Acesso Negado</h2>
        <p className="text-muted-foreground">Apenas administradores podem acessar esta página</p>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Eventos em Destaque</h1>
          <p className="text-muted-foreground">
            Gerencie quais eventos aparecem na página inicial
          </p>
        </div>

        <FeaturedEventsManager />
      </div>
    </AdminLayout>
  );
};

export default AdminFeaturedEvents;
