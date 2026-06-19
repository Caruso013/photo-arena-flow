import { useAuth } from '@/contexts/AuthContext';
import FinancialDashboard from '@/components/dashboard/FinancialDashboard';
import PhotographerFinancialDashboard from '@/components/dashboard/PhotographerFinancialDashboard';

const Financial = () => {
  const { profile } = useAuth();

  if (profile?.role !== 'photographer' && profile?.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-2">Acesso Negado</h2>
        <p className="text-muted-foreground">
          Apenas fotógrafos e administradores podem acessar esta página
        </p>
      </div>
    );
  }

  if (profile.role === 'photographer') {
    return <PhotographerFinancialDashboard />;
  }

  return <FinancialDashboard userRole={profile.role as 'admin' | 'photographer'} />;
};

export default Financial;
