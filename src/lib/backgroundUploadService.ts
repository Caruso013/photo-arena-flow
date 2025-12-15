import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface UploadTask {
  id: string;
  file: File;
  fileName: string;
  campaignId: string;
  subEventId?: string;
  title: string;
  price: number;
  photographerId: string;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  progress: number;
  error?: string;
  retryCount: number;
  fileSequence: number; // Número extraído do nome do arquivo para ordenação
}

// Extrai número do nome do arquivo da câmera (ex: IMG_0001.jpg → 1, DSC_0234.jpg → 234)
function extractFileSequence(fileName: string): number {
  // Remove extensão
  const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
  
  // Tenta extrair números do nome do arquivo
  // Padrões comuns: IMG_0001, DSC_0234, DSCN0001, _MG_1234, etc.
  const matches = nameWithoutExt.match(/(\d+)/g);
  
  if (matches && matches.length > 0) {
    // Pega o maior número encontrado (geralmente é o sequencial da câmera)
    const numbers = matches.map(m => parseInt(m, 10));
    return Math.max(...numbers);
  }
  
  // Se não encontrar número, retorna 0
  return 0;
}

export interface UploadBatch {
  id: string;
  tasks: UploadTask[];
  totalFiles: number;
  completedFiles: number;
  failedFiles: number;
  status: 'pending' | 'uploading' | 'completed' | 'partially_failed' | 'failed';
  createdAt: Date;
  canMinimize: boolean; // Se pode ser minimizado
}

class BackgroundUploadService {
  private uploads: Map<string, UploadBatch> = new Map();
  private subscribers: Set<(uploads: UploadBatch[]) => void> = new Set();
  private isUploading = false;
  private maxRetries = 3;
  private maxConcurrentUploads = 5; // Aumentado de 3 para 5 uploads simultâneos para melhor performance

  // Subscribir para receber atualizações
  subscribe(callback: (uploads: UploadBatch[]) => void) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  // Notificar todos os subscribers
  private notify() {
    const allUploads = Array.from(this.uploads.values());
    this.subscribers.forEach(callback => callback(allUploads));
  }

  // Criar novo lote de upload
  createUploadBatch(
    files: FileList,
    campaignId: string,
    subEventId: string | undefined,
    title: string,
    price: number,
    photographerId: string
  ): string {
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Criar tarefas com número de sequência extraído do nome do arquivo
    const tasksUnsorted: UploadTask[] = Array.from(files).map((file, index) => ({
      id: `task_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
      file,
      fileName: file.name,
      campaignId,
      subEventId,
      title: title || `Foto ${index + 1}`,
      price,
      photographerId,
      status: 'pending' as const,
      progress: 0,
      retryCount: 0,
      fileSequence: extractFileSequence(file.name),
    }));

    // Ordenar tarefas pelo número do arquivo para manter ordem cronológica da câmera
    const tasks = tasksUnsorted.sort((a, b) => a.fileSequence - b.fileSequence);

    const batch: UploadBatch = {
      id: batchId,
      tasks,
      totalFiles: files.length,
      completedFiles: 0,
      failedFiles: 0,
      status: 'pending',
      createdAt: new Date(),
      canMinimize: true,
    };

    this.uploads.set(batchId, batch);
    this.notify();

    // Mostrar notificação inicial
    const timeEstimate = Math.ceil(files.length / this.maxConcurrentUploads * 8); // ~8s por lote de 5
    toast({
      title: "🚀 Upload iniciado!",
      description: `${files.length} foto(s) na fila. Tempo estimado: ${timeEstimate}s. Upload continua em background!`,
    });

    // Iniciar processamento
    this.processUploads();

    return batchId;
  }

  // Processar uploads em background
  private async processUploads() {
    if (this.isUploading) return;
    this.isUploading = true;

    try {
      while (this.hasPendingUploads()) {
        const concurrentTasks: Promise<void>[] = [];
        let activeUploads = 0;

        // Pegar tarefas pendentes para upload simultâneo
        for (const batch of this.uploads.values()) {
          if (activeUploads >= this.maxConcurrentUploads) break;

          const pendingTask = batch.tasks.find(task => 
            task.status === 'pending' && task.retryCount < this.maxRetries
          );

          if (pendingTask) {
            concurrentTasks.push(this.uploadTask(batch.id, pendingTask));
            activeUploads++;
          }
        }

        // Aguardar uploads atuais terminarem
        if (concurrentTasks.length > 0) {
          await Promise.allSettled(concurrentTasks);
        } else {
          break; // Não há mais uploads para processar
        }
      }

      // Mostrar notificação final
      this.showFinalNotifications();

    } finally {
      this.isUploading = false;
    }
  }

  // Verificar se há uploads pendentes
  private hasPendingUploads(): boolean {
    for (const batch of this.uploads.values()) {
      if (batch.tasks.some(task => 
        task.status === 'pending' && task.retryCount < this.maxRetries
      )) {
        return true;
      }
    }
    return false;
  }

  // Upload de uma tarefa específica
  private async uploadTask(batchId: string, task: UploadTask): Promise<void> {
    const batch = this.uploads.get(batchId);
    if (!batch) return;

    try {
      // Atualizar status para 'uploading'
      task.status = 'uploading';
      task.progress = 0;
      batch.status = 'uploading';
      this.notify();

      // Gerar nomes de arquivo únicos
      const fileExt = task.file.name.split('.').pop();
      const fileName = `${task.photographerId}/${Date.now()}_${task.id}.${fileExt}`;
      const watermarkedFileName = `${task.photographerId}/watermarked_${Date.now()}_${task.id}.${fileExt}`;

      // Simular progresso durante upload
      const progressInterval = setInterval(() => {
        if (task.progress < 90) {
          task.progress += Math.random() * 10;
          this.notify();
        }
      }, 500);

      try {
        // Usar número do arquivo como base para sequência
        // Isso mantém a ordem cronológica das fotos da câmera
        // O fileSequence já foi extraído do nome do arquivo (ex: IMG_0234.jpg → 234)
        const { data: maxSeqData } = await supabase
          .from('photos')
          .select('upload_sequence')
          .eq('campaign_id', task.campaignId)
          .order('upload_sequence', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        // Base offset: maior sequência existente no evento
        const baseOffset = maxSeqData?.upload_sequence || 0;
        
        // Upload sequence = base offset + número do arquivo da câmera
        // Isso garante que fotos novas não sobrescrevam a ordenação de fotos antigas
        // E mantém a ordem cronológica dentro do lote
        const uploadSequence = baseOffset + task.fileSequence;

        // Upload original photo (private)
        const { data: originalData, error: originalError } = await supabase.storage
          .from('photos-original')
          .upload(fileName, task.file);

        if (originalError) throw originalError;

        task.progress = 50;
        this.notify();

        // Upload watermarked version
        const { data: watermarkedData, error: watermarkedError } = await supabase.storage
          .from('photos-watermarked')
          .upload(watermarkedFileName, task.file);

        if (watermarkedError) throw watermarkedError;

        task.progress = 75;
        this.notify();

        // Get public URLs
        const { data: originalUrl } = supabase.storage
          .from('photos-original')
          .getPublicUrl(fileName);

        const { data: watermarkedUrl } = supabase.storage
          .from('photos-watermarked')
          .getPublicUrl(watermarkedFileName);

        // Save photo record to database
        const { error: dbError } = await supabase
          .from('photos')
          .insert({
            campaign_id: task.campaignId,
            sub_event_id: task.subEventId || null,
            photographer_id: task.photographerId,
            original_url: originalUrl.publicUrl,
            watermarked_url: watermarkedUrl.publicUrl,
            title: task.title,
            price: task.price,
            is_available: true,
            upload_sequence: uploadSequence,
          });

        if (dbError) throw dbError;

        // Upload concluído com sucesso
        clearInterval(progressInterval);
        task.status = 'completed';
        task.progress = 100;
        batch.completedFiles++;

      } catch (error) {
        clearInterval(progressInterval);
        throw error;
      }

    } catch (error) {
      console.error(`Erro no upload da tarefa ${task.id}:`, error);
      
      task.retryCount++;
      task.error = error instanceof Error ? error.message : 'Erro desconhecido';

      if (task.retryCount >= this.maxRetries) {
        task.status = 'error';
        batch.failedFiles++;
      } else {
        // Tentar novamente em alguns segundos
        task.status = 'pending';
        setTimeout(() => this.processUploads(), 2000);
      }
    }

    // Atualizar status do lote
    this.updateBatchStatus(batchId);
    this.notify();
  }

  // Atualizar status do lote baseado nas tarefas
  private updateBatchStatus(batchId: string) {
    const batch = this.uploads.get(batchId);
    if (!batch) return;

    const { completedFiles, failedFiles, totalFiles } = batch;
    
    if (completedFiles === totalFiles) {
      batch.status = 'completed';
    } else if (completedFiles + failedFiles === totalFiles) {
      batch.status = failedFiles > 0 ? 'partially_failed' : 'completed';
    } else if (failedFiles > 0 && completedFiles === 0) {
      batch.status = 'failed';
    }
  }

  private showFinalNotifications() {
    for (const batch of this.uploads.values()) {
      if (batch.status === 'completed') {
        toast({
          title: "🎉 Upload concluído!",
          description: `${batch.completedFiles} foto(s) enviadas com sucesso e já estão disponíveis no seu evento!`,
        });

        // Notificar service worker
        this.notifyServiceWorker('completed', batch.completedFiles);
        
      } else if (batch.status === 'partially_failed') {
        toast({
          title: "⚠️ Upload parcialmente concluído",
          description: `${batch.completedFiles} foto(s) enviadas com sucesso. ${batch.failedFiles} falharam e podem ser reenviadas.`,
          variant: "destructive",
        });

        // Notificar service worker sobre erro parcial
        this.notifyServiceWorker('partial_error', batch.failedFiles);
        
      } else if (batch.status === 'failed') {
        toast({
          title: "❌ Falha no upload",
          description: `Não foi possível enviar as fotos. Verifique sua conexão com a internet e tente novamente.`,
          variant: "destructive",
        });

        // Notificar service worker sobre erro
        this.notifyServiceWorker('error', batch.totalFiles);
      }
    }
  }

  // Notificar service worker para persistir notificações
  private notifyServiceWorker(status: string, count: number) {
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'UPLOAD_STATUS',
        payload: { status, count }
      });
    }
  }

  // Cancelar upload
  cancelUpload(batchId: string) {
    const batch = this.uploads.get(batchId);
    if (!batch) return;

    // Marcar tarefas pendentes como canceladas
    batch.tasks.forEach(task => {
      if (task.status === 'pending') {
        task.status = 'error';
        task.error = 'Cancelado pelo usuário';
      }
    });

    this.updateBatchStatus(batchId);
    this.notify();

    toast({
      title: "Upload cancelado",
      description: "O upload foi cancelado. Fotos já enviadas foram mantidas.",
    });
  }

  // Retry upload failed tasks
  retryFailedUploads(batchId: string) {
    const batch = this.uploads.get(batchId);
    if (!batch) return;

    let retriedCount = 0;
    batch.tasks.forEach(task => {
      if (task.status === 'error') {
        task.status = 'pending';
        task.retryCount = 0;
        task.error = undefined;
        task.progress = 0;
        retriedCount++;
      }
    });

    if (retriedCount > 0) {
      batch.status = 'pending';
      batch.failedFiles -= retriedCount;
      this.notify();
      this.processUploads();

      toast({
        title: "Tentando novamente",
        description: `Reprocessando ${retriedCount} foto(s) que falharam.`,
      });
    }
  }

  // Remover upload da lista
  removeUpload(batchId: string) {
    this.uploads.delete(batchId);
    this.notify();
  }

  // Obter todos os uploads
  getAllUploads(): UploadBatch[] {
    return Array.from(this.uploads.values());
  }

  // Obter upload específico
  getUpload(batchId: string): UploadBatch | undefined {
    return this.uploads.get(batchId);
  }

  // Verificar se há uploads ativos
  hasActiveUploads(): boolean {
    return Array.from(this.uploads.values()).some(batch => 
      batch.status === 'uploading' || batch.status === 'pending'
    );
  }
}

// Singleton instance
export const backgroundUploadService = new BackgroundUploadService();
export default backgroundUploadService;