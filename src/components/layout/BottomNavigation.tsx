import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { Home, Calendar, ShoppingCart, Heart, User, LogIn, ScanFace } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

const BottomNavigation = () => {
  const { user } = useAuth();
  const { items } = useCart();
  const location = useLocation();
  const haptic = useHapticFeedback();

  // Itens para usuários logados - mais intuitivo com ícone de busca facial
  const loggedInItems = [
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
      icon: ScanFace, 
      label: 'Buscar', 
      path: '/events',
      showBadge: false,
      highlight: true // Destaque para o botão principal
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
  const loggedOutItems = [
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
      icon: ScanFace, 
      label: 'Buscar Fotos', 
      path: '/events',
      showBadge: false,
      badgeCount: 0,
      highlight: true
    },
    { 
      icon: LogIn, 
      label: 'Entrar', 
      path: '/auth',
      showBadge: false,
      badgeCount: 0
    },
  ];

  const navItems = user ? loggedInItems : loggedOutItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t shadow-lg md:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-1">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || 
            (item.path === '/dashboard' && location.pathname.startsWith('/dashboard') && item.path === '/dashboard');
          const isHighlight = 'highlight' in item && item.highlight;
          
          // Botão central destacado (busca facial)
          if (isHighlight) {
            return (
              <NavLink
                key={`${item.path}-${index}`}
                to={item.path}
                onClick={() => haptic.medium()}
                className="flex flex-col items-center justify-center -mt-4 touch-manipulation"
              >
                <div className="bg-gradient-to-r from-yellow-500 to-amber-600 rounded-full p-3 shadow-lg shadow-yellow-500/40 hover:shadow-xl hover:shadow-yellow-500/50 transition-all active:scale-90">
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <span className="text-[10px] font-semibold mt-1 text-yellow-600 dark:text-yellow-400">
                  {item.label}
                </span>
              </NavLink>
            );
          }
          
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
