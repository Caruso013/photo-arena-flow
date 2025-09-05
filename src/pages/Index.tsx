import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Camera, Users, Shield, Trophy, Star, ArrowRight, LogIn } from 'lucide-react';
import { Link } from 'react-router-dom';

const Index = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                PhotoArena
              </span>
            </div>
            <div className="flex items-center gap-4">
              {user ? (
                <Link to="/dashboard">
                  <Button className="gap-2">
                    <ArrowRight className="h-4 w-4" />
                    Dashboard
                  </Button>
                </Link>
              ) : (
                <Link to="/auth">
                  <Button className="gap-2">
                    <LogIn className="h-4 w-4" />
                    Entrar / Cadastrar
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-24 px-4">
        <div className="container mx-auto text-center">
          <Badge variant="secondary" className="mb-4">
            Plataforma de Fotos Esportivas
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-primary bg-clip-text text-transparent">
            Capture. Venda. Reviva.
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            A plataforma definitiva para fotógrafos esportivos venderem suas fotos e 
            para atletas e fãs comprarem memórias inesquecíveis dos seus eventos favoritos.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {!user && (
              <Link to="/auth">
                <Button size="lg" className="gap-2">
                  <Camera className="h-5 w-5" />
                  Começar Agora
                </Button>
              </Link>
            )}
            <Button variant="outline" size="lg" className="gap-2">
              <Trophy className="h-5 w-5" />
              Ver Eventos
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Para Todos os Perfis</h2>
            <p className="text-lg text-muted-foreground">
              Uma plataforma completa que atende fotógrafos, usuários e administradores
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Fotógrafos */}
            <Card className="text-center hover:shadow-elegant transition-shadow">
              <CardHeader>
                <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10">
                  <Camera className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>Para Fotógrafos</CardTitle>
                <CardDescription>
                  Venda suas fotos com facilidade e gerencie seus eventos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li>• Upload de fotos com marca d'água automática</li>
                  <li>• Dashboard com relatórios de vendas</li>
                  <li>• Gestão de eventos e campanhas</li>
                  <li>• Pagamentos via Stripe integrado</li>
                </ul>
              </CardContent>
            </Card>

            {/* Usuários */}
            <Card className="text-center hover:shadow-elegant transition-shadow">
              <CardHeader>
                <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>Para Usuários</CardTitle>
                <CardDescription>
                  Encontre e compre fotos dos seus eventos favoritos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li>• Navegação intuitiva por eventos</li>
                  <li>• Visualização com marca d'água</li>
                  <li>• Compra segura com Stripe</li>
                  <li>• Download de fotos em alta qualidade</li>
                </ul>
              </CardContent>
            </Card>

            {/* Administradores */}
            <Card className="text-center hover:shadow-elegant transition-shadow">
              <CardHeader>
                <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>Para Administradores</CardTitle>
                <CardDescription>
                  Controle total sobre a plataforma e usuários
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li>• Gestão completa de usuários</li>
                  <li>• Supervisão de todos os eventos</li>
                  <li>• Relatórios de vendas globais</li>
                  <li>• Controle de permissões e roles</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 px-4 bg-card/20">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Por que escolher a PhotoArena?</h2>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10 w-fit">
                <Star className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Mobile First</h3>
              <p className="text-sm text-muted-foreground">
                Interface otimizada para dispositivos móveis
              </p>
            </div>
            
            <div className="text-center">
              <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10 w-fit">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Seguro</h3>
              <p className="text-sm text-muted-foreground">
                Pagamentos seguros e proteção contra pirataria
              </p>
            </div>
            
            <div className="text-center">
              <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10 w-fit">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Fácil de Usar</h3>
              <p className="text-sm text-muted-foreground">
                Interface intuitiva para todos os perfis
              </p>
            </div>
            
            <div className="text-center">
              <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10 w-fit">
                <Trophy className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Especializado</h3>
              <p className="text-sm text-muted-foreground">
                Feito especialmente para eventos esportivos
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!user && (
        <section className="py-16 px-4">
          <div className="container mx-auto text-center">
            <Card className="max-w-2xl mx-auto bg-gradient-primary text-white border-0">
              <CardContent className="p-8">
                <h2 className="text-3xl font-bold mb-4">
                  Pronto para começar?
                </h2>
                <p className="text-lg opacity-90 mb-6">
                  Cadastre-se agora e comece a vender ou comprar fotos esportivas
                </p>
                <Link to="/auth">
                  <Button size="lg" variant="secondary" className="gap-2">
                    <Camera className="h-5 w-5" />
                    Criar Conta Grátis
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t bg-card/50 py-8">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Camera className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              PhotoArena
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2024 PhotoArena. A plataforma definitiva para fotos esportivas.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
