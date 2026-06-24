import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  User, 
  LogIn, 
  Menu, 
  Calendar,
  ShoppingCart,
  Briefcase,
  Download,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useCart } from '@/contexts/CartContext';

const Header = () => {
  const { user, profile } = useAuth();
  const { items } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const displayName = profile?.full_name?.trim() || user?.email?.split('@')[0] || 'Minha conta';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'U';

  // Navegação simplificada: apenas Eventos e Serviços
  const navItems = [
    { to: '/events', label: 'EVENTOS', icon: Calendar },
    { to: '/servicos', label: 'SERVIÇOS', icon: Briefcase },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 border-b border-amber-200/70 bg-white/95 text-slate-900 shadow-[0_1px_0_rgba(0,0,0,0.03)] backdrop-blur supports-[backdrop-filter]:bg-white/90">
      <div className="flex h-20 w-full items-center gap-3 pl-0 pr-3 sm:container sm:mx-auto sm:gap-4 sm:px-4">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetContent side="right" className="bg-slate-50 text-slate-900 border-l border-slate-200/80 w-[85vw] max-w-80">
              <SheetHeader>
                <SheetTitle className="text-primary">Menu</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-4 mt-6">
                {/* Cart Button Mobile */}
                <Link to="/cart" onClick={() => setMobileMenuOpen(false)}>
                  <Button 
                    variant="outline" 
                    className="w-full gap-2 border-primary text-primary relative"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    Carrinho
                    {items.length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                        {items.length}
                      </span>
                    )}
                  </Button>
                </Link>

                {/* Download Button Mobile */}
                <Link to={user ? '/dashboard/purchases' : '/auth'} onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full gap-2 border-primary text-primary">
                    <Download className="h-4 w-4" />
                    Minhas fotos
                  </Button>
                </Link>

                {/* Auth Buttons Mobile */}
                {user ? (
                  <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full gap-2 bg-primary hover:bg-primary/90">
                      <User className="h-4 w-4" />
                      Dashboard
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="outline" className="w-full gap-2 border-primary text-primary">
                        <User className="h-4 w-4" />
                        Cadastrar
                      </Button>
                    </Link>
                    <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                      <Button className="w-full gap-2 bg-primary hover:bg-primary/90">
                        <LogIn className="h-4 w-4" />
                        Entrar
                      </Button>
                    </Link>
                  </>
                )}

                {/* Navigation Mobile */}
                <div className="border-t border-slate-200/80 pt-4 mt-2">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 py-3 px-4 rounded-lg mb-1 transition-colors ${
                          isActive(item.to)
                            ? 'bg-primary text-primary-foreground font-medium'
                            : 'hover:bg-slate-100'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </SheetContent>

          {/* Logo */}
      <Link to="/" className="-ml-0.4 flex items-center transition-opacity hover:opacity-80 sm:ml-0">
            <img 
              src="/sta-new-logo.png?v=20260623" 
              alt="STA Fotos - Página Inicial" 
              className="h-[100px] w-auto max-w-[220px] object-contain cursor-pointer"
              title="Voltar para página inicial"
            />
          </Link>

          <div className="ml-auto flex items-center gap-1 md:hidden">
            <Link to={user ? '/dashboard/purchases' : '/auth'}>
              <Button variant="ghost" size="icon" className="text-slate-700 hover:text-amber-700 hover:bg-amber-50" title="Minhas fotos">
                <Download className="h-5 w-5" />
              </Button>
            </Link>
            <Link to="/cart">
              <Button variant="ghost" size="icon" className="relative text-slate-700 hover:text-amber-700 hover:bg-amber-50" title="Carrinho">
                <ShoppingCart className="h-5 w-5" />
                {items.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                    {items.length > 9 ? '9+' : items.length}
                  </span>
                )}
              </Button>
            </Link>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-slate-700 hover:text-primary hover:bg-primary/10" aria-label="Abrir menu">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
          </div>
          </Sheet>

          <nav className="hidden md:flex items-center gap-1 lg:gap-2 text-[13px] font-medium text-slate-700">
            {navItems.map((item) => {
              const active = isActive(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`rounded-full px-3 py-2 transition-colors whitespace-nowrap ${
                    active
                      ? 'text-amber-700 bg-amber-100/70'
                      : 'hover:text-amber-700 hover:bg-amber-50'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto hidden md:flex items-center gap-2 lg:gap-3">
            <Link to={user ? '/dashboard/purchases' : '/auth'}>
              <Button variant="ghost" size="sm" className="gap-2 text-slate-700 hover:text-amber-700 hover:bg-amber-50">
                <Download className="h-4 w-4" />
                <span className="hidden lg:inline">Minhas fotos</span>
              </Button>
            </Link>

            <Link to="/cart">
              <Button 
                variant="ghost" 
                size="sm" 
                className="relative gap-2 text-slate-700 hover:text-amber-700 hover:bg-amber-50"
              >
                <ShoppingCart className="h-5 w-5" />
                {items.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {items.length}
                  </span>
                )}
              </Button>
            </Link>

            <div className="h-8 w-px bg-amber-200/80" />

            {user ? (
              <Link to="/dashboard">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 gap-2 rounded-full border-amber-300 bg-white px-2 pr-3 text-amber-700 shadow-sm hover:bg-amber-50 hover:text-amber-800"
                >
                  <Avatar className="h-7 w-7 border border-amber-200">
                    <AvatarImage src={profile?.avatar_url || undefined} alt={displayName} />
                    <AvatarFallback className="bg-amber-100 text-[11px] font-semibold text-amber-700">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="max-w-[140px] truncate text-sm font-medium">{displayName}</span>
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="outline" size="sm" className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-800">
                    <User className="h-4 w-4" />
                    <span>Cadastrar</span>
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button size="sm" className="gap-2 bg-amber-500 text-white hover:bg-amber-600">
                    <LogIn className="h-4 w-4" />
                    <span>Entrar</span>
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
    </header>
  );
};

export default Header;
