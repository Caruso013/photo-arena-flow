import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { QrCode, LogOut, Camera } from 'lucide-react';
import QRScanner from '@/components/mesario/QRScanner';
import PhotographerConfirmation from '@/components/mesario/PhotographerConfirmation';
import AttendanceResult from '@/components/mesario/AttendanceResult';

interface MesarioSession {
  id: string;
  mesario_name: string;
  expires_at: string;
  campaign: {
    id: string;
    title: string;
    event_date: string;
    location: string;
    cover_image_url?: string;
  };
  organization?: {
    id: string;
    name: string;
    logo_url?: string;
  };
}

interface PhotographerData {
  id: string;
  full_name: string;
  avatar_url?: string;
  approved: boolean;
  already_confirmed: boolean;
  confirmed_at?: string;
  application?: {
    applied_at: string;
    processed_at: string;
  };
}

type ViewState = 'scanner' | 'confirmation' | 'result';

const MesarioScanner = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<MesarioSession | null>(null);
  const [viewState, setViewState] = useState<ViewState>('scanner');
  const [photographerData, setPhotographerData] = useState<PhotographerData | null>(null);
  const [resultType, setResultType] = useState<'success' | 'error' | 'already_confirmed'>('success');
  const [resultMessage, setResultMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [scannerKey, setScannerKey] = useState(0);

  useEffect(() => {
    const sessionData = sessionStorage.getItem('mesario_session');
    if (!sessionData) {
      navigate('/mesario');
      return;
    }

    const parsed = JSON.parse(sessionData);
    
    // Verificar se expirou
    if (new Date(parsed.expires_at) < new Date()) {
      sessionStorage.removeItem('mesario_session');
      navigate('/mesario');
      return;
    }

    setSession(parsed);
  }, [navigate]);

  const handleLogout = () => {
    sessionStorage.removeItem('mesario_session');
    navigate('/mesario');
  };

  const handleQRScanned = useCallback(async (qrCode: string) => {
    if (!session || loading) return;
    
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('validate-photographer-qr', {
        body: {
          qr_token: qrCode,
          campaign_id: session.campaign.id,
          mesario_session_id: session.id
        }
      });

      if (error) throw error;

      if (!data.valid) {
        setResultType('error');
        setResultMessage(data.error || 'QR Code inválido');
        setViewState('result');
        return;
      }

      setPhotographerData({
        id: data.photographer.id,
        full_name: data.photographer.full_name,
        avatar_url: data.photographer.avatar_url,
        approved: data.approved,
        already_confirmed: data.already_confirmed,
        confirmed_at: data.confirmed_at,
        application: data.application
      });

      if (data.already_confirmed) {
        setResultType('already_confirmed');
        setResultMessage(`Presença já confirmada às ${new Date(data.confirmed_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`);
        setViewState('result');
      } else if (!data.approved) {
        setResultType('error');
        setResultMessage('Este fotógrafo NÃO está aprovado para participar deste evento');
        setViewState('result');
      } else {
        setViewState('confirmation');
      }
    } catch (err) {
      console.error('Erro ao validar QR:', err);
      setResultType('error');
      setResultMessage('Erro ao processar QR Code. Tente novamente.');
      setViewState('result');
    } finally {
      setLoading(false);
    }
  }, [session, loading]);

  const handleConfirmAttendance = async () => {
    if (!session || !photographerData) return;

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('confirm-attendance', {
        body: {
          photographer_id: photographerData.id,
          campaign_id: session.campaign.id,
          mesario_session_id: session.id
        }
      });

      if (error) throw error;

      if (!data.success) {
        setResultType('error');
        setResultMessage(data.error || 'Erro ao confirmar presença');
      } else {
        setResultType('success');
        setResultMessage(`Entrada às ${new Date(data.attendance.confirmed_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`);
      }
      setViewState('result');
    } catch (err) {
      console.error('Erro ao confirmar presença:', err);
      setResultType('error');
      setResultMessage('Erro ao registrar presença. Tente novamente.');
      setViewState('result');
    } finally {
      setLoading(false);
    }
  };

  const handleScanAnother = () => {
    setPhotographerData(null);
    setViewState('scanner');
    setScannerKey(prev => prev + 1);
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="container flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            <span className="font-semibold text-sm truncate max-w-[200px]">
              {session.campaign.title}
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-1" />
            Sair
          </Button>
        </div>
      </header>

      <main className="container px-4 py-6 max-w-lg mx-auto">
        {/* Event Info */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              {session.organization?.logo_url ? (
                <img 
                  src={session.organization.logo_url} 
                  alt={session.organization.name}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Camera className="h-6 w-6 text-primary" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{session.campaign.title}</p>
                <p className="text-sm text-muted-foreground">
                  Mesário: {session.mesario_name}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        {viewState === 'scanner' && (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Escanear QR Code
                </CardTitle>
              </CardHeader>
              <CardContent>
                <QRScanner 
                  key={scannerKey}
                  onScan={handleQRScanned} 
                  loading={loading}
                />
              </CardContent>
            </Card>

            <p className="text-center text-sm text-muted-foreground">
              Aponte a câmera para o QR Code do fotógrafo
            </p>
          </div>
        )}

        {viewState === 'confirmation' && photographerData && (
          <PhotographerConfirmation
            photographer={photographerData}
            onConfirm={handleConfirmAttendance}
            onCancel={handleScanAnother}
            loading={loading}
          />
        )}

        {viewState === 'result' && (
          <AttendanceResult
            type={resultType}
            message={resultMessage}
            photographerName={photographerData?.full_name}
            photographerAvatar={photographerData?.avatar_url}
            onScanAnother={handleScanAnother}
          />
        )}
      </main>
    </div>
  );
};

export default MesarioScanner;
