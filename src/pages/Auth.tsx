import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Camera, ArrowLeft, AlertCircle, CheckCircle2, Mail, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { signUpSchema, signInSchema } from '@/lib/validation';

const Auth = () => {
  const { signIn, signUp, user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup form state
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupRole, setSignupRole] = useState<'user' | 'photographer'>('user');
  
  // Photographer-specific fields
  const [photographerExperience, setPhotographerExperience] = useState('');
  const [photographerEquipment, setPhotographerEquipment] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  useEffect(() => {
    // Evita loop: só redireciona quando o perfil já está disponível
    if (user && profile) {
      navigate('/dashboard');
    }
  }, [user, profile, navigate]);

  // Detectar parâmetro mode=forgot na URL
  useEffect(() => {
    const mode = searchParams.get('mode');
    if (mode === 'forgot') {
      setShowForgotPassword(true);
    }
  }, [searchParams]);

  // Circuit breaker: bloquear tentativas rápidas demais
  const [lastAttempt, setLastAttempt] = useState<number>(0);
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Circuit breaker: se muitas falhas consecutivas, forçar espera
    const now = Date.now();
    const cooldownMs = consecutiveFailures >= 3 ? 10000 : consecutiveFailures >= 2 ? 5000 : 1500;
    const timeSinceLast = now - lastAttempt;
    
    if (timeSinceLast < cooldownMs) {
      const waitSec = Math.ceil((cooldownMs - timeSinceLast) / 1000);
      setErrors({ general: `Aguarde ${waitSec} segundo(s) antes de tentar novamente.` });
      return;
    }
    
    // Validar com zod
    const validation = signInSchema.safeParse({ 
      email: loginEmail, 
      password: loginPassword 
    });
    
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }
    
    setIsLoading(true);
    setLastAttempt(Date.now());
    const { error } = await signIn(loginEmail, loginPassword);
    setIsLoading(false);
    
    if (error) {
      setConsecutiveFailures(prev => prev + 1);
      
      // Detectar erro de saturação do banco
      if (error.message.includes('Database error') || 
          error.message.includes('querying schema') ||
          error.message.includes('connection') ||
          error.message.includes('SUPERUSER') ||
          error.message.includes('500')) {
        setErrors({ general: 'Servidor temporariamente sobrecarregado. Aguarde 30 segundos e tente novamente.' });
      } else if (error.message.includes('Invalid login credentials') || 
          error.message.includes('invalid') ||
          error.message.includes('Invalid email or password')) {
        setConsecutiveFailures(0); // reset - não é erro de infra
        setErrors({ general: 'Email ou senha incorretos. Verifique seus dados e tente novamente.' });
      } else if (error.message.includes('Email not confirmed')) {
        setConsecutiveFailures(0);
        setErrors({ general: 'Confirme seu email antes de fazer login. Verifique sua caixa de entrada e spam.' });
      } else {
        setErrors({ general: error.message });
      }
    } else {
      setConsecutiveFailures(0);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    // Validar com zod
    const validation = signUpSchema.safeParse({
      email: signupEmail,
      password: signupPassword,
      fullName: signupName
    });
    
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0]) {
          const field = err.path[0] === 'fullName' ? 'name' : err.path[0];
          fieldErrors[field as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    // Validações específicas para fotógrafos
    if (signupRole === 'photographer') {
      if (!acceptedTerms) {
        setErrors({ terms: 'Você precisa aceitar os termos da plataforma' });
        toast({
          title: "Termos obrigatórios",
          description: "Você precisa aceitar os termos da plataforma para se cadastrar como fotógrafo.",
          variant: "destructive",
        });
        return;
      }
      
      if (!photographerExperience || parseInt(photographerExperience) < 0) {
        setErrors({ experience: 'Informe seus anos de experiência' });
        return;
      }
    }
    
    setIsLoading(true);
    
    // Se for fotógrafo, criar como 'user' e depois criar a aplicação
    const roleToCreate = signupRole === 'photographer' ? 'user' : signupRole;
    
    const { error } = await signUp(signupEmail, signupPassword, signupName, roleToCreate);
    
    if (!error && signupRole === 'photographer') {
      // Aguardar um pouco para o usuário ser criado
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Buscar o usuário recém-criado
      const { data: userData } = await supabase.auth.getUser();
      
      if (userData?.user) {
        // Criar a aplicação de fotógrafo
        const { error: appError } = await supabase
          .from('photographer_applications')
          .insert({
            user_id: userData.user.id,
            message: `Cadastro via formulário. Experiência: ${photographerExperience} anos. Equipamento: ${photographerEquipment || 'Não informado'}`,
            experience_years: parseInt(photographerExperience) || 0,
            equipment: photographerEquipment || null,
            status: 'pending'
          });
        
        if (appError) {
          console.error('Erro ao criar aplicação:', appError);
        } else {
          toast({
            title: "Cadastro enviado!",
            description: "Sua solicitação para fotógrafo foi enviada. Você será notificado após a análise.",
          });
        }
      }
    }
    
    setIsLoading(false);
    
    if (!error) {
      setSignupEmail('');
      setSignupPassword('');
      setSignupName('');
      setSignupRole('user');
      setPhotographerExperience('');
      setPhotographerEquipment('');
      setAcceptedTerms(false);
    } else {
      // Traduzir erros do Supabase
      if (error.message.includes('already registered') || 
          error.message.includes('already exists') ||
          error.message.includes('User already registered')) {
        setErrors({ email: 'Este email já está cadastrado. Tente fazer login ou use outro email.' });
      } else if (error.message.includes('Invalid email')) {
        setErrors({ email: 'Email inválido. Verifique e tente novamente.' });
      } else if (error.message.includes('password') || error.message.includes('weak')) {
        setErrors({ password: 'Senha muito fraca. Use pelo menos 6 caracteres com letras e números.' });
      } else {
        setErrors({ general: error.message });
      }
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Usar nossa Edge Function com Resend em vez do email padrão do Supabase
      const response = await fetch(
        'https://gtpqppvyjrnnuhlsbpqd.supabase.co/functions/v1/send-password-reset-email',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: forgotPasswordEmail.trim(),
            redirectUrl: `${window.location.origin}/auth/reset-password`,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao enviar email');
      }
      
      toast({
        title: "Email enviado! 📧",
        description: "Verifique sua caixa de entrada para redefinir sua senha.",
      });
      
      setShowForgotPassword(false);
      setForgotPasswordEmail('');
    } catch (error: any) {
      console.error('Erro ao enviar email de reset:', error);
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
                    className="flex-1 h-11 sm:h-12 text-sm min-h-[44px]"
                    onClick={() => setShowForgotPassword(false)}
                    disabled={isLoading}
                  >
                    Voltar
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1 h-11 sm:h-12 text-sm min-h-[44px]" 
                    disabled={isLoading}
                  >
                    {isLoading ? "Enviando..." : "Enviar Email"}
                  </Button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleLogin} className="space-y-3 sm:space-y-4">
                    {errors.general && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-sm">{errors.general}</AlertDescription>
                      </Alert>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="seu@email.com"
                        value={loginEmail}
                        onChange={(e) => {
                          setLoginEmail(e.target.value);
                          setErrors({ ...errors, email: '', general: '' });
                        }}
                        required
                        className={`h-11 sm:h-12 text-sm ${errors.email ? 'border-destructive' : ''}`}
                      />
                      {errors.email && (
                        <p className="text-xs text-destructive flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.email}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password" className="text-sm">Senha *</Label>
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
                        onChange={(e) => {
                          setLoginPassword(e.target.value);
                          setErrors({ ...errors, password: '', general: '' });
                        }}
                        required
                        className={`h-11 sm:h-12 text-sm ${errors.password ? 'border-destructive' : ''}`}
                      />
                      {errors.password && (
                        <p className="text-xs text-destructive flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.password}
                        </p>
                      )}
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full h-11 sm:h-12 text-sm font-medium min-h-[44px]" 
                      disabled={isLoading}
                    >
                      {isLoading ? "Entrando..." : "Entrar"}
                    </Button>
                  </form>
                )}
              </TabsContent>

              <TabsContent value="signup" className="space-y-3 sm:space-y-4 mt-4">
                <form onSubmit={handleSignup} className="space-y-3 sm:space-y-4">
                  {errors.general && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-sm">{errors.general}</AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="text-sm">Nome completo *</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Seu nome completo"
                      value={signupName}
                      onChange={(e) => {
                        setSignupName(e.target.value);
                        setErrors({ ...errors, name: '' });
                      }}
                      required
                      className={`h-11 sm:h-12 text-sm ${errors.name ? 'border-destructive' : ''}`}
                    />
                    {errors.name && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.name}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-sm">Email *</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={signupEmail}
                      onChange={(e) => {
                        setSignupEmail(e.target.value);
                        setErrors({ ...errors, email: '' });
                      }}
                      required
                      className={`h-11 sm:h-12 text-sm ${errors.email ? 'border-destructive' : ''}`}
                    />
                    {errors.email && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.email}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-sm">Senha *</Label>
                    <PasswordInput
                      id="signup-password"
                      placeholder="Mínimo 6 caracteres"
                      value={signupPassword}
                      onValueChange={(value) => {
                        setSignupPassword(value);
                        setErrors({ ...errors, password: '' });
                      }}
                      required
                      className={`h-11 sm:h-12 text-sm ${errors.password ? 'border-destructive' : ''}`}
                      minLength={6}
                      showStrength={true}
                    />
                    {errors.password && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.password}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role" className="text-sm">Tipo de conta *</Label>
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

                  {/* Campos específicos para fotógrafos */}
                  {signupRole === 'photographer' && (
                    <>
                      <Alert className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
                        <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        <AlertDescription className="text-xs text-amber-700 dark:text-amber-300">
                          <strong>Termos para Fotógrafos:</strong>
                          <ul className="mt-1 space-y-0.5 list-disc list-inside">
                            <li>Taxa da plataforma: 9% sobre cada venda</li>
                            <li>Você recebe 91% do valor de cada foto vendida</li>
                            <li>Seu perfil será liberado após análise da equipe</li>
                            <li>Prazo de análise: até 48 horas úteis</li>
                          </ul>
                        </AlertDescription>
                      </Alert>
                      
                      <div className="space-y-2">
                        <Label htmlFor="experience" className="text-sm">Anos de experiência *</Label>
                        <Input
                          id="experience"
                          type="number"
                          min="0"
                          max="50"
                          placeholder="Ex: 3"
                          value={photographerExperience}
                          onChange={(e) => {
                            setPhotographerExperience(e.target.value);
                            setErrors({ ...errors, experience: '' });
                          }}
                          required
                          className={`h-11 sm:h-12 text-sm ${errors.experience ? 'border-destructive' : ''}`}
                        />
                        {errors.experience && (
                          <p className="text-xs text-destructive flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {errors.experience}
                          </p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="equipment" className="text-sm">Equipamento fotográfico</Label>
                        <Textarea
                          id="equipment"
                          placeholder="Ex: Canon 5D Mark IV, lentes 24-70mm e 70-200mm..."
                          value={photographerEquipment}
                          onChange={(e) => setPhotographerEquipment(e.target.value)}
                          className="text-sm min-h-[80px]"
                          rows={2}
                        />
                        <p className="text-xs text-muted-foreground">Opcional, mas ajuda na aprovação</p>
                      </div>
                      
                      <div className="flex items-start space-x-3 p-3 bg-muted/50 rounded-lg border">
                        <Checkbox
                          id="terms"
                          checked={acceptedTerms}
                          onCheckedChange={(checked) => {
                            setAcceptedTerms(checked as boolean);
                            setErrors({ ...errors, terms: '' });
                          }}
                          className="mt-0.5"
                        />
                        <div className="space-y-1">
                          <Label htmlFor="terms" className="text-sm font-medium cursor-pointer">
                            Li e aceito os termos da plataforma *
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Aceito a taxa de 9% da plataforma e que meu perfil será analisado antes de ser liberado.
                          </p>
                        </div>
                      </div>
                      {errors.terms && (
                        <p className="text-xs text-destructive flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.terms}
                        </p>
                      )}
                    </>
                  )}
                  
                  <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
                    <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <AlertDescription className="text-xs text-blue-700 dark:text-blue-300">
                      {signupRole === 'photographer' 
                        ? 'Após confirmar seu email, sua solicitação será analisada pela nossa equipe.'
                        : 'Você receberá um email de confirmação. Verifique sua caixa de entrada e pasta de spam antes de fazer login.'}
                    </AlertDescription>
                  </Alert>
                  <Button 
                    type="submit" 
                    className="w-full h-11 sm:h-12 text-sm font-medium min-h-[44px]" 
                    disabled={isLoading}
                  >
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