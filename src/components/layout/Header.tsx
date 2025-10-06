import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, User, LogIn } from 'lucide-react';

const Header = () => {
  const { user, profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <header className="bg-header text-header-foreground">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <img 
              src="/lovable-uploads/6fdfc5d2-230c-4142-bf7c-3a326e5e45a8.png" 
              alt="STA Fotos Logo" 
              className="h-8 md:h-10 w-auto"
            />
          </Link>

          {/* Search + Auth Buttons */}
          <div className="flex items-center gap-2 md:gap-4">
            {/* Search - Hidden on mobile */}
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Pesquisar evento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-background/10 border-gray-600 text-white placeholder:text-gray-400 w-64"
              />
            </div>

            {/* Auth Buttons */}
            {user ? (
              <Link to="/dashboard">
                <Button variant="outline" size="sm" className="gap-1 md:gap-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground text-xs md:text-sm">
                  <User className="h-3 w-3 md:h-4 md:w-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                  <span className="sm:hidden">Painel</span>
                </Button>
              </Link>
            ) : (
              <div className="flex gap-1 md:gap-2">
                <Link to="/auth">
                  <Button variant="outline" size="sm" className="gap-1 md:gap-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground text-xs md:text-sm px-2 md:px-4">
                    <User className="h-3 w-3 md:h-4 md:w-4" />
                    <span>Cadastrar</span>
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button size="sm" className="gap-1 md:gap-2 bg-primary text-primary-foreground hover:bg-primary/90 text-xs md:text-sm px-2 md:px-4">
                    <LogIn className="h-3 w-3 md:h-4 md:w-4" />
                    <span>Entrar</span>
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="border-t border-white/10">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center md:justify-start space-x-4 md:space-x-8 py-3 text-xs md:text-sm overflow-x-auto">
            <Link to="/" className="text-primary font-medium whitespace-nowrap">HOME</Link>
            <Link to="/events" className="hover:text-primary transition-colors whitespace-nowrap">EVENTOS</Link>
            <Link to="/fotografos" className="hover:text-primary transition-colors whitespace-nowrap">FOTÓGRAFOS</Link>
            <Link to="/faq" className="hover:text-primary transition-colors whitespace-nowrap">AJUDA</Link>
            <Link to="/contato" className="hover:text-primary transition-colors whitespace-nowrap">CONTATO</Link>
          </div>
        </div>
      </nav>

      {/* Mobile Search */}
      <div className="md:hidden bg-header border-t border-white/10 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Pesquisar evento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-background/10 border-gray-600 text-white placeholder:text-gray-400 text-base"
          />
        </div>
      </div>
    </header>
  );
};

export default Header;
