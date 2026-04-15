import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Camera, CameraOff, AlertCircle, RotateCcw, SwitchCamera } from 'lucide-react';

interface QRScannerProps {
  onScan: (data: string) => void;
  loading?: boolean;
}

const QRScanner = ({ onScan, loading = false }: QRScannerProps) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isScanningRef = useRef(false);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const hasScannedRef = useRef(false);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        if (isScanningRef.current) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (err) {
        // Ignore stop errors during cleanup
      }
      scannerRef.current = null;
      isScanningRef.current = false;
      setIsScanning(false);
    }
  }, []);

  const startScanner = useCallback(async (cameraIndex?: number) => {
    try {
      setError(null);
      hasScannedRef.current = false;
      
      // Stop any existing scanner first
      await stopScanner();
      
      // Get cameras
      const devices = await Html5Qrcode.getCameras();
      
      if (!devices || devices.length === 0) {
        setError('Nenhuma câmera encontrada no dispositivo');
        setHasPermission(false);
        return;
      }

      setHasPermission(true);
      setCameras(devices);

      // Prefer back camera
      let selectedIndex = cameraIndex ?? 0;
      if (cameraIndex === undefined) {
        const backIdx = devices.findIndex(d => 
          d.label.toLowerCase().includes('back') || 
          d.label.toLowerCase().includes('traseira') ||
          d.label.toLowerCase().includes('rear') ||
          d.label.toLowerCase().includes('environment')
        );
        if (backIdx >= 0) selectedIndex = backIdx;
      }
      setCurrentCameraIndex(selectedIndex);

      const cameraId = devices[selectedIndex].id;

      // Calculate responsive QR box size
      const containerSize = Math.min(window.innerWidth - 64, 300);
      const qrBoxSize = Math.floor(containerSize * 0.7);

      scannerRef.current = new Html5Qrcode('qr-reader');
      
      await scannerRef.current.start(
        cameraId,
        {
          fps: 15,
          qrbox: { width: qrBoxSize, height: qrBoxSize },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          if (!loading && !hasScannedRef.current) {
            hasScannedRef.current = true;
            // Vibrate on successful scan
            if ('vibrate' in navigator) {
              navigator.vibrate([100, 50, 100]);
            }
            onScan(decodedText);
          }
        },
        () => {
          // Silently ignore scan failures (expected during scanning)
        }
      );

      isScanningRef.current = true;
      setIsScanning(true);
    } catch (err: any) {
      console.error('Erro ao iniciar scanner:', err);
      
      if (err.message?.includes('Permission denied') || err.name === 'NotAllowedError') {
        setError('Permissão da câmera negada. Acesse as configurações do navegador para permitir o acesso à câmera.');
        setHasPermission(false);
      } else if (err.message?.includes('NotReadableError') || err.name === 'NotReadableError') {
        setError('Câmera em uso por outro aplicativo. Feche outros apps e tente novamente.');
        setHasPermission(false);
      } else {
        setError('Erro ao acessar a câmera. Verifique as permissões e tente novamente.');
      }
    }
  }, [loading, onScan, stopScanner]);

  useEffect(() => {
    // Small delay to ensure DOM element #qr-reader is mounted before initializing Html5Qrcode
    const timer = setTimeout(() => startScanner(), 300);

    return () => {
      clearTimeout(timer);
      stopScanner();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const retryScanner = async () => {
    setHasPermission(null);
    await startScanner();
  };

  const switchCamera = async () => {
    if (cameras.length <= 1) return;
    const nextIndex = (currentCameraIndex + 1) % cameras.length;
    await startScanner(nextIndex);
  };

  // Reset scan lock when loading finishes (ready for next scan)
  useEffect(() => {
    if (!loading) {
      hasScannedRef.current = false;
    }
  }, [loading]);

  if (hasPermission === false) {
    return (
      <div className="space-y-4">
        <div className="w-full aspect-square max-w-[320px] mx-auto bg-muted rounded-xl flex flex-col items-center justify-center p-6">
          <CameraOff className="h-14 w-14 text-muted-foreground mb-4" />
          <p className="text-center text-muted-foreground text-sm mb-2 font-medium">
            Câmera não disponível
          </p>
          <p className="text-center text-muted-foreground text-xs mb-6 px-2">
            {error || 'Permita o acesso à câmera nas configurações do navegador'}
          </p>
          <Button onClick={retryScanner} variant="outline" size="default" className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Tentar Novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="relative">
        <div 
          id="qr-reader" 
          className="w-full aspect-square max-w-[320px] mx-auto rounded-xl overflow-hidden bg-black"
          style={{ minHeight: '250px' }}
        />
        
        {loading && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center rounded-xl max-w-[320px] mx-auto">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white mb-3" />
            <p className="text-white text-sm font-medium">Processando...</p>
          </div>
        )}
        
        {/* Scanning frame overlay */}
        {isScanning && !loading && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center max-w-[320px] mx-auto">
            <div className="w-[65%] h-[65%] relative">
              {/* Corner markers */}
              <div className="absolute top-0 left-0 w-6 h-6 border-t-[3px] border-l-[3px] border-primary rounded-tl-sm" />
              <div className="absolute top-0 right-0 w-6 h-6 border-t-[3px] border-r-[3px] border-primary rounded-tr-sm" />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-[3px] border-l-[3px] border-primary rounded-bl-sm" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-[3px] border-r-[3px] border-primary rounded-br-sm" />
              
              {/* Scanning line animation */}
              <div className="absolute inset-x-2 top-2 h-0.5 bg-primary/80 animate-scan-line" />
            </div>
          </div>
        )}
      </div>

      {/* Camera controls */}
      {isScanning && cameras.length > 1 && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={switchCamera}
            className="gap-2 text-xs"
          >
            <SwitchCamera className="h-3.5 w-3.5" />
            Trocar Câmera
          </Button>
        </div>
      )}
    </div>
  );
};

export default QRScanner;
