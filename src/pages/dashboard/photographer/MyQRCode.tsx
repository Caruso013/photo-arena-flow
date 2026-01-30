import { useState, useEffect, useRef } from 'react';
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
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user && profile?.role === 'photographer') {
      generateOrFetchQR();
    }
  }, [user, profile]);

  const generateOrFetchQR = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Sessão expirada. Faça login novamente.');
        return;
      }

      const { data, error } = await supabase.functions.invoke('generate-photographer-qr', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      if (data.success) {
        setQrValue(data.qr_value);
      } else {
        throw new Error(data.error || 'Erro ao gerar QR Code');
      }
    } catch (err: any) {
      console.error('Erro ao gerar QR:', err);
      toast.error('Erro ao gerar QR Code. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

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
      <div className="flex items-center justify-center min-h-[400px]">
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
        className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center p-8"
        onClick={toggleFullscreen}
      >
        <div className="mb-8">
          <QRCodeSVG
            value={qrValue}
            size={Math.min(window.innerWidth - 64, window.innerHeight - 200, 400)}
            level="H"
            includeMargin={true}
            bgColor="#ffffff"
            fgColor="#000000"
          />
        </div>
        <p className="text-2xl font-bold text-black mb-2">{profile?.full_name}</p>
        <p className="text-gray-600">Fotógrafo verificado ✓</p>
        <Button 
          variant="outline" 
          className="mt-8"
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <QrCode className="h-6 w-6" />
          Meu QR Code
        </h1>
        <p className="text-muted-foreground">
          Use este QR Code para validar sua entrada em eventos
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* QR Code Card */}
        <Card className="border-2">
          <CardHeader className="text-center pb-4">
            <CardTitle>QR Code de Identificação</CardTitle>
            <CardDescription>
              Exclusivo e intransferível
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            {loading ? (
              <div className="w-[280px] h-[280px] flex items-center justify-center bg-muted rounded-lg">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : qrValue ? (
              <>
                <div 
                  ref={qrRef}
                  className="p-4 bg-white rounded-xl shadow-sm border"
                >
                  <QRCodeSVG
                    value={qrValue}
                    size={248}
                    level="H"
                    includeMargin={true}
                    bgColor="#ffffff"
                    fgColor="#000000"
                  />
                </div>

                <div className="mt-4 text-center">
                  <p className="font-semibold text-lg">{profile?.full_name}</p>
                  <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                    <Shield className="h-3 w-3" />
                    Fotógrafo verificado
                  </p>
                </div>

                <div className="flex gap-2 mt-6 w-full">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={downloadQRCode}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Baixar
                  </Button>
                  <Button 
                    variant="default" 
                    className="flex-1"
                    onClick={toggleFullscreen}
                  >
                    <Maximize2 className="mr-2 h-4 w-4" />
                    Tela Cheia
                  </Button>
                </div>
              </>
            ) : (
              <div className="w-[280px] h-[280px] flex flex-col items-center justify-center bg-muted rounded-lg">
                <p className="text-muted-foreground mb-4">Erro ao carregar QR Code</p>
                <Button onClick={generateOrFetchQR}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Tentar Novamente
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructions Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Como usar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  1
                </div>
                <div>
                  <p className="font-medium">Chegue no evento</p>
                  <p className="text-sm text-muted-foreground">
                    Dirija-se ao ponto de credenciamento
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  2
                </div>
                <div>
                  <p className="font-medium">Apresente o QR Code</p>
                  <p className="text-sm text-muted-foreground">
                    Mostre este QR Code ao mesário do evento
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  3
                </div>
                <div>
                  <p className="font-medium">Aguarde validação</p>
                  <p className="text-sm text-muted-foreground">
                    O mesário confirmará sua presença no sistema
                  </p>
                </div>
              </div>
            </div>

            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
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
