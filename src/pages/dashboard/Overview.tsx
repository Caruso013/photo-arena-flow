import { useAuth } from '@/contexts/AuthContext';
import UserDashboard from '@/components/dashboard/UserDashboard';
import PhotographerDashboard from '@/components/dashboard/PhotographerDashboard';
import AdminDashboard from '@/components/dashboard/AdminDashboard';

import OrganizerDashboard from '@/components/dashboard/OrganizerDashboard';

const Overview = () => {
  const { profile } = useAuth();

  switch (profile?.role) {
    case 'admin':
      return <AdminDashboard />;
    case 'photographer':
      return <PhotographerDashboard />;
    case 'organizer':
      return <OrganizerDashboard />;
    case 'user':
    default:
      return <UserDashboard />;
  }
};

export default Overview;
