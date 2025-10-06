import { useAuth } from '@/contexts/AuthContext';
import { PhotographerApplicationsManager } from '@/components/dashboard/PhotographerApplicationsManager';

const AdminPhotographers = () => {
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
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Fotógrafos</h1>
        <p className="text-muted-foreground">Gerencie candidaturas de fotógrafos</p>
      </div>

      <PhotographerApplicationsManager />
    </div>
  );
};

export default AdminPhotographers;
