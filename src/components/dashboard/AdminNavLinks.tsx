import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  Camera, 
  Calendar, 
  TrendingUp, 
  Building2, 
  Activity, 
  Users, 
  Settings,
  FileText
} from 'lucide-react';

const AdminNavLinks = () => {
  const navItems = [
    { title: 'Fotógrafos', url: '/dashboard/admin/photographers', icon: Camera },
    { title: 'Eventos', url: '/dashboard/admin/events', icon: Calendar },
    { title: 'Financeiro', url: '/dashboard/admin/financial', icon: TrendingUp },
    { title: 'Orgs', url: '/dashboard/admin/organizations', icon: Building2 },
    { title: 'Campanhas', url: '/dashboard/admin/events', icon: Activity },
    { title: 'Usuários', url: '/dashboard/admin/users', icon: Users },
    { title: 'Perfil', url: '/dashboard/profile', icon: Settings }
  ];

  return (
    <nav className="border-b bg-card">
      <div className="container px-4">
        <div className="flex items-center gap-1 overflow-x-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.title}
              to={item.url}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap border-b-2',
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
                )
              }
            >
              <item.icon className="h-4 w-4" />
              <span>{item.title}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default AdminNavLinks;
