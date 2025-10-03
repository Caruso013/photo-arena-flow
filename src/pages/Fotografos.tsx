import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Camera, Search, Star, MapPin, Calendar, User, ArrowRight, LogIn, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface Photographer {
  id: string;
  full_name: string;
  avatar_url: string;
  email: string;
  _count?: {
    campaigns: number;
  };
  campaigns?: Array<{
    id: string;
    title: string;
    location: string;
    event_date: string;
    cover_image_url: string;
  }>;
}

const Fotografos = () => {
  const { user } = useAuth();
  const [photographers, setPhotographers] = useState<Photographer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPhotographers();
  }, []);

  const fetchPhotographers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          avatar_url,
          email,
          campaigns(id, title, location, event_date, cover_image_url, is_active)
        `)
        .eq('role', 'photographer');

      if (error) throw error;
      
      // Process data to add campaign counts and filter active campaigns
      const processedData = data?.map(photographer => ({
        ...photographer,
        campaigns: photographer.campaigns?.filter(c => c.is_active) || [],
        _count: {
          campaigns: photographer.campaigns?.filter(c => c.is_active)?.length || 0
        }
      })) || [];

      setPhotographers(processedData);
    } catch (error) {
      console.error('Erro ao buscar fotógrafos:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPhotographers = photographers.filter(photographer =>
    photographer.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    photographer.campaigns?.some(campaign => 
      campaign.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campaign.location?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header STA Style */}
      <header className="bg-secondary text-secondary-foreground">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3">
              <img 
                src="/lovable-uploads/6fdfc5d2-230c-4142-bf7c-3a326e5e45a8.png" 
                alt="STA Fotos Logo" 
                className="h-8 md:h-10 w-auto"
              />
            </Link>

            {/* Auth Buttons */}
            <div className="flex items-center gap-2 md:gap-4">
              {user ? (
                <Link to="/dashboard">
                  <Button variant="outline" size="sm" className="gap-1 md:gap-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground text-xs md:text-sm">
                    <User className="h-3 w-3 md:h-4 md:w-4" />
                    <span className="hidden sm:inline">Dashboard</span>
                    <span className="sm:hidden">Painel</span>
                  </Button>
                </Link>
              ) : (
                <Link to="/auth">
                  <Button size="sm" className="gap-1 md:gap-2 bg-primary text-primary-foreground hover:bg-primary/90 text-xs md:text-sm px-2 md:px-4">
                    <LogIn className="h-3 w-3 md:h-4 md:w-4" />
                    <span className="hidden sm:inline">Entrar</span>
                    <span className="sm:hidden">Login</span>
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="border-t border-gray-700">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-center md:justify-start space-x-4 md:space-x-8 py-3 text-xs md:text-sm overflow-x-auto">
              <Link to="/" className="hover:text-primary transition-colors whitespace-nowrap">HOME</Link>
              <Link to="/events" className="hover:text-primary transition-colors whitespace-nowrap">EVENTOS</Link>
              <Link to="/fotografos" className="text-primary font-medium whitespace-nowrap">FOTÓGRAFOS</Link>
              <Link to="/contato" className="hover:text-primary transition-colors whitespace-nowrap">CONTATO</Link>
            </div>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Nossos Fotógrafos</h1>
          <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
            Conheça os profissionais que capturam os melhores momentos dos eventos esportivos
          </p>
          
          {/* Search */}
          <div className="max-w-md mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Pesquisar fotógrafo ou evento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        {/* Photographers Grid */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-muted animate-pulse rounded-full" />
                  <div>
                    <div className="h-5 bg-muted animate-pulse rounded mb-2 w-32" />
                    <div className="h-4 bg-muted animate-pulse rounded w-24" />
                  </div>
                </div>
                <div className="h-4 bg-muted animate-pulse rounded mb-4 w-full" />
                <div className="grid grid-cols-2 gap-2">
                  <div className="aspect-video bg-muted animate-pulse rounded" />
                  <div className="aspect-video bg-muted animate-pulse rounded" />
                </div>
              </Card>
            ))}
          </div>
        ) : filteredPhotographers.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPhotographers.map((photographer) => (
              <Card key={photographer.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  {/* Photographer Info */}
                  <div className="flex items-center gap-4 mb-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={photographer.avatar_url} alt={photographer.full_name} />
                      <AvatarFallback className="text-lg">
                        {photographer.full_name?.charAt(0)?.toUpperCase() || photographer.email?.charAt(0)?.toUpperCase() || 'F'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-xl font-semibold">{photographer.full_name || 'Fotógrafo'}</h3>
                      <Badge variant="outline" className="gap-1">
                        <Camera className="h-3 w-3" />
                        {photographer._count?.campaigns || 0} eventos
                      </Badge>
                    </div>
                  </div>

                  {/* Recent Campaigns */}
                  {photographer.campaigns && photographer.campaigns.length > 0 ? (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">Eventos Recentes:</h4>
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        {photographer.campaigns.slice(0, 2).map((campaign) => (
                          <div key={campaign.id} className="aspect-video bg-gradient-subtle rounded-lg overflow-hidden relative">
                            {campaign.cover_image_url ? (
                              <img
                                src={campaign.cover_image_url}
                                alt={campaign.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-muted">
                                <Camera className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                            <div className="absolute bottom-1 left-1 right-1">
                              <p className="text-white text-xs font-medium truncate">{campaign.title}</p>
                              <div className="flex items-center gap-1 text-white/80 text-xs">
                                <MapPin className="h-2 w-2" />
                                <span className="truncate">{campaign.location}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <Button className="w-full gap-2" size="sm">
                        Ver Todos os Eventos
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Camera className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-sm">Nenhum evento disponível</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-medium mb-2">
              {searchTerm ? 'Nenhum fotógrafo encontrado' : 'Nenhum fotógrafo disponível'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm 
                ? 'Tente ajustar sua pesquisa para encontrar fotógrafos'
                : 'Em breve teremos fotógrafos incríveis cadastrados!'
              }
            </p>
            {searchTerm && (
              <Button onClick={() => setSearchTerm('')} variant="outline">
                Limpar Pesquisa
              </Button>
            )}
          </div>
        )}

        {/* FAQ Section */}
        <div className="mt-16 max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4">Quer se tornar um fotógrafo?</h2>
            <p className="text-lg text-muted-foreground">
              Confira as respostas para as perguntas mais frequentes sobre como se cadastrar como fotógrafo na nossa plataforma
            </p>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="item-1" className="border border-border rounded-lg px-6">
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-3">
                  <HelpCircle className="h-5 w-5 text-primary" />
                  <span className="font-medium">Como me candidato para ser um fotógrafo credenciado?</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 pb-6">
                <div className="space-y-3 text-muted-foreground">
                  <p>Para se candidatar como fotógrafo na nossa plataforma, você precisa:</p>
                  <ol className="list-decimal list-inside space-y-2 ml-4">
                    <li>Criar uma conta como usuário na plataforma</li>
                    <li>Acessar seu dashboard e ir na aba "Fotógrafo"</li>
                    <li>Preencher o formulário de candidatura com:</li>
                    <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                      <li>Link do seu portfolio (site, Instagram, Behance, etc.)</li>
                      <li>Anos de experiência como fotógrafo</li>
                      <li>Lista dos seus equipamentos principais</li>
                      <li>Mensagem sobre sua experiência e motivação</li>
                    </ul>
                    <li>Aguardar a análise da nossa equipe (até 5 dias úteis)</li>
                  </ol>
                  <p className="mt-4">
                    <strong>Importante:</strong> Certifique-se de que seu portfolio demonstra qualidade técnica e experiência em fotografia de eventos esportivos.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2" className="border border-border rounded-lg px-6">
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-3">
                  <HelpCircle className="h-5 w-5 text-primary" />
                  <span className="font-medium">Quais são os critérios de avaliação para aprovação?</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 pb-6">
                <div className="space-y-3 text-muted-foreground">
                  <p>Nossa equipe avalia as candidaturas com base nos seguintes critérios:</p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li><strong>Qualidade técnica:</strong> Foco, exposição, composição e técnica fotográfica</li>
                    <li><strong>Experiência em eventos:</strong> Portfolio com fotos de eventos esportivos ou similares</li>
                    <li><strong>Consistência:</strong> Portfolio coeso que demonstra um padrão de qualidade</li>
                    <li><strong>Equipamentos adequados:</strong> Câmeras e lentes apropriadas para fotografia de eventos</li>
                    <li><strong>Profissionalismo:</strong> Apresentação da candidatura e comunicação</li>
                    <li><strong>Adaptabilidade:</strong> Capacidade de trabalhar em diferentes condições de luz e ambiente</li>
                  </ul>
                  <p className="mt-4 bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
                    <strong>Dica:</strong> Inclua fotos que mostrem sua habilidade em capturar momentos de ação, trabalhar com pouca luz e fotografar pessoas em movimento.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3" className="border border-border rounded-lg px-6">
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-3">
                  <HelpCircle className="h-5 w-5 text-primary" />
                  <span className="font-medium">Quais equipamentos são necessários?</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 pb-6">
                <div className="space-y-3 text-muted-foreground">
                  <p>Recomendamos que os fotógrafos tenham pelo menos:</p>
                  <div className="grid md:grid-cols-2 gap-6 mt-4">
                    <div>
                      <h4 className="font-medium text-foreground mb-2">Equipamentos Essenciais:</h4>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Câmera DSLR ou mirrorless profissional</li>
                        <li>Lente grande angular (24-70mm ou similar)</li>
                        <li>Lente telefoto (70-200mm ou similar)</li>
                        <li>Flash externo ou sistema de iluminação</li>
                        <li>Cartões de memória rápidos e confiáveis</li>
                        <li>Baterias extras</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground mb-2">Equipamentos Recomendados:</h4>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Segunda câmera (backup)</li>
                        <li>Lentes com abertura máxima f/2.8 ou maior</li>
                        <li>Tripé ou monopé</li>
                        <li>Filtros (polarizador, ND)</li>
                        <li>Kit de limpeza para lentes</li>
                        <li>Laptop para backup das fotos</li>
                      </ul>
                    </div>
                  </div>
                  <p className="mt-4 bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-400">
                    <strong>Nota:</strong> Não exigimos marcas específicas, mas os equipamentos devem ser adequados para fotografia profissional em eventos.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4" className="border border-border rounded-lg px-6">
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-3">
                  <HelpCircle className="h-5 w-5 text-primary" />
                  <span className="font-medium">Como funciona o sistema de pagamentos?</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 pb-6">
                <div className="space-y-3 text-muted-foreground">
                  <p>Nosso sistema de pagamentos é transparente e justo:</p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li><strong>Comissão:</strong> Você fica com a maior parte do valor de cada foto vendida</li>
                    <li><strong>Pagamentos:</strong> Processados semanalmente via PIX ou transferência bancária</li>
                    <li><strong>Sem taxa de inscrição:</strong> Não cobramos nada para se tornar fotógrafo credenciado</li>
                    <li><strong>Relatórios detalhados:</strong> Acompanhe suas vendas em tempo real no dashboard</li>
                    <li><strong>Suporte:</strong> Equipe dedicada para resolver questões de pagamento</li>
                  </ul>
                  <div className="mt-4 p-4 bg-green-50 rounded-lg border-l-4 border-green-400">
                    <p><strong>Exemplo:</strong> Se uma foto é vendida por R$ 25,00, você recebe aproximadamente R$ 20,00 (a taxa exata varia conforme o evento e organização).</p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5" className="border border-border rounded-lg px-6">
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-3">
                  <HelpCircle className="h-5 w-5 text-primary" />
                  <span className="font-medium">E se minha candidatura for rejeitada?</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 pb-6">
                <div className="space-y-3 text-muted-foreground">
                  <p>Se sua candidatura não for aprovada desta vez, não desanime!</p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li><strong>Feedback detalhado:</strong> Você receberá por email os motivos específicos da rejeição</li>
                    <li><strong>Nova candidatura:</strong> Pode se candidatar novamente a qualquer momento</li>
                    <li><strong>Melhoria do portfolio:</strong> Use nosso feedback para aprimorar suas habilidades</li>
                    <li><strong>Sem limite de tentativas:</strong> Não há restrições para novas candidaturas</li>
                  </ul>
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                    <p><strong>Dica:</strong> Muitos fotógrafos são aprovados na segunda tentativa após implementarem nossas sugestões de melhoria!</p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-6" className="border border-border rounded-lg px-6">
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-3">
                  <HelpCircle className="h-5 w-5 text-primary" />
                  <span className="font-medium">Quais tipos de eventos posso fotografar?</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 pb-6">
                <div className="space-y-3 text-muted-foreground">
                  <p>Nossa plataforma abrange uma grande variedade de eventos esportivos:</p>
                  <div className="grid md:grid-cols-2 gap-6 mt-4">
                    <div>
                      <h4 className="font-medium text-foreground mb-2">Esportes Coletivos:</h4>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Futebol e futsal</li>
                        <li>Basquete e vôlei</li>
                        <li>Handebol</li>
                        <li>Rugby</li>
                        <li>Esportes universitários</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground mb-2">Esportes Individuais:</h4>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Corridas e maratonas</li>
                        <li>Ciclismo</li>
                        <li>Natação</li>
                        <li>Artes marciais</li>
                        <li>Eventos fitness</li>
                      </ul>
                    </div>
                  </div>
                  <p className="mt-4">
                    <strong>Flexibilidade:</strong> Você pode escolher quais tipos de eventos quer cobrir e sua disponibilidade de horários.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Call to Action */}
          <div className="mt-12 text-center bg-gradient-to-r from-primary/10 to-blue-500/10 rounded-lg p-8">
            <h3 className="text-2xl font-bold mb-4">Pronto para começar?</h3>
            <p className="text-lg text-muted-foreground mb-6">
              Junte-se aos nossos fotógrafos credenciados e monetize sua paixão pela fotografia esportiva!
            </p>
            {user ? (
              <Link to="/dashboard">
                <Button size="lg" className="gap-2">
                  <Camera className="h-5 w-5" />
                  Enviar Candidatura
                </Button>
              </Link>
            ) : (
              <Link to="/auth">
                <Button size="lg" className="gap-2">
                  <User className="h-5 w-5" />
                  Criar Conta e Candidatar-se
                </Button>
              </Link>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Fotografos;