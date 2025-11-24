import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { Home, Calendar, ShoppingCart, Heart, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const BottomNavigation = () => {
  const { user, profile } = useAuth();
  const { items } = useCart();
  const location = useLocation();

  // Não mostrar em desktop ou se não estiver logado
  if (!user) return null;

  const navItems = [
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
      icon: ShoppingCart, 
      label: 'Carrinho', 
      path: '/cart',
      showBadge: items.length > 0,
      badgeCount: items.length
    },
    { 
      icon: Heart, 
      label: 'Favoritos', 
      path: '/dashboard/favorites',
      showBadge: false
    },
    { 
      icon: User, 
      label: 'Perfil', 
      path: '/dashboard',
      showBadge: false
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t shadow-lg md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all active:scale-95 min-w-[64px] relative',
                isActive 
                  ? 'text-primary' 
                  : 'text-muted-foreground hover:text-foreground'
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
                    className="absolute -top-2 -right-2 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
                  >
                    {item.badgeCount > 9 ? '9+' : item.badgeCount}
                  </Badge>
                )}
              </div>
              <span className={cn(
                'text-[10px] font-medium transition-all',
                isActive && 'font-semibold'
              )}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-full" />
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavigation;
