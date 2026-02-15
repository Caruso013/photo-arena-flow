import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, QrCode, Shield, Clock } from 'lucide-react';

const MesarioLogin = () => {
  const navigate = useNavigate();
  const [accessCode, setAccessCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('validate-mesario-login', {
        body: { access_code: accessCode.toUpperCase().trim() }
      });

      if (fnError) throw fnError;

      if (!data.valid) {
        setError(data.error || 'Código inválido');
        return;
      }

      // Salvar sessão no sessionStorage
      sessionStorage.setItem('mesario_session', JSON.stringify({
        id: data.session.id,
        mesario_name: data.session.mesario_name,
        expires_at: data.session.expires_at,
        campaign: data.session.campaign,
        organization: data.session.organization,
        approved_photographers: data.approved_photographers,
        confirmed_attendances: data.confirmed_attendances
      }));

      navigate('/mesario/scanner');
    } catch (err: any) {
      console.error('Erro no login:', err);
      setError('Erro ao validar código. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <QrCode className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Validação de Fotógrafos</h1>
          <p className="text-muted-foreground">
            Acesso exclusivo para mesários de eventos
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-2">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-lg">Código de Acesso</CardTitle>
            <CardDescription>
              Insira o código de 6 dígitos fornecido pela organização
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="access_code">Código</Label>
                <Input
                  id="access_code"
                  type="text"
                  placeholder="Ex: A3X7K9"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="text-center text-2xl font-mono tracking-[0.5em] uppercase"
                  autoComplete="off"
                  autoFocus
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                className="w-full" 
                size="lg"
                disabled={loading || accessCode.length !== 6}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Validando...
                  </>
                ) : (
                  'Entrar'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Info Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
            <Shield className="h-5 w-5 text-primary" />
            <span className="text-sm text-muted-foreground">Acesso seguro</span>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
            <Clock className="h-5 w-5 text-primary" />
            <span className="text-sm text-muted-foreground">Válido por 4 dias</span>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          Não tem um código? Entre em contato com a organização do evento.
        </p>
      </div>
    </div>
  );
};

export default MesarioLogin;
