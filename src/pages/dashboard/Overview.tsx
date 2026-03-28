import { useAuth } from '@/contexts/AuthContext';
import UserDashboard from '@/components/dashboard/UserDashboard';
import PhotographerDashboard from '@/components/dashboard/PhotographerDashboard';
import AdminDashboard from '@/components/dashboard/AdminDashboard';
import OrganizerDashboard from '@/components/dashboard/OrganizerDashboard';
import OrganizationRevenue from '@/pages/dashboard/OrganizationRevenue';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

const Overview = () => {
  const { profile } = useAuth();

  switch (profile?.role) {
    case 'admin':
      return <AdminDashboard />;
    case 'photographer':
      return <PhotographerDashboard />;
    case 'organizer':
      return <OrganizerDashboard />;
    case 'organization':
      return (
        <DashboardLayout>
          <OrganizationRevenue />
        </DashboardLayout>
      );
    case 'user':
    default:
      return <UserDashboard />;
  }
};

export default Overview;
