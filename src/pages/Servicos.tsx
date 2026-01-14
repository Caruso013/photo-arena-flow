import { Link } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  Video, 
  Camera, 
  Clock, 
  Star, 
  Users, 
  CheckCircle,
  ArrowRight,
  MessageCircle,
  CalendarCheck
} from 'lucide-react';

interface Service {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  features: string[];
  popular?: boolean;
  deliveryTime: string;
}

const services: Service[] = [
  {
    id: 'entrega-rapida',
    title: 'Entrega Rápida para Atletas',
    description: 'Receba suas fotos do evento no mesmo dia ou em até 24 horas. Ideal para atletas que querem compartilhar suas conquistas rapidamente nas redes sociais.',
    icon: Zap,
    features: [
      'Entrega em até 24 horas',
      'Edição profissional básica',
      'Fotos em alta resolução',
      'Compartilhamento facilitado para redes sociais',
      'Marca d\'água removida'
    ],
    popular: true,
    deliveryTime: '24 horas'
  },
  {
    id: 'video-fotos',
    title: 'Videozinho de Fotos',
    description: 'Transformamos suas melhores fotos em um vídeo emocionante com música. Perfeito para guardar memórias e compartilhar momentos especiais.',
    icon: Video,
    features: [
      'Vídeo de 30s a 2 minutos',
      'Seleção das melhores fotos',
      'Trilha sonora personalizada',
      'Transições profissionais',
      'Formato otimizado para Instagram/TikTok'
    ],
    deliveryTime: '3-5 dias'
  },
  {
    id: 'gravacao-pessoal',
    title: 'Gravação Pessoal',
    description: 'Contrate um fotógrafo para cobertura exclusiva do seu treino, competição ou evento pessoal. Atenção 100% dedicada a você.',
    icon: Camera,
    features: [
      'Fotógrafo exclusivo',
      'Cobertura personalizada',
      'Todas as fotos em alta resolução',
      'Edição profissional completa',
      'Entrega em pen drive ou nuvem'
    ],
    popular: true,
    deliveryTime: 'Sob consulta'
  },
  {
    id: 'pacote-evento',
    title: 'Pacote Evento Completo',
    description: 'Cobertura fotográfica completa para eventos esportivos, competições e campeonatos. Ideal para organizadores.',
    icon: CalendarCheck,
    features: [
      'Equipe de fotógrafos',
      'Cobertura de várias horas',
      'Entrega de todas as fotos',
      'Galeria online para participantes',
      'Opção de venda de fotos'
    ],
    deliveryTime: 'Personalizado'
  }
];

const STA_WHATSAPP = '5511999999999'; // Substituir pelo número real da STA

const Servicos = () => {
  const handleContactService = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    if (service) {
      const message = encodeURIComponent(
        `Olá! Gostaria de saber mais sobre o serviço "${service.title}". Podem me passar mais informações e valores?`
      );
      window.open(`https://wa.me/${STA_WHATSAPP}?text=${message}`, '_blank');
    }
  };

  const handleGeneralContact = () => {
    const message = encodeURIComponent(
      `Olá! Gostaria de saber mais sobre os serviços de fotografia da STA Fotos.`
    );
    window.open(`https://wa.me/${STA_WHATSAPP}?text=${message}`, '_blank');
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4">
            <Star className="h-3 w-3 mr-1" />
            Serviços Exclusivos
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Contrate um <span className="text-primary">Fotógrafo</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Serviços personalizados para atletas e organizadores. 
            Escolha o que melhor atende suas necessidades e entre em contato conosco para um orçamento.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <Card 
                key={service.id}
                className={`relative transition-all duration-300 hover:shadow-lg ${
                  service.popular ? 'border-primary/50' : ''
                }`}
              >
                {service.popular && (
                  <Badge className="absolute -top-2 right-4 bg-primary">
                    Mais Popular
                  </Badge>
                )}
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">{service.title}</CardTitle>
                      <CardDescription className="text-base">
                        {service.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Features */}
                    <ul className="space-y-2">
                      {service.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Delivery Time */}
                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>Prazo de entrega: <strong className="text-foreground">{service.deliveryTime}</strong></span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <Button 
                      className="w-full gap-2"
                      onClick={() => handleContactService(service.id)}
                    >
                      <MessageCircle className="h-4 w-4" />
                      Solicitar Orçamento
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* CTA Section */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-primary" />
            <h2 className="text-2xl font-bold mb-2">
              Quer conhecer nossos fotógrafos?
            </h2>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              Veja o portfólio dos nossos profissionais e escolha o fotógrafo 
              que mais combina com o seu estilo. Entre em contato com a STA para contratar.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="outline" className="gap-2" onClick={handleGeneralContact}>
                <MessageCircle className="h-5 w-5" />
                Fale Conosco
              </Button>
              <Link to="/fotografos">
                <Button size="lg" className="gap-2">
                  <Camera className="h-5 w-5" />
                  Ver Fotógrafos
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* FAQ Preview */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-center mb-6">Perguntas Frequentes</h2>
          <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-2">Como funciona o processo de contratação?</h3>
                <p className="text-sm text-muted-foreground">
                  Após escolher o serviço ou fotógrafo, entre em contato pelo WhatsApp. Nossa equipe irá entender 
                  suas necessidades e passar um orçamento personalizado.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-2">Posso escolher o fotógrafo?</h3>
                <p className="text-sm text-muted-foreground">
                  Sim! Você pode ver o portfólio dos nossos fotógrafos na página de Fotógrafos e escolher aquele 
                  que mais combina com seu estilo.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-2">Como é feito o pagamento?</h3>
                <p className="text-sm text-muted-foreground">
                  Aceitamos PIX e cartão de crédito. Os valores e condições de pagamento 
                  são combinados diretamente com a STA após o orçamento.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-2">Qual a área de atendimento?</h3>
                <p className="text-sm text-muted-foreground">
                  Atendemos eventos em todo o Brasil, com foco principal em São Paulo 
                  e região. Entre em contato para verificar disponibilidade.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Servicos;
