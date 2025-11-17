import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BackupHistory {
  id: string;
  backup_path: string;
  descriptor_count: number;
  file_size: number;
  created_at: string;
  restored_at: string | null;
  is_automatic: boolean;
}

export function useFaceBackup() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const createBackup = async (userId: string, isAutomatic = false) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('backup-face-descriptors', {
        body: { userId, isAutomatic }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: '✅ Backup realizado!',
          description: `${data.descriptor_count} descritores salvos com sucesso.`,
        });
        return data;
      } else {
        throw new Error(data?.message || 'Erro ao criar backup');
      }
    } catch (error: any) {
      console.error('Erro ao criar backup:', error);
      toast({
        title: 'Erro no backup',
        description: error.message || 'Não foi possível realizar o backup',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const restoreBackup = async (userId: string, backupPath?: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('restore-face-descriptors', {
        body: { userId, backupPath }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: '🔄 Backup restaurado!',
          description: `${data.descriptor_count} descritores restaurados com sucesso.`,
        });
        return data;
      } else {
        throw new Error(data?.message || 'Erro ao restaurar backup');
      }
    } catch (error: any) {
      console.error('Erro ao restaurar backup:', error);
      toast({
        title: 'Erro na restauração',
        description: error.message || 'Não foi possível restaurar o backup',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getBackupHistory = async (userId: string): Promise<BackupHistory[]> => {
    try {
      const { data, error } = await supabase
        .from('face_descriptor_backups')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Erro ao buscar histórico:', error);
      return [];
    }
  };

  return {
    createBackup,
    restoreBackup,
    getBackupHistory,
    loading,
  };
}
