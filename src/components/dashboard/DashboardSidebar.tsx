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
  Gift,
  Star,
  KeyRound,
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
    { title: 'Chave PIX', url: '/dashboard/photographer/pix', icon: KeyRound },
    { title: 'Meus Eventos', url: '/dashboard/events', icon: Calendar },
    { title: 'Eventos Próximos', url: '/eventos-proximos', icon: Calendar },
    { title: 'Minhas Fotos', url: '/dashboard/photos', icon: Image },
    { title: 'Fotos em Destaque', url: '/dashboard/photographer/featured', icon: Star },
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
    { title: 'Saldos Fotógrafos', url: '/dashboard/admin/photographer-balances', icon: DollarSign },
    { title: 'Usuários', url: '/dashboard/admin/users', icon: Users },
    { title: 'Eventos', url: '/dashboard/admin/events', icon: Calendar },
    { title: 'Eventos em Destaque', url: '/dashboard/admin/featured-events', icon: Star },
    { title: 'Descontos Progressivos', url: '/dashboard/admin/progressive-discounts', icon: Gift },
    { title: 'Organizações', url: '/dashboard/admin/organizations', icon: Building2 },
    { title: 'Financeiro', url: '/dashboard/admin/financial', icon: DollarSign },
    { title: 'Relatórios', url: '/dashboard/admin/reports', icon: FileText },
    { title: 'Cache', url: '/dashboard/admin/cache-management', icon: Database },
  ];

  // Menu items para organizações - APENAS relatório de vendas
  const organizationItems = [
    { title: 'Início', url: '/', icon: Home },
    { title: 'Relatório de Vendas', url: '/dashboard/organization/revenue', icon: FileText },
    { title: 'Perfil', url: '/dashboard/profile', icon: UserCircle },
  ];

  const getMenuItems = () => {
    const role = profile?.role;
    if (role === 'admin') {
      return adminItems;
    }
    if (role === 'photographer') {
      return photographerItems;
    }
    if (role === 'organization') {
      return organizationItems;
    }
    return userItems;
  };

  const items = getMenuItems();

  return (
    <>
      {/* Overlay para mobile - tap to close */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        {...swipeHandlers}
        className={cn(
          'fixed md:sticky top-0 left-0 h-screen bg-card border-r z-50 transition-transform duration-300 ease-out flex flex-col',
          // Mobile: slide in/out, Desktop: sempre visível mas colapsado
          isOpen 
            ? 'translate-x-0 w-64 shadow-2xl' 
            : '-translate-x-full md:translate-x-0 md:w-14'
        )}
      >
        {/* Header da Sidebar - mais compacto */}
        <div className="flex items-center justify-between p-3 border-b min-h-[52px]">
          {isOpen && (
            <span className="font-semibold text-sm truncate">
              {profile?.role === 'admin' ? 'Admin' :
               profile?.role === 'photographer' ? 'Fotógrafo' : 
               profile?.role === 'organization' ? 'Organização' : 'Menu'}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className={cn("h-8 w-8", isOpen ? "ml-auto" : "mx-auto")}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Menu Items - scroll suave */}
        <nav className="flex-1 overflow-y-auto overscroll-contain p-2 space-y-1">
          {/* Link para voltar ao site */}
          <NavLink
            to="/"
            onClick={onToggle}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted active:bg-muted/80'
              )
            }
          >
            <Home className="h-5 w-5 shrink-0" />
            {isOpen && <span>Voltar ao Site</span>}
          </NavLink>

          <div className="border-t my-2" />

          {/* Menu principal - itens maiores para touch */}
          {items.map((item) => (
            <NavLink
              key={item.title}
              to={item.url}
              end
              onClick={onToggle}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                  isActive
                    ? profile?.role === 'admin'
                      ? 'bg-amber-500 text-white font-medium shadow-md'
                      : 'bg-primary text-primary-foreground font-medium'
                    : profile?.role === 'admin'
                    ? 'bg-amber-400/20 text-amber-700 dark:text-amber-300 hover:bg-amber-500 hover:text-white'
                    : 'hover:bg-muted active:bg-muted/80'
                )
              }
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {isOpen && <span className="truncate">{item.title}</span>}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
};

export default DashboardSidebar;
