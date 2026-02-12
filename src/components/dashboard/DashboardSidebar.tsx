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
  Heart,
  Database,
  Gift,
  Star,
  KeyRound,
  ChevronLeft,
  Menu,
  Ticket,
  QrCode,
  UserCheck,
  ClipboardList,
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
    { title: 'Meu QR Code', url: '/dashboard/photographer/qrcode', icon: QrCode },
    { title: 'Chave PIX', url: '/dashboard/photographer/pix', icon: KeyRound },
    { title: 'Candidaturas', url: '/dashboard/photographer/applications', icon: ClipboardList },
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
    { title: 'Cupons', url: '/dashboard/admin/coupons', icon: Ticket },
    { title: 'Descontos Progressivos', url: '/dashboard/admin/progressive-discounts', icon: Gift },
    { title: 'Organizações', url: '/dashboard/admin/organizations', icon: Building2 },
    { title: 'Financeiro', url: '/dashboard/admin/financial', icon: DollarSign },
    { title: 'Relatórios', url: '/dashboard/admin/reports', icon: FileText },
    { title: 'Mesários', url: '/dashboard/admin/mesarios', icon: UserCheck },
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

      {/* Sidebar - No mobile: escondido quando fechado. No desktop: sempre visível */}
      <aside
        {...swipeHandlers}
        className={cn(
          'fixed top-0 left-0 h-screen bg-card border-r z-50 flex flex-col',
          'transition-all duration-300 ease-in-out',
          isOpen 
            ? 'translate-x-0 w-60 shadow-2xl' 
            : '-translate-x-full w-0',
          // Desktop: sticky e sempre visível (colapsado ou expandido)
          'md:sticky md:translate-x-0',
          !isOpen && 'md:w-14'
        )}
      >
        {/* Header da Sidebar */}
        <div className={cn(
          "flex items-center border-b",
          isOpen ? "justify-between p-3 min-h-[52px]" : "justify-center p-2 min-h-[48px]"
        )}>
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
                className="h-7 w-7 ml-auto hover:bg-muted"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onToggle}
                  className="h-8 w-8 hover:bg-muted hidden md:flex"
                >
                  <Menu className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>Expandir menu</TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Menu Items - scroll suave */}
        <nav className={cn(
          "flex-1 overflow-y-auto overscroll-contain space-y-0.5",
          isOpen ? "p-2" : "p-1"
        )}>
          {/* Menu principal */}
          {items.map((item) => (
            isOpen ? (
              <NavLink
                key={item.title}
                to={item.url}
                end
                onClick={onToggle}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'hover:bg-muted active:bg-muted/80 text-muted-foreground hover:text-foreground'
                  )
                }
              >
                <item.icon className="h-4 w-4 shrink-0" />
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
                        'flex items-center justify-center p-2 rounded-md transition-colors mx-auto w-10 h-10',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                      )
                    }
                  >
                    <item.icon className="h-4 w-4" />
                  </NavLink>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>{item.title}</TooltipContent>
              </Tooltip>
            )
          ))}
        </nav>
        
        {/* Footer com botão de expandir apenas quando aberto */}
        {isOpen && (
          <div className="hidden md:flex border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className="w-full justify-start gap-2 text-xs text-muted-foreground hover:text-foreground px-3"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Recolher menu</span>
            </Button>
          </div>
        )}
      </aside>
    </TooltipProvider>
  );
};

export default DashboardSidebar;
