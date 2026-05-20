import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
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
    
    const foundMatches = await findMyPhotos(campaignId);
    
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
      <DialogContent className="w-[98vw] max-w-[640px] max-h-[92vh] overflow-y-auto p-4 sm:p-6">
        <div className="relative">
          <DialogTitle className="flex items-center justify-center gap-2 text-lg font-semibold">
            <ScanFace className="h-5 w-5" />
            Reconhecimento Facial
          </DialogTitle>
          <button
            aria-label="Fechar"
            onClick={() => onOpenChange(false)}
            className="absolute top-2 right-2 p-2 rounded-md hover:bg-muted/60"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 space-y-3">
          {/* Visualização da câmera */}
          <div className="relative bg-black rounded-lg overflow-hidden" style={{aspectRatio: '4/3'}}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            
            {!cameraActive && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-4">
                <div className="text-center text-white p-4 max-w-xs">
                  <Camera className="h-10 w-10 mx-auto mb-2 opacity-60" />
                  <p className="text-sm mb-3">{cameraError || 'Câmera desativada'}</p>
                  {cameraError && (
                    <Button onClick={handleStartCamera} variant="ghost" size="sm" className="bg-white text-black">
                      Tentar Novamente
                    </Button>
                  )}
                </div>
              </div>
            )}

            {isProcessing && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <div className="text-center text-white">
                  <Loader2 className="h-10 w-10 mx-auto mb-2 animate-spin" />
                  <p className="text-sm">Processando...</p>
                </div>
              </div>
            )}

            {/* Guia de posicionamento facial - Responsivo */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="border-2 border-white/40 rounded-lg w-40 h-40 sm:w-56 sm:h-56 flex items-center justify-center">
                <div className="border-2 border-white/60 rounded-lg w-28 h-28 sm:w-44 sm:h-44" />
              </div>
            </div>
          </div>

          {/* Instruções */}
          <div className="bg-muted rounded-lg p-3 sm:p-4 space-y-2">
            <div className="flex items-start justify-between">
              <h4 className="font-semibold text-sm">📸 Dicas rápidas</h4>
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${modelsReady ? 'bg-green-500' : 'bg-yellow-500'}`} />
                <span>{modelsReady ? 'Modelos prontos' : 'Carregando modelos'}</span>
              </div>
            </div>

            <ul className="text-xs sm:text-sm text-muted-foreground space-y-1">
              <li>• Mantenha o rosto centralizado</li>
              <li>• Boa iluminação e sem obstruções</li>
              <li>• Remova óculos escuros/chapéus</li>
            </ul>

            {!cameraActive && (
              <div className="mt-2">
                <button className="text-xs text-yellow-800 underline" onClick={() => setShowHelp(s => !s)}>
                  {showHelp ? 'Ocultar ajuda' : 'Problemas com a câmera?'}
                </button>
                {showHelp && (
                  <div className="mt-2 text-xs text-yellow-800 bg-yellow-50 p-2 rounded-md">
                    <p>1. Clique no cadeado na barra de endereço → Permissões → Câmera → Permitir.</p>
                    <p>2. Verifique configurações do SO e feche apps que usem a câmera.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Resultados */}
          {matches.length > 0 && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
              <p className="text-sm font-medium text-green-900 dark:text-green-100">✓ {matches.length} foto(s) encontrada(s)!</p>
              <p className="text-xs text-green-700 dark:text-green-300 mt-1">Redirecionando...</p>
            </div>
          )}

          {/* Ações */}
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              className="flex-1 text-sm"
              onClick={() => onOpenChange(false)}
              disabled={isProcessing}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            
            <Button
              className="w-full text-sm"
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
            <p className="text-xs text-muted-foreground">🔒 Imagens processadas localmente — não armazenamos sua selfie.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
