import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

const Auth = () => {
  const { signIn, signUp, user, loading } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup form state
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupRole, setSignupRole] = useState<'user' | 'photographer'>('user');

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações
    if (!loginEmail.trim()) {
      toast({
        title: "Email obrigatório",
        description: "Por favor, informe seu email.",
        variant: "destructive",
      });
      return;
    }
    
    if (!loginPassword) {
      toast({
        title: "Senha obrigatória",
        description: "Por favor, informe sua senha.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setIsLoading(false);
    
    // NÃO redirecionar aqui - deixar o useEffect fazer isso
    // O useEffect já redireciona quando user muda
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações
    if (!signupName.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, informe seu nome completo.",
        variant: "destructive",
      });
      return;
    }
    
    if (signupName.trim().length < 3) {
      toast({
        title: "Nome muito curto",
        description: "O nome deve ter pelo menos 3 caracteres.",
        variant: "destructive",
      });
      return;
    }
    
    if (!signupEmail.trim()) {
      toast({
        title: "Email obrigatório",
        description: "Por favor, informe seu email.",
        variant: "destructive",
      });
      return;
    }
    
    if (signupPassword.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    const { error } = await signUp(signupEmail, signupPassword, signupName, signupRole);
    setIsLoading(false);
    
    // Limpar formulário apenas se não houver erro
    if (!error) {
      setSignupEmail('');
      setSignupPassword('');
      setSignupName('');
      setSignupRole('user');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      
      if (error) throw error;
      
      toast({
        title: "Email enviado!",
        description: "Verifique sua caixa de entrada para redefinir sua senha.",
      });
      
      setShowForgotPassword(false);
      setForgotPasswordEmail('');
    } catch (error: any) {
      toast({
        title: "Erro ao enviar email",
        description: error.message || "Não foi possível enviar o email de recuperação.",
        variant: "destructive",
      });
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
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-6 sm:mb-8 justify-center">
          <img 
            src="/lovable-uploads/6fdfc5d2-230c-4142-bf7c-3a326e5e45a8.png" 
            alt="STA Fotos Logo" 
            className="h-8 sm:h-10 w-auto"
          />
        </div>

        <Card className="backdrop-blur-sm bg-card/80 border-border/50 shadow-elegant">
          <CardHeader className="text-center p-4 sm:p-6">
            <CardTitle className="text-xl sm:text-2xl">Bem-vindo</CardTitle>
            <CardDescription className="text-sm">
              Entre ou cadastre-se para acessar a plataforma
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-10 sm:h-11">
                <TabsTrigger value="login" className="text-sm">Entrar</TabsTrigger>
                <TabsTrigger value="signup" className="text-sm">Cadastrar</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-3 sm:space-y-4 mt-4">
                {showForgotPassword ? (
                  <form onSubmit={handleForgotPassword} className="space-y-3 sm:space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="forgot-email" className="text-sm">Email</Label>
                      <Input
                        id="forgot-email"
                        type="email"
                        placeholder="seu@email.com"
                        value={forgotPasswordEmail}
                        onChange={(e) => setForgotPasswordEmail(e.target.value)}
                        required
                        className="h-11 sm:h-12 text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        Enviaremos um link para redefinir sua senha
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="flex-1 h-11 sm:h-12 text-sm"
                        onClick={() => setShowForgotPassword(false)}
                        disabled={isLoading}
                      >
                        Voltar
                      </Button>
                      <Button type="submit" className="flex-1 h-11 sm:h-12 text-sm" disabled={isLoading}>
                        {isLoading ? "Enviando..." : "Enviar Email"}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleLogin} className="space-y-3 sm:space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="seu@email.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                        className="h-11 sm:h-12 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password" className="text-sm">Senha</Label>
                        <button
                          type="button"
                          onClick={() => setShowForgotPassword(true)}
                          className="text-xs text-primary hover:underline"
                        >
                          Esqueceu a senha?
                        </button>
                      </div>
                      <Input
                        id="password"
                        type="password"
                        placeholder="********"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                        className="h-11 sm:h-12 text-sm"
                      />
                    </div>
                    <Button type="submit" className="w-full h-11 sm:h-12 text-sm font-medium" disabled={isLoading}>
                      {isLoading ? "Entrando..." : "Entrar"}
                    </Button>
                  </form>
                )}
              </TabsContent>

              <TabsContent value="signup" className="space-y-3 sm:space-y-4 mt-4">
                <form onSubmit={handleSignup} className="space-y-3 sm:space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="text-sm">Nome completo</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Seu nome"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      required
                      className="h-11 sm:h-12 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-sm">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required
                      className="h-11 sm:h-12 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-sm">Senha</Label>
                    <PasswordInput
                      id="signup-password"
                      placeholder="********"
                      value={signupPassword}
                      onValueChange={setSignupPassword}
                      required
                      className="h-11 sm:h-12 text-sm"
                      minLength={6}
                      showStrength={true}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role" className="text-sm">Tipo de conta</Label>
                    <Select value={signupRole} onValueChange={(value: 'user' | 'photographer') => setSignupRole(value)}>
                      <SelectTrigger className="h-11 sm:h-12 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user" className="text-sm">
                          <div className="flex flex-col">
                            <span className="font-medium">👤 Usuário</span>
                            <span className="text-xs text-muted-foreground">Comprar e baixar fotos dos eventos</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="photographer" className="text-sm">
                          <div className="flex flex-col">
                            <span className="font-medium">📸 Fotógrafo</span>
                            <span className="text-xs text-muted-foreground">Criar eventos e vender fotos</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {signupRole === 'photographer' 
                        ? 'Como fotógrafo, você poderá criar eventos e vender suas fotos.' 
                        : 'Como usuário, você poderá comprar fotos dos eventos.'}
                    </p>
                  </div>
                  <Button type="submit" className="w-full h-11 sm:h-12 text-sm font-medium" disabled={isLoading}>
                    {isLoading ? "Cadastrando..." : "Criar conta"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="mt-6 text-center">
              <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-4 w-4" />
                Voltar ao início
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;