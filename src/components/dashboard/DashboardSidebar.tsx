import { NavLink } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Camera,
  Calendar,
  Users,
  Image,
  Building2,
  DollarSign,
  FileText,
  Home,
  ShoppingCart,
  UserCircle,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DashboardSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const DashboardSidebar = ({ isOpen, onToggle }: DashboardSidebarProps) => {
  const { profile } = useAuth();

  // Menu items por role
  const userItems = [
    { title: 'Visão Geral', url: '/dashboard', icon: LayoutDashboard },
    { title: 'Minhas Compras', url: '/dashboard', icon: ShoppingCart },
    { title: 'Perfil', url: '/dashboard', icon: UserCircle },
  ];

  const photographerItems = [
    { title: 'Visão Geral', url: '/dashboard', icon: LayoutDashboard },
    { title: 'Meus Eventos', url: '/dashboard', icon: Calendar },
    { title: 'Eventos Próximos', url: '/eventos-proximos', icon: Calendar },
    { title: 'Minhas Fotos', url: '/dashboard', icon: Image },
    { title: 'Financeiro', url: '/dashboard', icon: DollarSign },
    { title: 'Perfil', url: '/dashboard', icon: UserCircle },
  ];

  const adminItems = [
    { title: 'Visão Geral', url: '/dashboard', icon: LayoutDashboard },
    { title: 'Eventos', url: '/dashboard', icon: Calendar },
    { title: 'Fotógrafos', url: '/dashboard', icon: Camera },
    { title: 'Usuários', url: '/dashboard', icon: Users },
    { title: 'Organizações', url: '/dashboard', icon: Building2 },
    { title: 'Financeiro', url: '/dashboard', icon: DollarSign },
    { title: 'Relatórios', url: '/dashboard', icon: FileText },
  ];

  const getMenuItems = () => {
    switch (profile?.role) {
      case 'admin':
        return adminItems;
      case 'photographer':
        return photographerItems;
      default:
        return userItems;
    }
  };

  const items = getMenuItems();

  return (
    <>
      {/* Overlay para mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed md:sticky top-0 left-0 h-screen bg-card border-r z-50 transition-transform duration-300 flex flex-col',
          isOpen ? 'translate-x-0 w-60' : '-translate-x-full md:translate-x-0 md:w-16'
        )}
      >
        {/* Header da Sidebar */}
        <div className="flex items-center justify-between p-4 border-b">
          {isOpen && (
            <span className="font-semibold text-sm">
              {profile?.role === 'admin' ? 'Administração' :
               profile?.role === 'photographer' ? 'Fotógrafo' : 'Menu'}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="ml-auto"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 overflow-y-auto p-2">
          {/* Link para voltar ao site */}
          <NavLink
            to="/"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors mb-2',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              )
            }
          >
            <Home className="h-5 w-5 shrink-0" />
            {isOpen && <span>Voltar ao Site</span>}
          </NavLink>

          <div className="border-t my-2" />

          {/* Menu principal */}
          {items.map((item) => (
            <NavLink
              key={item.title}
              to={item.url}
              end
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors mb-1',
                  isActive
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'hover:bg-muted'
                )
              }
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {isOpen && <span>{item.title}</span>}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
};

export default DashboardSidebar;
