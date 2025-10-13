import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSearch } from '@/contexts/SearchContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { Search, User, LogIn, Menu } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

const Header = () => {
  const { user } = useAuth();
  const { searchTerm, setSearchTerm } = useSearch();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    if (location.pathname !== '/events') {
      navigate('/events');
    }
  };

  const navItems = [
    { to: '/', label: 'HOME' },
    { to: '/events', label: 'EVENTOS' },
    { to: '/fotografos', label: 'FOTÓGRAFOS' },
    { to: '/sobre', label: 'SOBRE' },
    { to: '/faq', label: 'AJUDA' },
    { to: '/contato', label: 'CONTATO' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="bg-header text-header-foreground">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img 
              src="/lovable-uploads/6fdfc5d2-230c-4142-bf7c-3a326e5e45a8.png" 
              alt="STA Fotos - Página Inicial" 
              className="h-8 md:h-10 w-auto cursor-pointer"
              title="Voltar para página inicial"
            />
          </Link>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            
            {/* Search - Desktop */}
            <div className="relative hidden lg:block">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Pesquisar evento..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 bg-background/10 border-gray-600 text-white placeholder:text-gray-400 w-64"
              />
            </div>

            {/* Auth Buttons - Desktop */}
            {user ? (
              <Link to="/dashboard">
                <Button variant="outline" size="sm" className="gap-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                  <User className="h-4 w-4" />
                  <span>Dashboard</span>
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="outline" size="sm" className="gap-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                    <User className="h-4 w-4" />
                    <span>Cadastrar</span>
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button size="sm" className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                    <LogIn className="h-4 w-4" />
                    <span>Entrar</span>
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" className="text-white">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-header text-header-foreground w-80">
              <SheetHeader>
                <SheetTitle className="text-primary">Menu</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-4 mt-6">
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
                <div className="border-t border-white/10 pt-4 mt-2">
                  {navItems.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`block py-3 px-4 rounded-lg mb-1 transition-colors ${
                        isActive(item.to)
                          ? 'bg-primary text-primary-foreground font-medium'
                          : 'hover:bg-white/10'
                      }`}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>

                {/* Search Mobile */}
                <div className="border-t border-white/10 pt-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Pesquisar evento..."
                      value={searchTerm}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="pl-10 bg-background/10 border-gray-600 text-white placeholder:text-gray-400"
                    />
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Navigation - Desktop */}
      <nav className="border-t border-white/10 hidden md:block">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-start space-x-8 py-3 text-sm">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`transition-colors whitespace-nowrap ${
                  isActive(item.to)
                    ? 'text-primary font-medium'
                    : 'hover:text-primary'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;
