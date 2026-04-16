import type { ComponentType } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import {
  Home,
  Calendar,
  ShoppingCart,
  Heart,
  User,
  LogIn,
  LayoutDashboard,
  Image,
  Wallet,
  UserCheck,
  DollarSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

interface NavItem {
  icon: ComponentType<{ className?: string }>;
  label: string;
  path: string;
  showBadge: boolean;
  badgeCount?: number;
  matchPrefixes?: string[];
}

const BottomNavigation = () => {
  const { user, profile } = useAuth();
  const { items } = useCart();
  const location = useLocation();
  const haptic = useHapticFeedback();

  // Itens para usuários logados - mais intuitivo com ícone de busca facial
  const loggedInUserItems: NavItem[] = [
    { 
      icon: Home, 
      label: 'Início', 
      path: '/',
      showBadge: false
    },
    { 
      icon: Calendar, 
      label: 'Eventos', 
      path: '/events',
      showBadge: false
    },
    { 
      icon: Heart, 
      label: 'Favoritos', 
      path: '/dashboard/favorites',
      showBadge: false
    },
    { 
      icon: ShoppingCart, 
      label: 'Carrinho', 
      path: '/cart',
      showBadge: items.length > 0,
      badgeCount: items.length
    },
    { 
      icon: User, 
      label: 'Perfil', 
      path: '/dashboard',
      showBadge: false
    },
  ];

  // Itens para usuários não logados - incentiva a buscar fotos
  const loggedOutItems: NavItem[] = [
    { 
      icon: Home, 
      label: 'Início', 
      path: '/',
      showBadge: false,
      badgeCount: 0
    },
    { 
      icon: Calendar, 
      label: 'Eventos', 
      path: '/events',
      showBadge: false,
      badgeCount: 0
    },
    { 
      icon: ShoppingCart, 
      label: 'Carrinho', 
      path: '/cart',
      showBadge: items.length > 0,
      badgeCount: items.length
    },
    { 
      icon: LogIn, 
      label: 'Entrar', 
      path: '/auth',
      showBadge: false,
      badgeCount: 0
    },
  ];

  const photographerItems: NavItem[] = [
    {
      icon: Home,
      label: 'Início',
      path: '/',
      showBadge: false,
    },
    {
      icon: LayoutDashboard,
      label: 'Painel',
      path: '/dashboard',
      showBadge: false,
      matchPrefixes: ['/dashboard'],
    },
    {
      icon: Calendar,
      label: 'Eventos',
      path: '/dashboard/events',
      showBadge: false,
      matchPrefixes: ['/dashboard/events', '/dashboard/photographer/manage-event'],
    },
    {
      icon: Image,
      label: 'Fotos',
      path: '/dashboard/photographer/manage-photos',
      showBadge: false,
      matchPrefixes: ['/dashboard/photos', '/dashboard/photographer/manage-photos', '/dashboard/photographer/featured'],
    },
    {
      icon: Wallet,
      label: 'Saques',
      path: '/dashboard/photographer/payout',
      showBadge: false,
      matchPrefixes: ['/dashboard/photographer/payout', '/dashboard/financial'],
    },
  ];

  const adminItems: NavItem[] = [
    {
      icon: Home,
      label: 'Início',
      path: '/',
      showBadge: false,
    },
    {
      icon: LayoutDashboard,
      label: 'Painel',
      path: '/dashboard/admin',
      showBadge: false,
      matchPrefixes: ['/dashboard/admin'],
    },
    {
      icon: Calendar,
      label: 'Eventos',
      path: '/dashboard/admin/events',
      showBadge: false,
      matchPrefixes: ['/dashboard/admin/events', '/dashboard/admin/featured-events'],
    },
    {
      icon: UserCheck,
      label: 'Mesários',
      path: '/dashboard/admin/mesarios',
      showBadge: false,
      matchPrefixes: ['/dashboard/admin/mesarios'],
    },
    {
      icon: DollarSign,
      label: 'Financeiro',
      path: '/dashboard/admin/financial',
      showBadge: false,
      matchPrefixes: ['/dashboard/admin/financial', '/dashboard/admin/reports'],
    },
  ];

  const navItems: NavItem[] = !user
    ? loggedOutItems
    : profile?.role === 'admin'
      ? adminItems
      : profile?.role === 'photographer'
        ? photographerItems
        : loggedInUserItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t shadow-lg md:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-1 pb-[env(safe-area-inset-bottom,0px)]">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path ||
            (item.matchPrefixes?.some(prefix => location.pathname.startsWith(prefix)) ?? false);
          
          return (
            <NavLink
              key={`${item.path}-${index}`}
              to={item.path}
              onClick={() => haptic.light()}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 py-2 px-3 rounded-xl transition-all active:scale-90 min-w-[56px] min-h-[56px] relative touch-manipulation',
                isActive 
                  ? 'text-primary bg-primary/10' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <div className="relative">
                <Icon className={cn(
                  'h-5 w-5 transition-transform',
                  isActive && 'scale-110'
                )} />
                {item.showBadge && item.badgeCount && item.badgeCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-3 h-5 w-5 p-0 flex items-center justify-center text-[10px] font-bold animate-in zoom-in-50"
                  >
                    {item.badgeCount > 9 ? '9+' : item.badgeCount}
                  </Badge>
                )}
              </div>
              <span className={cn(
                'text-[10px] font-medium transition-all mt-0.5',
                isActive && 'font-semibold'
              )}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-6 h-1 bg-primary rounded-full" />
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavigation;
