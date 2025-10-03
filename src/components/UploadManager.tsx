import React, { useState, useEffect } from 'react';
import { X, Minimize2, Maximize2, RefreshCw, AlertCircle, CheckCircle2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { backgroundUploadService, UploadBatch } from '@/lib/backgroundUploadService';
import { cn } from '@/lib/utils';

interface UploadManagerProps {
  className?: string;
}

const UploadManager: React.FC<UploadManagerProps> = ({ className }) => {
  const [uploads, setUploads] = useState<UploadBatch[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = backgroundUploadService.subscribe((newUploads) => {
      setUploads(newUploads);
      setIsVisible(newUploads.length > 0);
    });

    // Carregar uploads existentes
    setUploads(backgroundUploadService.getAllUploads());
    setIsVisible(backgroundUploadService.getAllUploads().length > 0);

    return unsubscribe;
  }, []);

  if (!isVisible || uploads.length === 0) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'uploading': return 'bg-blue-500';
      case 'pending': return 'bg-yellow-500';
      case 'error':
      case 'failed': return 'bg-red-500';
      case 'partially_failed': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4" />;
      case 'uploading': return <Upload className="h-4 w-4 animate-pulse" />;
      case 'pending': return <Upload className="h-4 w-4" />;
      case 'error':
      case 'failed':
      case 'partially_failed': return <AlertCircle className="h-4 w-4" />;
      default: return <Upload className="h-4 w-4" />;
    }
  };

  const getOverallProgress = (batch: UploadBatch) => {
    const completedTasks = batch.tasks.filter(task => task.status === 'completed').length;
    return (completedTasks / batch.totalFiles) * 100;
  };

  const handleRetry = (batchId: string) => {
    backgroundUploadService.retryFailedUploads(batchId);
  };

  const handleCancel = (batchId: string) => {
    backgroundUploadService.cancelUpload(batchId);
  };

  const handleRemove = (batchId: string) => {
    backgroundUploadService.removeUpload(batchId);
  };

  return (
    <div className={cn(
      "fixed bottom-4 right-4 z-50 max-w-sm w-full",
      className
    )}>
      <Card className="bg-background/95 backdrop-blur-sm border shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b">
          <div className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            <span className="font-medium text-sm">Uploads ({uploads.length})</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsMinimized(!isMinimized)}
            >
              {isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsVisible(false)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Content */}
        {!isMinimized && (
          <div className="max-h-64 overflow-y-auto">
            {uploads.map((batch) => (
              <div key={batch.id} className="p-3 border-b last:border-b-0">
                <div className="space-y-2">
                  {/* Batch Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full", getStatusColor(batch.status))} />
                      <span className="text-sm font-medium">
                        {batch.totalFiles} foto{batch.totalFiles !== 1 ? 's' : ''}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {getStatusIcon(batch.status)}
                        <span className="ml-1 capitalize">
                          {batch.status === 'uploading' && 'Enviando'}
                          {batch.status === 'completed' && 'Concluído'}
                          {batch.status === 'pending' && 'Na fila'}
                          {batch.status === 'failed' && 'Falhou'}
                          {batch.status === 'partially_failed' && 'Parcial'}
                        </span>
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(batch.createdAt).toLocaleTimeString()}
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="space-y-1">
                    <Progress value={getOverallProgress(batch)} className="h-1" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>
                        {batch.completedFiles}/{batch.totalFiles} concluídas
                      </span>
                      <span>{Math.round(getOverallProgress(batch))}%</span>
                    </div>
                  </div>

                  {/* Failed Files */}
                  {batch.failedFiles > 0 && (
                    <div className="text-xs text-red-600">
                      {batch.failedFiles} foto{batch.failedFiles !== 1 ? 's' : ''} falharam
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-end gap-1">
                    {(batch.status === 'failed' || batch.status === 'partially_failed') && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() => handleRetry(batch.id)}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Tentar novamente
                      </Button>
                    )}
                    
                    {(batch.status === 'pending' || batch.status === 'uploading') && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() => handleCancel(batch.id)}
                      >
                        Cancelar
                      </Button>
                    )}

                    {(batch.status === 'completed' || batch.status === 'failed') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() => handleRemove(batch.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Minimized Summary */}
        {isMinimized && (
          <div className="p-3">
            <div className="flex items-center justify-between text-sm">
              <span>
                {uploads.filter(u => u.status === 'uploading').length} enviando
              </span>
              <span>
                {uploads.filter(u => u.status === 'completed').length} concluídos
              </span>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default UploadManager;