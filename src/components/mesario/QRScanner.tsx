import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Camera, CameraOff, AlertCircle } from 'lucide-react';

interface QRScannerProps {
  onScan: (data: string) => void;
  loading?: boolean;
}

const QRScanner = ({ onScan, loading = false }: QRScannerProps) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    startScanner();

    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = async () => {
    try {
      setError(null);
      
      // Verificar permissão da câmera
      const devices = await Html5Qrcode.getCameras();
      
      if (devices && devices.length === 0) {
        setError('Nenhuma câmera encontrada no dispositivo');
        setHasPermission(false);
        return;
      }

      setHasPermission(true);

      // Preferir câmera traseira
      const backCamera = devices.find(d => 
        d.label.toLowerCase().includes('back') || 
        d.label.toLowerCase().includes('traseira') ||
        d.label.toLowerCase().includes('rear')
      );

      const cameraId = backCamera?.id || devices[0].id;

      scannerRef.current = new Html5Qrcode('qr-reader');
      
      await scannerRef.current.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        (decodedText) => {
          if (!loading) {
            // Vibrar se disponível
            if ('vibrate' in navigator) {
              navigator.vibrate(100);
            }
            onScan(decodedText);
          }
        },
        () => {
          // Silently ignore scan errors
        }
      );

      setIsScanning(true);
    } catch (err: any) {
      console.error('Erro ao iniciar scanner:', err);
      
      if (err.message?.includes('Permission denied') || err.name === 'NotAllowedError') {
        setError('Permissão da câmera negada. Por favor, permita o acesso à câmera.');
        setHasPermission(false);
      } else {
        setError('Erro ao acessar a câmera. Tente novamente.');
      }
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
        setIsScanning(false);
      } catch (err) {
        console.error('Erro ao parar scanner:', err);
      }
    }
  };

  const retryScanner = async () => {
    await stopScanner();
    await startScanner();
  };

  if (hasPermission === false) {
    return (
      <div className="space-y-4">
        <div className="aspect-square max-w-[300px] mx-auto bg-muted rounded-lg flex flex-col items-center justify-center p-6">
          <CameraOff className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-center text-muted-foreground text-sm mb-4">
            {error || 'Câmera não disponível'}
          </p>
          <Button onClick={retryScanner} variant="outline" size="sm">
            <Camera className="h-4 w-4 mr-2" />
            Tentar Novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="relative">
        <div 
          id="qr-reader" 
          className="aspect-square max-w-[300px] mx-auto rounded-lg overflow-hidden bg-black"
        />
        
        {loading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
          </div>
        )}
        
        {/* Scanning overlay */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center max-w-[300px] mx-auto">
          <div className="w-[200px] h-[200px] border-2 border-primary rounded-lg relative">
            <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-primary rounded-tl" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-primary rounded-tr" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-primary rounded-bl" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-primary rounded-br" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;
