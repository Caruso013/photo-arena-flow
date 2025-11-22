import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Trash2, RefreshCw, Database, AlertCircle, Clock, Play, Pause, History } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface CacheStats {
  table_name: string;
  total_rows: number;
  old_rows: number;
  table_size: string;
}

interface ScheduledJob {
  job_id: number;
  job_name: string;
  schedule: string;
  active: boolean;
  command: string;
}

interface JobHistory {
  job_name: string;
  run_time: string;
  status: string;
  return_message: string;
  start_time: string;
  end_time: string;
}

const CacheManagement = () => {
  const [stats, setStats] = useState<CacheStats[]>([]);
  const [scheduledJobs, setScheduledJobs] = useState<ScheduledJob[]>([]);
  const [jobHistory, setJobHistory] = useState<JobHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [cleanupDialog, setCleanupDialog] = useState<{
    open: boolean;
    type: 'audit' | 'notifications' | null;
  }>({ open: false, type: null });

  useEffect(() => {
    loadScheduledJobs();
    loadJobHistory();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_cache_statistics');
      
      if (error) throw error;
      
      setStats(data || []);
      toast.success('Estatísticas carregadas');
    } catch (error: any) {
      console.error('Error loading stats:', error);
      toast.error(error.message || 'Erro ao carregar estatísticas');
    } finally {
      setLoading(false);
    }
  };

  const loadScheduledJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('scheduled_cleanup_jobs')
        .select('*');
      
      if (error) throw error;
      
      setScheduledJobs(data || []);
    } catch (error: any) {
      console.error('Error loading scheduled jobs:', error);
    }
  };

  const loadJobHistory = async () => {
    try {
      const { data, error } = await supabase.rpc('get_cleanup_job_history', {
        limit_rows: 20
      });
      
      if (error) throw error;
      
      setJobHistory(data || []);
    } catch (error: any) {
      console.error('Error loading job history:', error);
    }
  };

  const toggleJob = async (jobName: string, currentStatus: boolean) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('toggle_cleanup_job', {
        job_name_param: jobName,
        enable_job: !currentStatus
      });
      
      if (error) throw error;
      
      toast.success(`Job ${!currentStatus ? 'habilitado' : 'desabilitado'} com sucesso`);
      await loadScheduledJobs();
    } catch (error: any) {
      console.error('Error toggling job:', error);
      toast.error(error.message || 'Erro ao alterar status do job');
    } finally {
      setLoading(false);
    }
  };

  const cleanupAuditLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('cleanup_old_audit_logs', {
        days_to_keep: 90
      });
      
      if (error) throw error;
      
      toast.success(`${data} logs de auditoria removidos`);
      await loadStats();
    } catch (error: any) {
      console.error('Error cleaning audit logs:', error);
      toast.error(error.message || 'Erro ao limpar logs');
    } finally {
      setLoading(false);
      setCleanupDialog({ open: false, type: null });
    }
  };

  const cleanupNotifications = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('cleanup_old_notifications', {
        days_to_keep: 30
      });
      
      if (error) throw error;
      
      toast.success(`${data} notificações removidas`);
      await loadStats();
    } catch (error: any) {
      console.error('Error cleaning notifications:', error);
      toast.error(error.message || 'Erro ao limpar notificações');
    } finally {
      setLoading(false);
      setCleanupDialog({ open: false, type: null });
    }
  };

  const getTableLabel = (tableName: string) => {
    const labels: Record<string, string> = {
      audit_log: 'Logs de Auditoria',
      notifications: 'Notificações',
      face_descriptor_backups: 'Backups Faciais'
    };
    return labels[tableName] || tableName;
  };

  const getTableDescription = (tableName: string) => {
    const descriptions: Record<string, string> = {
      audit_log: 'Registros de ações realizadas no sistema (mantidos por 90 dias)',
      notifications: 'Notificações lidas pelos usuários (mantidas por 30 dias)',
      face_descriptor_backups: 'Backups automáticos de reconhecimento facial (mantidos os 5 mais recentes por usuário)'
    };
    return descriptions[tableName] || '';
  };

  const getJobDescription = (jobName: string) => {
    const descriptions: Record<string, { desc: string; schedule: string }> = {
      'cleanup-audit-logs-weekly': {
        desc: 'Remove logs de auditoria com mais de 90 dias',
        schedule: 'Todo domingo às 3h'
      },
      'cleanup-notifications-daily': {
        desc: 'Remove notificações lidas com mais de 30 dias',
        schedule: 'Diariamente às 2h'
      },
      'cleanup-face-backups-daily': {
        desc: 'Mantém apenas os 5 backups mais recentes por usuário',
        schedule: 'Diariamente às 4h'
      }
    };
    return descriptions[jobName] || { desc: jobName, schedule: 'N/A' };
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Gerenciamento de Cache</h1>
        <p className="text-muted-foreground">
          Monitore e limpe dados acumulados no banco de dados
        </p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          A limpeza de cache remove dados antigos que não são mais necessários. 
          Esta ação não pode ser desfeita.
        </AlertDescription>
      </Alert>

      <div className="flex gap-4">
        <Button onClick={loadStats} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {loading ? 'Carregando...' : 'Atualizar Estatísticas'}
        </Button>
        <Button onClick={loadJobHistory} disabled={loading} variant="outline">
          <History className="mr-2 h-4 w-4" />
          Atualizar Histórico
        </Button>
      </div>

      {/* Jobs Agendados */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Jobs Automáticos Agendados</h2>
        </div>

        {scheduledJobs.length > 0 ? (
          <div className="space-y-4">
            {scheduledJobs.map((job) => {
              const jobInfo = getJobDescription(job.job_name);
              return (
                <Card key={job.job_id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{job.job_name}</h3>
                        <Badge variant={job.active ? "default" : "secondary"}>
                          {job.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        {jobInfo.desc}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        📅 {jobInfo.schedule}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={job.active ? "outline" : "default"}
                      onClick={() => toggleJob(job.job_name, job.active)}
                      disabled={loading}
                    >
                      {job.active ? (
                        <>
                          <Pause className="mr-2 h-4 w-4" />
                          Desativar
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" />
                          Ativar
                        </>
                      )}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-4">
            Nenhum job agendado encontrado
          </p>
        )}
      </Card>

      {/* Histórico de Execução */}
      {jobHistory.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <History className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Histórico de Execução</h2>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job</TableHead>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Mensagem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobHistory.map((history, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{history.job_name}</TableCell>
                    <TableCell>
                      {new Date(history.run_time).toLocaleString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={history.status === 'succeeded' ? 'default' : 'destructive'}>
                        {history.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {history.return_message || 'N/A'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {stats.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {stats.map((stat) => (
            <Card key={stat.table_name} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">{getTableLabel(stat.table_name)}</h3>
                </div>
              </div>

              <div className="space-y-3 mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total de registros</p>
                  <p className="text-2xl font-bold">{stat.total_rows.toLocaleString()}</p>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground">Registros antigos</p>
                  <p className="text-xl font-semibold text-orange-600">
                    {stat.old_rows.toLocaleString()}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Tamanho da tabela</p>
                  <p className="text-lg font-medium">{stat.table_size}</p>
                </div>

                <p className="text-xs text-muted-foreground">
                  {getTableDescription(stat.table_name)}
                </p>
              </div>

              {stat.table_name === 'audit_log' && stat.old_rows > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  onClick={() => setCleanupDialog({ open: true, type: 'audit' })}
                  disabled={loading}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Limpar Logs Antigos
                </Button>
              )}

              {stat.table_name === 'notifications' && stat.old_rows > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  onClick={() => setCleanupDialog({ open: true, type: 'notifications' })}
                  disabled={loading}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Limpar Notificações
                </Button>
              )}

              {stat.table_name === 'face_descriptor_backups' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled
                >
                  Limpeza Automática Ativa
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}

      <AlertDialog 
        open={cleanupDialog.open} 
        onOpenChange={(open) => setCleanupDialog({ open, type: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Limpeza</AlertDialogTitle>
            <AlertDialogDescription>
              {cleanupDialog.type === 'audit' && (
                <>
                  Você está prestes a remover todos os logs de auditoria com mais de 90 dias.
                  Esta ação não pode ser desfeita.
                </>
              )}
              {cleanupDialog.type === 'notifications' && (
                <>
                  Você está prestes a remover todas as notificações lidas com mais de 30 dias.
                  Esta ação não pode ser desfeita.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (cleanupDialog.type === 'audit') {
                  cleanupAuditLogs();
                } else if (cleanupDialog.type === 'notifications') {
                  cleanupNotifications();
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmar Limpeza
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CacheManagement;
