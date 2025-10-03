import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { UserCheck, Shield, User as UserIcon } from 'lucide-react';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface UserRoleManagerProps {
  userId: string;
  currentRole: string;
  userName: string;
  onRoleUpdate: () => void;
}

export const UserRoleManager: React.FC<UserRoleManagerProps> = ({
  userId,
  currentRole,
  userName,
  onRoleUpdate
}) => {
  const [updating, setUpdating] = useState(false);

  const promoteToPhotographer = async () => {
    try {
      setUpdating(true);

      // Atualizar o campo role na tabela profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ role: 'photographer' })
        .eq('id', userId);

      if (profileError) throw profileError;

      toast({
        title: "Usuário promovido!",
        description: `${userName} agora é um fotógrafo.`,
      });

      onRoleUpdate();
    } catch (error) {
      console.error('Error promoting user:', error);
      toast({
        title: "Erro",
        description: "Falha ao promover usuário",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
            <Shield className="h-3 w-3 mr-1" />
            Admin
          </Badge>
        );
      case 'photographer':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
            <UserCheck className="h-3 w-3 mr-1" />
            Fotógrafo
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <UserIcon className="h-3 w-3 mr-1" />
            Usuário
          </Badge>
        );
    }
  };

  return (
    <div className="flex items-center gap-2">
      {getRoleBadge(currentRole)}
      
      {currentRole === 'user' && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="outline" className="gap-2">
              <UserCheck className="h-3 w-3" />
              Promover para Fotógrafo
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Promover para Fotógrafo</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja promover <strong>{userName}</strong> para fotógrafo?
                <br /><br />
                Este usuário poderá:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Fazer upload de fotos</li>
                  <li>Criar álbuns em eventos</li>
                  <li>Se candidatar para eventos</li>
                  <li>Receber comissões por vendas</li>
                </ul>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={promoteToPhotographer} disabled={updating}>
                {updating ? "Promovendo..." : "Confirmar"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};
