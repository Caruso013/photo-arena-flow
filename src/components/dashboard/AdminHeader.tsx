import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Bell, 
  Settings, 
  LogOut, 
  User, 
  Shield,
  Camera,
  ChevronDown
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { NavLink } from 'react-router-dom';

const AdminHeader = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [pendingCount] = useState(0);

  const handleLogout = async () => {
    try {
      await signOut();
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso",
      });
      navigate('/auth');
    } catch (error) {
      console.error('Error logging out:', error);
      toast({
        title: "Erro",
        description: "Falha ao fazer logout",
        variant: "destructive",
      });
    }
  };

  const getUserInitials = (name?: string | null, email?: string) => {
    if (name) {
      return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return email?.slice(0, 2).toUpperCase() || 'AD';
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:z-50 z-40">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Logo e Título */}
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500">
            <Camera className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">STA Fotos</h1>
            <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">
              <Shield className="mr-1 h-3 w-3" />
              Admin Panel
            </Badge>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative"
          >
            <Bell className="h-5 w-5" />
            {pendingCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
              >
                {pendingCount > 9 ? '9+' : pendingCount}
              </Badge>
            )}
          </Button>

          {/* Settings */}
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/dashboard/admin/reports')}
          >
            <Settings className="h-5 w-5" />
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2">
                <Avatar className="h-9 w-9 border-2 border-amber-500">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-amber-500 text-white font-semibold">
                    {getUserInitials(profile?.full_name, profile?.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium">
                    {profile?.full_name || 'Admin'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                    {profile?.email}
                  </p>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="cursor-pointer"
                onClick={() => navigate('/dashboard/profile')}
              >
                <User className="mr-2 h-4 w-4" />
                Perfil
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="cursor-pointer"
                onClick={() => navigate('/dashboard/admin/reports')}
              >
                <Settings className="mr-2 h-4 w-4" />
                Configurações
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="cursor-pointer text-red-600 focus:text-red-600"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
