import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  Calendar, 
  ShoppingCart, 
  Heart,
  Camera
} from 'lucide-react';

const ClientNavLinks = () => {
  const navItems = [
    { title: 'Eventos', url: '/dashboard', icon: Calendar },
    { title: 'Minhas Compras', url: '/dashboard/purchases', icon: ShoppingCart },
    { title: 'Favoritos', url: '/dashboard/favorites', icon: Heart },
    { title: 'Seja Fotógrafo', url: '/dashboard/photographer-application', icon: Camera },
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

export default ClientNavLinks;
