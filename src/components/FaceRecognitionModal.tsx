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
      <DialogContent className="w-[95vw] max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <ScanFace className="h-4 w-4 sm:h-5 sm:w-5" />
            Reconhecimento Facial
          </DialogTitle>
          <DialogDescription className="text-sm">
            Posicione seu rosto na câmera para encontrar suas fotos automaticamente
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Visualização da câmera */}
          <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            
            {!cameraActive && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                <div className="text-center text-white p-6 max-w-sm">
                  <Camera className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm mb-4">
                    {cameraError || 'Câmera desativada'}
                  </p>
                  {cameraError && (
                    <Button
                      onClick={handleStartCamera}
                      variant="outline"
                      size="sm"
                      className="bg-white text-black hover:bg-gray-100"
                    >
                      Tentar Novamente
                    </Button>
                  )}
                </div>
              </div>
            )}

            {isProcessing && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <div className="text-center text-white">
                  <Loader2 className="h-12 w-12 mx-auto mb-3 animate-spin" />
                  <p className="text-sm">Processando imagem...</p>
                </div>
              </div>
            )}

            {/* Guia de posicionamento facial - Responsivo */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="border-2 border-white/40 rounded-full w-48 h-48 sm:w-64 sm:h-64 flex items-center justify-center">
                <div className="border-2 border-white/60 rounded-full w-40 h-40 sm:w-56 sm:h-56" />
              </div>
            </div>
          </div>

          {/* Instruções */}
          <div className="bg-muted rounded-lg p-3 sm:p-4 space-y-2">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              📸 Como obter melhores resultados:
            </h4>
            <ul className="text-xs sm:text-sm text-muted-foreground space-y-1">
              <li>✓ Posicione seu rosto centralizado no círculo</li>
              <li>✓ Use boa iluminação (evite contraluz)</li>
              <li>✓ Remova óculos escuros, chapéus ou máscaras</li>
              <li>✓ Mantenha o rosto visível e sem obstruções</li>
              <li>✓ Fique a aproximadamente 50cm da câmera</li>
            </ul>
            
            {/* Status da IA */}
            <div className={`mt-3 p-2 sm:p-3 border rounded-md ${
              modelsReady 
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
            }`}>
              <p className={`text-xs font-medium flex items-center gap-1 ${
                modelsReady 
                  ? 'text-green-900 dark:text-green-100'
                  : 'text-yellow-900 dark:text-yellow-100'
              }`}>
                <span className="text-base">{modelsReady ? '✅' : '⏳'}</span> 
                {modelsReady ? 'IA Pronta para Buscar!' : 'Carregando IA...'}
              </p>
              <p className={`text-xs mt-1 ${
                modelsReady 
                  ? 'text-green-800 dark:text-green-200'
                  : 'text-yellow-800 dark:text-yellow-200'
              }`}>
                {modelsReady 
                  ? 'Tecnologia de reconhecimento facial com detecção adaptativa e múltiplos níveis de confiança.'
                  : 'Carregando modelos neurais de detecção facial... Aguarde alguns segundos.'}
              </p>
            </div>
            
            {!cameraActive && (
              <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                <p className="text-xs font-medium text-yellow-900 dark:text-yellow-100 mb-2">
                  ⚠️ Problemas com a câmera?
                </p>
                <ul className="text-xs text-yellow-800 dark:text-yellow-200 space-y-1">
                  <li>1. Clique no ícone 🔒 ou 🎥 na barra de endereço</li>
                  <li>2. Permita o acesso à câmera para este site</li>
                  <li>3. Recarregue a página se necessário</li>
                  <li>4. Use HTTPS (não HTTP) em produção</li>
                </ul>
              </div>
            )}
          </div>

          {/* Resultados */}
          {matches.length > 0 && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <p className="text-sm font-medium text-green-900 dark:text-green-100">
                ✓ {matches.length} foto(s) encontrada(s)!
              </p>
              <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                Redirecionando para suas fotos...
              </p>
            </div>
          )}

          {/* Ações */}
          <div className="flex flex-col sm:flex-row gap-2">
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
              className="flex-1 text-sm"
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
                  Carregando IA...
                </>
              ) : (
                <>
                  <ScanFace className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Buscar Minhas Fotos</span>
                  <span className="sm:hidden">Buscar Fotos</span>
                </>
              )}
            </Button>
          </div>

          {/* Aviso de privacidade */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              🔒 Suas imagens são processadas localmente e não são armazenadas
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Tecnologia 100% segura e privada
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
