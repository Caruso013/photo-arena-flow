import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Camera, Users, Shield, Trophy, Star, ArrowRight, LogIn, Search, User, MapPin, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Campaign {
  id: string;
  title: string;
  description: string;
  event_date: string;
  location: string;
  cover_image_url: string;
  photographer: {
    full_name: string;
  };
}

const Index = () => {
  const { user, profile } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeaturedCampaigns();
  }, []);

  const fetchFeaturedCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          photographer:profiles(full_name)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(6);

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header STA Style - Preto com logo dourado */}
      <header className="bg-secondary text-secondary-foreground">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img 
                src="/lovable-uploads/6fdfc5d2-230c-4142-bf7c-3a326e5e45a8.png" 
                alt="STA Fotos Logo" 
                className="h-8 md:h-10 w-auto"
              />
            </div>

            {/* Search + Auth Buttons */}
            <div className="flex items-center gap-2 md:gap-4">
              {/* Search - Hidden on mobile, shown in separate section */}
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Pesquisar evento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-background/10 border-gray-600 text-white placeholder:text-gray-400 w-64"
                />
              </div>

              {/* Auth Buttons */}
              {user ? (
                <Link to="/dashboard">
                  <Button variant="outline" size="sm" className="gap-1 md:gap-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground text-xs md:text-sm">
                    <User className="h-3 w-3 md:h-4 md:w-4" />
                    <span className="hidden sm:inline">Dashboard</span>
                    <span className="sm:hidden">Painel</span>
                  </Button>
                </Link>
              ) : (
                <div className="flex gap-1 md:gap-2">
                  <Link to="/auth">
                    <Button variant="outline" size="sm" className="gap-1 md:gap-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground text-xs md:text-sm px-2 md:px-4">
                      <User className="h-3 w-3 md:h-4 md:w-4" />
                      <span className="hidden sm:inline">Cadastrar</span>
                      <span className="sm:hidden">Entrar</span>
                    </Button>
                  </Link>
                  <Link to="/auth">
                    <Button size="sm" className="gap-1 md:gap-2 bg-primary text-primary-foreground hover:bg-primary/90 text-xs md:text-sm px-2 md:px-4">
                      <LogIn className="h-3 w-3 md:h-4 md:w-4" />
                      <span className="hidden sm:inline">Entrar</span>
                      <span className="sm:hidden">Login</span>
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="border-t border-gray-700">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-center md:justify-start space-x-4 md:space-x-8 py-3 text-xs md:text-sm overflow-x-auto">
              <Link to="/" className="text-primary font-medium whitespace-nowrap">HOME</Link>
              <Link to="/events" className="hover:text-primary transition-colors whitespace-nowrap">EVENTOS</Link>
              <Link to="/fotografos" className="hover:text-primary transition-colors whitespace-nowrap">FOTÓGRAFOS</Link>
              <Link to="/contato" className="hover:text-primary transition-colors whitespace-nowrap">CONTATO</Link>
              {profile?.role === 'photographer' && (
                <Link to="/cadastro-fotografos" className="hover:text-primary transition-colors whitespace-nowrap">ÁREA DO FOTÓGRAFO</Link>
              )}
            </div>
          </div>
        </nav>
      </header>

      {/* Mobile Search */}
      <div className="md:hidden bg-secondary border-t border-gray-700 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Pesquisar evento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-background/10 border-gray-600 text-white placeholder:text-gray-400 text-base"
          />
        </div>
      </div>

      {/* Featured Campaigns - STA Style */}
      <section className="py-12 px-4">
        <div className="container mx-auto">
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="aspect-video bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : campaigns.length > 0 ? (
            <>
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-foreground mb-2">Eventos em Destaque</h2>
                <p className="text-muted-foreground">Navegue pelos principais campeonatos esportivos</p>
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {campaigns.map((campaign) => (
                  <Card key={campaign.id} className="overflow-hidden hover:shadow-lg transition-shadow group cursor-pointer border-2 hover:border-primary/20">
                    <div className="aspect-video bg-gradient-dark relative">
                      {campaign.cover_image_url ? (
                        <img
                          src={campaign.cover_image_url}
                          alt={campaign.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-secondary">
                          <div className="text-center text-secondary-foreground">
                            <Camera className="h-16 w-16 mx-auto mb-4 text-primary" />
                            <h3 className="text-xl font-bold mb-2">{campaign.title}</h3>
                          </div>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-4 left-4 right-4 text-white">
                        <h3 className="text-xl font-bold mb-1">{campaign.title}</h3>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span>{campaign.location}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{new Date(campaign.event_date).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Por: {campaign.photographer?.full_name}
                          </p>
                        </div>
                        <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                          Ver Fotos
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-16">
              <Camera className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-medium mb-2">Em breve novos eventos!</h3>
              <p className="text-muted-foreground">
                Fotógrafos estão preparando eventos incríveis para você
              </p>
              {!user && (
                <Link to="/auth">
                  <Button className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90">
                    Cadastre-se para ser notificado
                  </Button>
                </Link>
              )}
            </div>
          )}
        </div>
      </section>

      {/* About Section - STA Style */}
      <section className="py-16 px-4 bg-muted/20">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Como Funciona</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Conectamos fotógrafos esportivos com atletas e fãs que querem guardar seus melhores momentos
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="mx-auto mb-6 p-4 rounded-full bg-primary/10 w-fit">
                <Camera className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">1. Fotógrafo Cria Evento</h3>
              <p className="text-muted-foreground">
                Fotógrafos cadastram seus eventos esportivos e fazem upload das fotos com proteção automática
              </p>
            </div>
            
            <div className="text-center">
              <div className="mx-auto mb-6 p-4 rounded-full bg-primary/10 w-fit">
                <Search className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">2. Usuário Encontra</h3>
              <p className="text-muted-foreground">
                Atletas e fãs navegam pelos eventos, visualizam fotos com marca d'água e escolhem suas favoritas
              </p>
            </div>
            
            <div className="text-center">
              <div className="mx-auto mb-6 p-4 rounded-full bg-primary/10 w-fit">
                <Trophy className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">3. Compra Segura</h3>
              <p className="text-muted-foreground">
                Pagamento seguro via Stripe e download imediato das fotos em alta qualidade sem marca d'água
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - STA Style */}
      <footer className="bg-secondary text-secondary-foreground py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            {/* Sobre nós */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-primary">Sobre nós</h3>
              <div className="space-y-2 text-sm">
                <p>contato@stafotos.com.br</p>
                <p>(11) 95771-9467</p>
              </div>
            </div>

            {/* Links */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-primary">Links</h3>
              <div className="space-y-2 text-sm">
                <div><Link to="/auth" className="hover:text-primary transition-colors">Login</Link></div>
                <div><Link to="/auth" className="hover:text-primary transition-colors">Cadastro</Link></div>
                <div><Link to="/recuperacao" className="hover:text-primary transition-colors">Recuperação de acesso</Link></div>
              </div>
            </div>

            {/* Ajuda */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-primary">Ajuda</h3>
              <div className="space-y-2 text-sm">
                <div><Link to="/duvidas" className="hover:text-primary transition-colors">Dúvidas frequentes</Link></div>
                <div><Link to="/contato" className="hover:text-primary transition-colors">Contato</Link></div>
                <div><Link to="/sobre" className="hover:text-primary transition-colors">Sobre nós</Link></div>
                <div><Link to="/admin" className="hover:text-primary transition-colors text-xs opacity-70">Área Admin</Link></div>
              </div>
            </div>

            {/* Redes Sociais */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-primary">Redes sociais</h3>
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-gray-600 rounded"></div>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className="border-t border-gray-700 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-gray-400">
            <p>© 2024 STA Fotos. Todos os direitos reservados.</p>
            <div className="flex items-center gap-2 mt-4 md:mt-0">
              <span>Pagamentos seguros via</span>
              <div className="bg-primary px-2 py-1 rounded text-primary-foreground text-xs font-semibold">
                STRIPE
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;