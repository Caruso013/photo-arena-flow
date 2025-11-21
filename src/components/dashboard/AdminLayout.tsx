import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import AdminHeader from './AdminHeader';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (profile?.role !== 'admin') {
    return <Navigate to="/dashboard" />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AdminHeader />
      
      <main className="flex-1 container px-4 py-8">
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;
