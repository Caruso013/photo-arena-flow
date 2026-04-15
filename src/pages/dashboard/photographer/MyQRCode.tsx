import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Maximize2, Minimize2, RefreshCw, Shield, Info, QrCode } from 'lucide-react';
import { toast } from 'sonner';

const MyQRCode = () => {
  const { user, profile } = useAuth();
  const [qrValue, setQrValue] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [qrSize, setQrSize] = useState(248);
  const qrRef = useRef<HTMLDivElement>(null);

  // Recalculate QR size on window resize (for fullscreen mode)
  useEffect(() => {
    const updateSize = () => {
      if (fullscreen) {
        const maxW = window.innerWidth * 0.85;
        const maxH = window.innerHeight * 0.55;
        setQrSize(Math.min(maxW, maxH, 400));
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [fullscreen]);

  const generateOrFetchQR = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Sessão expirada. Faça login novamente.');
        return;
      }

      // Try the edge function first
      try {
        const { data, error } = await supabase.functions.invoke('generate-photographer-qr', {
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        });

        if (!error && data?.success && data?.qr_value) {
          setQrValue(data.qr_value);
          return;
        }
      } catch (edgeFnErr) {
        console.warn('Edge function falhou, usando fallback local:', edgeFnErr);
      }

      // Fallback: Try to fetch existing token from DB directly
      try {
        const { data: existingToken } = await supabase
          .from('photographer_qr_tokens')
          .select('token')
          .eq('photographer_id', user.id)
          .maybeSingle();

        if (existingToken?.token) {
          setQrValue(`STA-PHOTO:${existingToken.token}`);
          return;
        }
      } catch (dbErr) {
        console.warn('Consulta ao banco falhou:', dbErr);
      }

      // Final fallback: Generate QR locally using user ID
      const localQrValue = `STA-PHOTO:${user.id}`;
      setQrValue(localQrValue);
      toast.info('QR Code gerado localmente. Sincronize quando possível.');
    } catch (err: unknown) {
      console.error('Erro ao gerar QR:', err);
      // Even on error, generate a local fallback QR
      if (user?.id) {
        setQrValue(`STA-PHOTO:${user.id}`);
        toast.info('QR Code gerado localmente.');
      } else {
        toast.error('Erro ao gerar QR Code. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user && profile?.role === 'photographer') {
      generateOrFetchQR();
    } else {
      setLoading(false);
    }
  }, [user, profile, generateOrFetchQR]);

  const downloadQRCode = () => {
    if (!qrRef.current) return;

    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = 400;
      canvas.height = 400;
      
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, 400, 400);
      }

      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `qrcode-fotografo-${profile?.full_name?.replace(/\s+/g, '-') || 'sta'}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();

      toast.success('QR Code baixado com sucesso!');
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const toggleFullscreen = () => {
    setFullscreen(!fullscreen);
  };

  if (profile?.role !== 'photographer') {
    return (
      <div className="flex items-center justify-center min-h-[400px] px-4">
        <Alert>
          <AlertDescription>
            Esta página é exclusiva para fotógrafos.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (fullscreen && qrValue) {
    return (
      <div 
        className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center p-4 sm:p-8"
        onClick={toggleFullscreen}
      >
        <div className="mb-4 sm:mb-8">
          <QRCodeSVG
            value={qrValue}
            size={qrSize}
            level="H"
            includeMargin={true}
            bgColor="#ffffff"
            fgColor="#000000"
          />
        </div>
        <p className="text-xl sm:text-2xl font-bold text-black mb-1 sm:mb-2 text-center">{profile?.full_name}</p>
        <p className="text-gray-600 text-sm sm:text-base">Fotógrafo verificado ✓</p>
        <Button 
          variant="outline" 
          className="mt-4 sm:mt-8"
          onClick={(e) => {
            e.stopPropagation();
            toggleFullscreen();
          }}
        >
          <Minimize2 className="mr-2 h-4 w-4" />
          Fechar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
          <QrCode className="h-5 w-5 sm:h-6 sm:w-6" />
          Meu QR Code
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Use este QR Code para validar sua entrada em eventos
        </p>
      </div>

      <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
        {/* QR Code Card */}
        <Card className="border-2">
          <CardHeader className="text-center pb-2 sm:pb-4 px-4 sm:px-6">
            <CardTitle className="text-base sm:text-lg">QR Code de Identificação</CardTitle>
            <CardDescription>
              Exclusivo e intransferível
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center px-4 sm:px-6">
            {loading ? (
              <div className="w-full max-w-[280px] aspect-square flex items-center justify-center bg-muted rounded-lg">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : qrValue ? (
              <>
                <div 
                  ref={qrRef}
                  className="p-3 sm:p-4 bg-white rounded-xl shadow-sm border w-fit"
                >
                  <QRCodeSVG
                    value={qrValue}
                    size={Math.min(248, window.innerWidth - 120)}
                    level="H"
                    includeMargin={true}
                    bgColor="#ffffff"
                    fgColor="#000000"
                  />
                </div>

                <div className="mt-3 sm:mt-4 text-center">
                  <p className="font-semibold text-base sm:text-lg">{profile?.full_name}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground flex items-center justify-center gap-1">
                    <Shield className="h-3 w-3" />
                    Fotógrafo verificado
                  </p>
                </div>

                <div className="flex gap-2 mt-4 sm:mt-6 w-full">
                  <Button 
                    variant="outline" 
                    className="flex-1 text-sm"
                    onClick={downloadQRCode}
                  >
                    <Download className="mr-1.5 h-4 w-4" />
                    Baixar
                  </Button>
                  <Button 
                    variant="default" 
                    className="flex-1 text-sm"
                    onClick={toggleFullscreen}
                  >
                    <Maximize2 className="mr-1.5 h-4 w-4" />
                    Tela Cheia
                  </Button>
                </div>
              </>
            ) : (
              <div className="w-full max-w-[280px] aspect-square flex flex-col items-center justify-center bg-muted rounded-lg p-4">
                <p className="text-muted-foreground mb-4 text-center text-sm">Erro ao carregar QR Code</p>
                <Button onClick={generateOrFetchQR} size="sm">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Tentar Novamente
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructions Card */}
        <Card>
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Info className="h-5 w-5" />
              Como usar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-4 sm:px-6">
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                  1
                </div>
                <div>
                  <p className="font-medium text-sm sm:text-base">Chegue no evento</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Dirija-se ao ponto de credenciamento
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                  2
                </div>
                <div>
                  <p className="font-medium text-sm sm:text-base">Apresente o QR Code</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Mostre este QR Code ao mesário do evento
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                  3
                </div>
                <div>
                  <p className="font-medium text-sm sm:text-base">Aguarde validação</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    O mesário confirmará sua presença no sistema
                  </p>
                </div>
              </div>
            </div>

            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription className="text-xs sm:text-sm">
                <strong>Importante:</strong> Este QR Code é pessoal e intransferível. 
                Não compartilhe com outras pessoas.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MyQRCode;
