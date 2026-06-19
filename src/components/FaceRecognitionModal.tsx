import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useFaceRecognition } from '@/hooks/useFaceRecognition';
import { Camera, Loader2, ScanFace, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface FaceRecognitionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId?: string;
}

export const FaceRecognitionModal: React.FC<FaceRecognitionModalProps> = ({
  open,
  onOpenChange,
  campaignId,
}) => {
  const {
    videoRef,
    isProcessing,
    matches,
    modelsReady,
    startCamera,
    stopCamera,
    findMyPhotos,
  } = useFaceRecognition();
  
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if (open) {
      handleStartCamera();
    } else {
      handleStopCamera();
    }

    return () => {
      handleStopCamera();
    };
  }, [open]);

  const handleStartCamera = async () => {
    setCameraError(null);
    const success = await startCamera();
    setCameraActive(success);
    if (!success) {
      setCameraError('Não foi possível acessar a câmera');
    }
  };

  const handleStopCamera = () => {
    stopCamera();
    setCameraActive(false);
  };

  const handleScanFace = async () => {
    console.log('🎯 Iniciando busca facial...');
    console.log('- Câmera ativa:', cameraActive);
    console.log('- Modelos prontos:', modelsReady);
    console.log('- Campaign ID:', campaignId);
    
    if (!cameraActive) {
      setCameraError('Câmera não está ativa. Permita o acesso à câmera.');
      return;
    }
    
    if (!modelsReady) {
      setCameraError('Aguarde os modelos de IA carregarem completamente.');
      return;
    }
    
    const foundMatches = await findMyPhotos({ campaignId });
    
    console.log('✅ Busca concluída. Matches:', foundMatches.length);
    
    if (foundMatches.length > 0) {
      // Redirecionar para as fotos encontradas
      const photoIds = foundMatches.map(m => m.photo_id).join(',');
      console.log('🔄 Redirecionando para fotos:', photoIds);
      navigate(`/campaign/${campaignId || foundMatches[0].campaign_id}?photos=${photoIds}`);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[98vw] max-w-[640px] max-h-[92vh] overflow-y-auto border border-border/60 bg-gradient-to-b from-background to-muted/20 p-4 shadow-2xl sm:p-6">
        <div className="relative rounded-xl border border-border/50 bg-background/80 px-4 py-3 backdrop-blur-sm">
          <DialogTitle className="flex items-center justify-center gap-2 text-lg font-semibold tracking-tight">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-amber-500 text-white shadow-md">
              <ScanFace className="h-4 w-4" />
            </span>
            Reconhecimento Facial
          </DialogTitle>
          <button
            aria-label="Fechar"
            onClick={() => onOpenChange(false)}
            className="absolute right-2 top-2 rounded-full border border-border/60 bg-background/80 p-2 text-muted-foreground transition hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-3 sm:space-y-4">
          {/* Visualização da câmera */}
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_20px_45px_-20px_rgba(0,0,0,0.75)]" style={{ aspectRatio: '4/3' }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.08),transparent_65%)]" />

            {cameraActive && (
              <>
                <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center">
                  <span className="rounded-full border border-white/25 bg-black/40 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-sm">
                    Posicione seu rosto no centro
                  </span>
                </div>

                {/* Guia de posicionamento facial - exibido somente com câmera ativa */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="relative flex h-44 w-44 items-center justify-center rounded-[1.2rem] border-2 border-white/55 sm:h-56 sm:w-56">
                    <div className="h-32 w-32 rounded-xl border border-white/65 sm:h-44 sm:w-44" />
                    <div className="absolute inset-0 rounded-[1.2rem] border border-white/20" />
                  </div>
                </div>
              </>
            )}

            {!cameraActive && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/75 p-4 backdrop-blur-[1px]">
                <div className="max-w-xs rounded-2xl border border-white/20 bg-black/60 p-5 text-center text-white shadow-xl">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/5">
                    <Camera className="h-6 w-6 opacity-80" />
                  </div>
                  <p className="mb-1 text-sm font-medium">{cameraError || 'Câmera desativada'}</p>
                  <p className="mb-3 text-xs text-white/75">Permita o acesso para iniciar a busca facial.</p>
                  {cameraError && (
                    <Button
                      onClick={handleStartCamera}
                      size="sm"
                      className="bg-white text-black hover:bg-white/90"
                    >
                      Tentar Novamente
                    </Button>
                  )}
                </div>
              </div>
            )}

            {isProcessing && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/65 backdrop-blur-[2px]">
                <div className="rounded-2xl border border-white/15 bg-black/45 px-6 py-5 text-center text-white">
                  <Loader2 className="mx-auto mb-2 h-10 w-10 animate-spin" />
                  <p className="text-sm font-medium">Processando...</p>
                </div>
              </div>
            )}
          </div>

          {/* Instruções */}
          <div className="space-y-2 rounded-xl border border-border/70 bg-gradient-to-br from-muted to-muted/40 p-3 sm:p-4">
            <div className="flex items-start justify-between">
              <h4 className="text-sm font-semibold">Dicas para melhor resultado</h4>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className={`h-2 w-2 rounded-full ${modelsReady ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <span>{modelsReady ? 'Modelos prontos' : 'Carregando modelos'}</span>
              </div>
            </div>

            <ul className="space-y-1 text-xs text-muted-foreground sm:text-sm">
              <li>• Mantenha o rosto centralizado</li>
              <li>• Boa iluminação e sem obstruções</li>
              <li>• Remova óculos escuros/chapéus</li>
            </ul>

            {!cameraActive && (
              <div className="mt-2">
                <button className="text-xs font-medium text-amber-700 underline" onClick={() => setShowHelp(s => !s)}>
                  {showHelp ? 'Ocultar ajuda' : 'Problemas com a câmera?'}
                </button>
                {showHelp && (
                  <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                    <p>1. Clique no cadeado na barra de endereço → Permissões → Câmera → Permitir.</p>
                    <p>2. Verifique configurações do SO e feche apps que usem a câmera.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Resultados */}
          {matches.length > 0 && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-900/20">
              <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">✓ {matches.length} foto(s) encontrada(s)!</p>
              <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">Redirecionando...</p>
            </div>
          )}

          {/* Ações */}
          <div className="flex flex-col gap-2.5 pt-1">
            <Button
              variant="outline"
              className="flex-1 border-border/70 text-sm"
              onClick={() => onOpenChange(false)}
              disabled={isProcessing}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>

            <Button
              className="w-full bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500 text-sm font-semibold text-white shadow-md transition-all hover:from-rose-600 hover:via-orange-600 hover:to-amber-600 hover:shadow-lg disabled:opacity-60"
              onClick={handleScanFace}
              disabled={!cameraActive || isProcessing || !modelsReady}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : !modelsReady ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Carregando modelos...
                </>
              ) : (
                <>
                  <ScanFace className="h-4 w-4 mr-2" />
                  <span className="inline">Buscar Minhas Fotos</span>
                </>
              )}
            </Button>
          </div>

          {/* Aviso de privacidade */}
          <div className="text-center pt-1">
            <p className="text-xs text-muted-foreground">Imagens processadas localmente - não armazenamos sua selfie.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
