import { NavLink } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useSwipeable } from 'react-swipeable';
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
  Heart,
  Database,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DashboardSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const DashboardSidebar = ({ isOpen, onToggle }: DashboardSidebarProps) => {
  const { profile } = useAuth();

  // Gesture handlers para fechar sidebar com swipe
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      if (isOpen) onToggle();
    },
    trackMouse: false,
    trackTouch: true,
  });

  // Menu items por role - Principais funções na sidebar
  const userItems = [
    { title: 'Início', url: '/', icon: Home },
    { title: 'Eventos', url: '/events', icon: Calendar },
    { title: 'Minhas Compras', url: '/dashboard/purchases', icon: ShoppingCart },
    { title: 'Favoritos', url: '/dashboard/favorites', icon: Heart },
    { title: 'Backup Facial', url: '/dashboard/face-backup', icon: Database },
    { title: 'Perfil', url: '/dashboard/profile', icon: UserCircle },
    { title: 'Seja Fotógrafo', url: '/dashboard/photographer-application', icon: Camera },
  ];

  const photographerItems = [
    { title: 'Início', url: '/', icon: Home },
    { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
    { title: 'Meus Eventos', url: '/dashboard/events', icon: Calendar },
    { title: 'Eventos Próximos', url: '/eventos-proximos', icon: Calendar },
    { title: 'Minhas Fotos', url: '/dashboard/photos', icon: Image },
    { title: 'Solicitar Saque', url: '/dashboard/photographer/payout', icon: DollarSign },
    { title: 'Financeiro', url: '/dashboard/financial', icon: DollarSign },
    { title: 'Relatórios por Álbum', url: '/dashboard/photographer/album-reports', icon: FileText },
    { title: 'Metas e Objetivos', url: '/dashboard/photographer/goals', icon: FileText },
    { title: 'Perfil', url: '/dashboard/profile', icon: UserCircle },
  ];

  const adminItems = [
    { title: 'Início', url: '/', icon: Home },
    { title: 'Dashboard Admin', url: '/dashboard/admin', icon: LayoutDashboard },
    { title: 'Fotógrafos', url: '/dashboard/admin/photographers', icon: Camera },
    { title: 'Usuários', url: '/dashboard/admin/users', icon: Users },
    { title: 'Eventos', url: '/dashboard/admin/events', icon: Calendar },
    { title: 'Organizações', url: '/dashboard/admin/organizations', icon: Building2 },
    { title: 'Financeiro', url: '/dashboard/admin/financial', icon: DollarSign },
    { title: 'Relatórios', url: '/dashboard/admin/reports', icon: FileText },
    { title: 'Cache', url: '/dashboard/admin/cache-management', icon: Database },
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
        {...swipeHandlers}
        className={cn(
          'fixed md:sticky top-0 left-0 h-screen bg-card border-r z-50 transition-all duration-300 ease-in-out flex flex-col',
          isOpen ? 'translate-x-0 w-60 shadow-2xl md:shadow-none' : '-translate-x-full md:translate-x-0 md:w-16'
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
                    ? profile?.role === 'admin'
                      ? 'bg-amber-500 text-white font-medium shadow-md'
                      : 'bg-primary text-primary-foreground font-medium'
                    : profile?.role === 'admin'
                    ? 'bg-amber-400/90 text-amber-950 hover:bg-amber-500 hover:text-white font-medium'
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
