import React from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Search, 
  ShoppingCart, 
  CreditCard, 
  Download, 
  UserPlus,
  Camera,
  Heart,
  Share2,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const Tutorial = () => {
  const steps = [
    {
      icon: <Search className="h-8 w-8 text-primary" />,
      title: '1. Encontre seu Evento',
      description: 'Navegue pela página de eventos ou use a busca para encontrar o campeonato que você participou.',
      tips: [
        'Use a barra de pesquisa no topo da página',
        'Filtre por data, localização ou nome do evento',
        'Todos os eventos recentes aparecem na página inicial'
      ]
    },
    {
      icon: <Camera className="h-8 w-8 text-primary" />,
      title: '2. Navegue pela Galeria',
      description: 'Explore as fotos do evento organizadas em álbuns. Clique nas miniaturas para ver em tamanho maior.',
      tips: [
        'As fotos estão ordenadas por ordem de upload',
        'Use a paginação na parte inferior para ver mais fotos',
        'Clique em "Ver" para ampliar qualquer foto',
        'Álbuns organizados por categorias ou momentos do evento'
      ]
    },
    {
      icon: <Heart className="h-8 w-8 text-primary" />,
      title: '3. Selecione suas Fotos',
      description: 'Adicione suas fotos favoritas ao carrinho ou compre individualmente.',
      tips: [
        'Clique no ícone de carrinho para adicionar',
        'Ou clique no preço para comprar direto',
        'Veja o carrinho no ícone no topo da página'
      ]
    },
    {
      icon: <CreditCard className="h-8 w-8 text-primary" />,
      title: '4. Realize o Pagamento',
      description: 'Escolha sua forma de pagamento e finalize a compra de forma segura.',
      tips: [
        'Aceitamos cartão de crédito e débito',
        'Pagamento processado via Mercado Pago',
        'Transação 100% segura e criptografada'
      ]
    },
    {
      icon: <Download className="h-8 w-8 text-primary" />,
      title: '5. Baixe suas Fotos',
      description: 'Após a confirmação do pagamento, baixe suas fotos em alta resolução sem marca d\'água.',
      tips: [
        'Acesse "Minhas Compras" no seu dashboard',
        'Clique em "Baixar" em cada foto comprada',
        'Fotos em alta qualidade, prontas para impressão',
        'Download disponível imediatamente após pagamento'
      ]
    }
  ];

  const faqs = [
    {
      question: 'Quanto tempo leva para as fotos ficarem disponíveis?',
      answer: 'As fotos geralmente são enviadas pelos fotógrafos durante ou logo após o evento. A maioria dos eventos tem fotos disponíveis em até 48 horas.'
    },
    {
      question: 'Posso comprar fotos sem cadastro?',
      answer: 'Não, é necessário criar uma conta para realizar compras. O cadastro é rápido e gratuito, levando apenas alguns segundos.'
    },
    {
      question: 'Como funciona a marca d\'água?',
      answer: 'Todas as fotos na galeria possuem marca d\'água para proteção. Após a compra, você recebe a versão em alta resolução sem nenhuma marca d\'água.'
    },
    {
      question: 'Posso resgatar minha foto mais de uma vez?',
      answer: 'Sim! Após comprar uma foto, você pode baixá-la quantas vezes quiser através da seção "Minhas Compras" no seu dashboard.'
    },
    {
      question: 'Qual o formato das fotos?',
      answer: 'As fotos são entregues em formato JPG de alta qualidade, prontas para impressão ou compartilhamento digital.'
    },
    {
      question: 'E se eu não encontrar minha foto?',
      answer: 'Entre em contato conosco através da página de Contato. Nossa equipe ajudará você a localizar suas fotos ou entrar em contato com o fotógrafo do evento.'
    },
    {
      question: 'As fotos têm prazo de validade?',
      answer: 'Não! Uma vez que você compra uma foto, ela fica disponível para download permanentemente na sua conta.'
    },
    {
      question: 'Posso solicitar edição nas fotos?',
      answer: 'As fotos são entregues como foram capturadas pelo fotógrafo. Para edições especiais, entre em contato diretamente com o fotógrafo através dos dados disponíveis no evento.'
    }
  ];

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Hero Section */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="inline-block p-3 bg-primary/10 rounded-full mb-4">
            <Camera className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Como Funciona</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Encontre, compre e baixe suas fotos favoritas em 5 passos simples
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-6 mb-16">
          {steps.map((step, index) => (
            <Card 
              key={index} 
              className="animate-fade-in hover:shadow-lg transition-all duration-300 hover:border-primary/30"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg flex-shrink-0">
                    {step.icon}
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-2">{step.title}</CardTitle>
                    <p className="text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="ml-16 space-y-2">
                  <p className="text-sm font-medium text-primary mb-2">💡 Dicas:</p>
                  <ul className="space-y-1">
                    {step.tips.map((tip, tipIndex) => (
                      <li key={tipIndex} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Video Tutorial Placeholder */}
        <Card className="mb-16 animate-fade-in overflow-hidden" style={{ animationDelay: '0.5s' }}>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Tutorial em Vídeo</CardTitle>
            <p className="text-muted-foreground">
              Assista ao passo a passo completo em vídeo
            </p>
          </CardHeader>
          <CardContent>
            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
              <div className="text-center">
                <Camera className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Vídeo tutorial em breve</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Features */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <Card className="text-center animate-fade-in hover:shadow-lg transition-all duration-300" style={{ animationDelay: '0.6s' }}>
            <CardHeader>
              <Shield className="h-12 w-12 text-primary mx-auto mb-2" />
              <CardTitle className="text-lg">Pagamento Seguro</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Suas transações são protegidas por criptografia de ponta a ponta
              </p>
            </CardContent>
          </Card>

          <Card className="text-center animate-fade-in hover:shadow-lg transition-all duration-300" style={{ animationDelay: '0.7s' }}>
            <CardHeader>
              <Download className="h-12 w-12 text-primary mx-auto mb-2" />
              <CardTitle className="text-lg">Download Ilimitado</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Baixe suas fotos quantas vezes quiser, quando quiser
              </p>
            </CardContent>
          </Card>

          <Card className="text-center animate-fade-in hover:shadow-lg transition-all duration-300" style={{ animationDelay: '0.8s' }}>
            <CardHeader>
              <Camera className="h-12 w-12 text-primary mx-auto mb-2" />
              <CardTitle className="text-lg">Alta Qualidade</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Fotos em alta resolução, prontas para impressão profissional
              </p>
            </CardContent>
          </Card>
        </div>

        {/* FAQ Section */}
        <Card className="animate-fade-in" style={{ animationDelay: '0.9s' }}>
          <CardHeader>
            <CardTitle className="text-2xl text-center">Perguntas Frequentes</CardTitle>
            <p className="text-center text-muted-foreground">
              Tire suas dúvidas sobre o processo
            </p>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* CTA Section */}
        <div className="text-center mt-12 py-8 animate-fade-in" style={{ animationDelay: '1s' }}>
          <h2 className="text-2xl font-bold mb-4">Pronto para começar?</h2>
          <p className="text-muted-foreground mb-6">
            Encontre suas fotos favoritas agora mesmo
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/events">
              <Button size="lg" className="w-full sm:w-auto">
                <Search className="mr-2 h-5 w-5" />
                Ver Eventos
              </Button>
            </Link>
            <Link to="/contato">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                Precisa de Ajuda?
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Tutorial;
