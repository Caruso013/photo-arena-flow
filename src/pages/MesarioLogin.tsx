import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, QrCode, Shield, Eye, EyeOff } from 'lucide-react';

const MesarioLogin = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('validate-mesario-credentials', {
        body: { username: username.trim().toLowerCase(), password }
      });

      if (fnError) throw fnError;

      if (!data.valid) {
        setError(data.error || 'Credenciais inválidas');
        return;
      }

      // Save session
      sessionStorage.setItem('mesario_session', JSON.stringify({
        id: data.mesario.id,
        mesario_name: data.mesario.full_name,
        organization_id: data.mesario.organization_id,
        organization: data.mesario.organization,
      }));

      navigate('/mesario/jogos');
    } catch (err: any) {
      console.error('Erro no login:', err);
      setError('Erro ao validar credenciais. Tente novamente.');
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
            <CardTitle className="text-lg">Login do Mesário</CardTitle>
            <CardDescription>
              Entre com seu usuário e senha fornecidos pela organização
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Usuário</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="seu.usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
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
                disabled={loading || !username.trim() || !password}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  'Entrar'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Info */}
        <div className="flex items-center gap-2 justify-center p-3 rounded-lg bg-muted/50">
          <Shield className="h-5 w-5 text-primary" />
          <span className="text-sm text-muted-foreground">Acesso seguro e temporário</span>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Não tem uma conta? Entre em contato com a organização do evento.
        </p>
      </div>
    </div>
  );
};

export default MesarioLogin;
