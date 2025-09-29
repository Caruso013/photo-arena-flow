import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, ArrowLeft, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

const AdminLogin = () => {
  const { signIn, user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    console.log('AdminLogin - User:', user?.email, 'Profile:', profile?.role);
    
    if (user && profile) {
      if (profile.role === 'admin') {
        console.log('Admin access granted, redirecting to dashboard');
        navigate('/dashboard');
      } else {
        console.log('Access denied - User role:', profile.role);
        setError('Acesso negado. Esta área é restrita a administradores.');
      }
    }
  }, [user, profile, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      console.log('Attempting login with:', email);
      const result = await signIn(email, password);
      
      if (result?.error) {
        console.error('Login failed:', result.error);
        setError('Email ou senha incorretos. Verifique suas credenciais.');
      } else {
        console.log('Login successful, waiting for profile...');
      }
    } catch (err) {
      console.error('Login exception:', err);
      setError('Erro interno. Tente novamente mais tarde.');
    } finally {
      setIsLoading(false);
    }
  };

  // Função de teste para login direto com credenciais do admin
  const testAdminLogin = async () => {
    setEmail('pedromkk13@gmail.com');
    setPassword('');
    setError('');
    
    // Simular preenchimento para teste
    const testPassword = prompt('Digite a senha do admin para teste:');
    if (!testPassword) return;
    
    setIsLoading(true);
    
    try {
      console.log('Testing admin login...');
      const result = await signIn('pedromkk13@gmail.com', testPassword);
      
      if (result?.error) {
        setError(`Erro no teste: ${result.error.message}`);
      }
    } catch (err: any) {
      setError(`Erro no teste: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-6 md:mb-8 justify-center">
          <img 
            src="/lovable-uploads/6fdfc5d2-230c-4142-bf7c-3a326e5e45a8.png" 
            alt="STA Fotos Logo" 
            className="h-8 md:h-10 w-auto"
          />
        </div>

        {/* Back Button */}
        <div className="mb-4">
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              Voltar ao site
            </Button>
          </Link>
        </div>

        <Card className="backdrop-blur-sm bg-card/80 border-border/50 shadow-elegant">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-2 p-3 rounded-full bg-primary/10 w-fit">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-xl md:text-2xl font-bold">Área Administrativa</CardTitle>
            <CardDescription className="text-sm md:text-base">
              Acesso restrito para administradores
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-email" className="text-sm font-medium">E-mail Administrativo</Label>
                <Input
                  id="admin-email"
                  type="email"
                  placeholder="admin@stafotos.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="text-base"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="admin-password" className="text-sm font-medium">Senha</Label>
                <Input
                  id="admin-password"
                  type="password"
                  placeholder="Sua senha administrativa"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="text-base"
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 text-base font-medium"
                disabled={isLoading}
              >
                {isLoading ? 'Verificando...' : 'Entrar como Admin'}
              </Button>
              
              {/* Botão de teste temporário */}
              <Button 
                type="button"
                onClick={testAdminLogin}
                variant="outline"
                className="w-full h-10 text-sm"
                disabled={isLoading}
              >
                🧪 Teste Login Admin (Pedro)
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Não é administrador?
              </p>
              <Link to="/auth">
                <Button variant="outline" size="sm" className="text-sm">
                  Fazer login normal
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md">
          <div className="flex items-start gap-2">
            <Shield className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                Área Segura
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                Todas as tentativas de acesso são registradas e monitoradas.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;