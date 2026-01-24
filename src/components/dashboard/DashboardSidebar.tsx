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
  ChevronLeft,
  ChevronRight,
  Menu,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

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
    <TooltipProvider delayDuration={0}>
      {/* Overlay para mobile - tap to close */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm transition-opacity duration-300"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        {...swipeHandlers}
        className={cn(
          'fixed md:sticky top-0 left-0 h-screen bg-card border-r z-50 flex flex-col',
          'transition-all duration-300 ease-in-out',
          // Mobile: slide in/out
          isOpen 
            ? 'translate-x-0 w-64 shadow-2xl' 
            : '-translate-x-full md:translate-x-0 md:w-16'
        )}
      >
        {/* Header da Sidebar */}
        <div className="flex items-center justify-between p-3 border-b min-h-[56px]">
          {isOpen ? (
            <>
              <span className="font-semibold text-sm truncate">
                {profile?.role === 'admin' ? 'Admin' :
                 profile?.role === 'photographer' ? 'Fotógrafo' : 
                 profile?.role === 'organization' ? 'Organização' : 'Menu'}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggle}
                className="h-8 w-8 ml-auto hover:bg-muted"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className="h-8 w-8 mx-auto hover:bg-muted hidden md:flex"
            >
              <Menu className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Menu Items - scroll suave */}
        <nav className="flex-1 overflow-y-auto overscroll-contain p-2 space-y-1">
          {/* Link para voltar ao site */}
          {isOpen ? (
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
              <span>Voltar ao Site</span>
            </NavLink>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <NavLink
                  to="/"
                  className={({ isActive }) =>
                    cn(
                      'flex items-center justify-center p-2.5 rounded-lg text-sm transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted active:bg-muted/80'
                    )
                  }
                >
                  <Home className="h-5 w-5" />
                </NavLink>
              </TooltipTrigger>
              <TooltipContent side="right">Voltar ao Site</TooltipContent>
            </Tooltip>
          )}

          <div className="border-t my-2" />

          {/* Menu principal - itens maiores para touch */}
          {items.map((item) => (
            isOpen ? (
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
                <span className="truncate">{item.title}</span>
              </NavLink>
            ) : (
              <Tooltip key={item.title}>
                <TooltipTrigger asChild>
                  <NavLink
                    to={item.url}
                    end
                    className={({ isActive }) =>
                      cn(
                        'flex items-center justify-center p-2.5 rounded-lg text-sm transition-colors',
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
                    <item.icon className="h-5 w-5" />
                  </NavLink>
                </TooltipTrigger>
                <TooltipContent side="right">{item.title}</TooltipContent>
              </Tooltip>
            )
          ))}
        </nav>
        
        {/* Footer com botão de expandir/colapsar no desktop */}
        <div className="hidden md:flex border-t p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className={cn(
              "w-full justify-center gap-2 text-xs text-muted-foreground hover:text-foreground",
              isOpen && "justify-start px-3"
            )}
          >
            {isOpen ? (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span>Recolher</span>
              </>
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  );
};

export default DashboardSidebar;
