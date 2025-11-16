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
  FileText,
  Ticket
} from 'lucide-react';

const AdminNavLinks = () => {
  const navItems = [
    { title: 'Eventos', url: '/dashboard/admin/events', icon: Calendar },
    { title: 'Cupons', url: '/dashboard/admin/coupons', icon: Ticket },
    { title: 'Config', url: '/dashboard/admin/config', icon: Settings },
  ];

  return (
    <nav className="border-b bg-background/95 backdrop-blur-sm sticky top-16 z-30 md:static md:z-auto shadow-sm">
      <div className="container px-4">
        <div className="flex items-center gap-1 overflow-x-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.title}
              to={item.url}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all whitespace-nowrap border-b-2',
                  isActive
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-transparent text-foreground/70 hover:text-foreground hover:bg-accent/50 hover:border-border'
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
