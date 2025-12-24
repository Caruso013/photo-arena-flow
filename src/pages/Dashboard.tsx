import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

const Dashboard = () => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  // Se não houver sessão, volta para login
  if (!user) {
    return <Navigate to="/auth" />;
  }

  // Evitar loop de redirecionamento: usuário logado mas perfil ainda não carregou/criou
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Preparando sua conta…</p>
          <p className="text-sm text-muted-foreground mt-2">
            Se isso demorar mais de alguns segundos, faça logout e entre novamente.
          </p>
        </div>
      </div>
    );
  }

  // Redirecionar organizações para seu dashboard específico
  if (profile.role === 'organization' && location.pathname === '/dashboard') {
    return <Navigate to="/dashboard/organization/revenue" replace />;
  }

  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  );
};

export default Dashboard;