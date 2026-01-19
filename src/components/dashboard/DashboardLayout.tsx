import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import DashboardSidebar from './DashboardSidebar';
import BottomNavigation from '@/components/layout/BottomNavigation';
import { DynamicBreadcrumb } from '@/components/layout/DynamicBreadcrumb';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { LogOut, Settings, User, Menu, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Fechar sidebar ao navegar (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex w-full bg-background overflow-x-hidden">
      <DashboardSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      
      <div className="flex-1 flex flex-col min-w-0 w-full">
        {/* Header - Compacto no mobile */}
        <header className="border-b bg-card/95 backdrop-blur-sm sticky top-0 z-40">
          <div className="flex items-center justify-between px-3 py-2 md:px-4 md:py-3 gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden h-9 w-9 flex-shrink-0"
              >
                {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
              <Link to="/" className="hover:opacity-80 transition-opacity flex-shrink-0">
                <img 
                  src="/lovable-uploads/6fdfc5d2-230c-4142-bf7c-3a326e5e45a8.png" 
                  alt="STA Fotos" 
                  className="h-6 md:h-9 w-auto"
                />
              </Link>
            </div>

            <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
              <ThemeToggle />
              
              {/* User Menu - Compacto no mobile */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 md:h-9 md:w-9 rounded-full p-0">
                    <Avatar className="h-8 w-8 md:h-9 md:w-9">
                      <AvatarImage src={profile?.avatar_url} alt={profile?.full_name} />
                      <AvatarFallback className="text-xs">
                        {profile?.full_name?.charAt(0)?.toUpperCase() || profile?.email?.charAt(0)?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-52" align="end" forceMount>
                  <div className="flex flex-col space-y-1 p-2">
                    <p className="text-sm font-medium leading-none truncate">
                      {profile?.full_name || 'Usuário'}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground truncate">
                      {profile?.email}
                    </p>
                    <div className="mt-1">
                      <span className="inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20">
                        {profile?.role === 'admin' ? 'Admin' : 
                         profile?.role === 'photographer' ? 'Fotógrafo' :
                         profile?.role === 'organizer' ? 'Organizador' :
                         profile?.role === 'organization' ? 'Organização' : 'Usuário'}
                      </span>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link to="/dashboard/profile">
                      <User className="mr-2 h-4 w-4" />
                      Perfil
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="cursor-pointer text-red-600 dark:text-red-400"
                    onClick={() => signOut()}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Main Content - Padding otimizado para mobile */}
        <main className="flex-1 px-3 py-3 md:px-6 md:py-6 pb-20 md:pb-6 overflow-x-hidden">
          <DynamicBreadcrumb />
          <div className="w-full max-w-full overflow-x-hidden">
            {children}
          </div>
        </main>

        {/* Bottom Navigation - Mobile Only */}
        <BottomNavigation />
      </div>
    </div>
  );
};

export default DashboardLayout;