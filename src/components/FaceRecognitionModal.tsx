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
    const foundMatches = await findMyPhotos(campaignId);
    
    if (foundMatches.length > 0) {
      // Redirecionar para as fotos encontradas
      const photoIds = foundMatches.map(m => m.photo_id).join(',');
      navigate(`/campaign/${campaignId || foundMatches[0].campaign_id}?photos=${photoIds}`);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanFace className="h-5 w-5" />
            Reconhecimento Facial
          </DialogTitle>
          <DialogDescription>
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

            {/* Guia de posicionamento facial */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="border-2 border-white/40 rounded-full w-64 h-64 flex items-center justify-center">
                <div className="border-2 border-white/60 rounded-full w-56 h-56" />
              </div>
            </div>
          </div>

          {/* Instruções */}
          <div className="bg-muted rounded-lg p-4 space-y-2">
            <h4 className="font-semibold text-sm">Como usar:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Posicione seu rosto dentro do círculo</li>
              <li>• Certifique-se de estar bem iluminado</li>
              <li>• Mantenha o rosto centralizado e visível</li>
              <li>• Clique em "Buscar Minhas Fotos" para iniciar</li>
            </ul>
            
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
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={isProcessing}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            
            <Button
              className="flex-1"
              onClick={handleScanFace}
              disabled={!cameraActive || isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <ScanFace className="h-4 w-4 mr-2" />
                  Buscar Minhas Fotos
                </>
              )}
            </Button>
          </div>

          {/* Aviso de privacidade */}
          <p className="text-xs text-muted-foreground text-center">
            🔒 Suas imagens são processadas de forma segura e não são armazenadas
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
