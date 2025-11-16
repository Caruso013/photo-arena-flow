import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  Calendar, 
  Camera, 
  DollarSign,
  Settings,
  TrendingUp
} from 'lucide-react';

const PhotographerNavLinks = () => {
  const navItems = [
    { title: 'Eventos', url: '/dashboard/photographer/events', icon: Calendar },
    { title: 'Fotos', url: '/dashboard/photographer/photos', icon: Camera },
    { title: 'Financeiro', url: '/dashboard/photographer/earnings', icon: DollarSign },
    { title: 'Relatórios', url: '/dashboard/photographer/reports', icon: TrendingUp },
    { title: 'Config', url: '/dashboard/photographer/settings', icon: Settings },
  ];

  return (
    <nav className="border-b bg-card sticky top-16 z-30 md:static md:z-auto">
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

export default PhotographerNavLinks;
