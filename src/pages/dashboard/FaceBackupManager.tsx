import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFaceBackup } from '@/hooks/useFaceBackup';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Database, Download, Upload, Clock, Check, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function FaceBackupManager() {
  const { user } = useAuth();
  const { createBackup, restoreBackup, getBackupHistory, loading } = useFaceBackup();
  const [backupHistory, setBackupHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    if (user) {
      loadHistory();
    }
  }, [user]);

  const loadHistory = async () => {
    if (!user) return;
    setLoadingHistory(true);
    try {
      const history = await getBackupHistory(user.id);
      setBackupHistory(history);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleCreateBackup = async () => {
    if (!user) return;
    try {
      await createBackup(user.id, false);
      await loadHistory();
    } catch (error) {
      console.error('Erro ao criar backup:', error);
    }
  };

  const handleRestoreBackup = async (backupPath?: string) => {
    if (!user) return;
    try {
      await restoreBackup(user.id, backupPath);
      await loadHistory();
    } catch (error) {
      console.error('Erro ao restaurar backup:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Backup de Reconhecimento Facial</h1>
        <p className="text-muted-foreground">
          Faça backup e restaure seus descritores faciais para não perder seus dados
        </p>
      </div>

      {/* Criar Novo Backup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Criar Backup
          </CardTitle>
          <CardDescription>
            Salve seus descritores faciais em nuvem para restaurá-los quando necessário
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-900 dark:text-blue-100">
                <strong>Importante:</strong> Os backups são automaticamente criados quando você usa o reconhecimento facial. 
                Você pode criar backups manuais a qualquer momento. Mantemos os 5 backups mais recentes.
              </div>
            </div>
          </div>

          <Button 
            onClick={handleCreateBackup} 
            disabled={loading || !user}
            size="lg"
            className="w-full"
          >
            {loading ? (
              <>
                <Clock className="h-5 w-5 mr-2 animate-spin" />
                Criando Backup...
              </>
            ) : (
              <>
                <Upload className="h-5 w-5 mr-2" />
                Criar Backup Agora
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Histórico de Backups */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Histórico de Backups
          </CardTitle>
          <CardDescription>
            Backups disponíveis para restauração
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingHistory ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Clock className="h-5 w-5 animate-spin mr-2" />
              Carregando histórico...
            </div>
          ) : backupHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum backup encontrado</p>
              <p className="text-sm mt-1">Crie seu primeiro backup acima</p>
            </div>
          ) : (
            <div className="space-y-3">
              {backupHistory.map((backup, index) => (
                <div key={backup.id}>
                  {index > 0 && <Separator className="my-3" />}
                  <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          Backup #{backupHistory.length - index}
                        </span>
                        {backup.is_automatic && (
                          <Badge variant="secondary" className="text-xs">
                            Automático
                          </Badge>
                        )}
                        {backup.restored_at && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Check className="h-3 w-3" />
                            Restaurado
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>
                          📅 {formatDistanceToNow(new Date(backup.created_at), { 
                            addSuffix: true, 
                            locale: ptBR 
                          })}
                        </div>
                        <div className="flex items-center gap-4">
                          <span>📸 {backup.descriptor_count} descritores</span>
                          <span>💾 {formatFileSize(backup.file_size)}</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestoreBackup(backup.backup_path)}
                      disabled={loading}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Restaurar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Informações */}
      <Card className="border-muted">
        <CardHeader>
          <CardTitle className="text-base">ℹ️ Como Funciona</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex gap-2">
            <span className="font-semibold text-foreground min-w-[140px]">Backup Automático:</span>
            <span>Criado automaticamente quando você usa o reconhecimento facial</span>
          </div>
          <div className="flex gap-2">
            <span className="font-semibold text-foreground min-w-[140px]">Backup Manual:</span>
            <span>Você pode criar backups a qualquer momento clicando no botão acima</span>
          </div>
          <div className="flex gap-2">
            <span className="font-semibold text-foreground min-w-[140px]">Restauração:</span>
            <span>Substitui seus descritores atuais pelos do backup selecionado</span>
          </div>
          <div className="flex gap-2">
            <span className="font-semibold text-foreground min-w-[140px]">Retenção:</span>
            <span>Mantemos automaticamente os 5 backups mais recentes</span>
          </div>
          <div className="flex gap-2">
            <span className="font-semibold text-foreground min-w-[140px]">Segurança:</span>
            <span>Todos os backups são criptografados e acessíveis apenas por você</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
