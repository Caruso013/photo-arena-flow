import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import MainLayout from '@/components/layout/MainLayout';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  HelpCircle, 
  User, 
  Camera, 
  ShoppingCart, 
  CreditCard, 
  Upload, 
  Shield,
  Search,
  ArrowLeft,
  Mail
} from 'lucide-react';

export default function FAQ() {
  const [searchQuery, setSearchQuery] = useState('');

  const userFAQs = [
    {
      question: "Como faço para comprar uma foto?",
      answer: "Para comprar uma foto, navegue até o evento desejado, encontre a foto que você gosta, clique em 'Adicionar ao Carrinho' e depois finalize a compra no carrinho. Você receberá a foto em alta resolução sem marca d'água após a confirmação do pagamento."
    },
    {
      question: "Preciso criar uma conta para comprar fotos?",
      answer: "Sim, é necessário criar uma conta para realizar compras. Isso permite que você acesse suas compras a qualquer momento no seu dashboard pessoal e receba notificações sobre novos eventos."
    },
    {
      question: "Como encontro minhas fotos em um evento?",
      answer: "Navegue até a página do evento e use os filtros disponíveis. Você pode buscar por número de peito, horário aproximado ou outras categorias dependendo do evento. Os fotógrafos organizam as fotos para facilitar sua busca."
    },
    {
      question: "Posso baixar as fotos que comprei novamente?",
      answer: "Sim! Todas as suas compras ficam disponíveis permanentemente no seu dashboard. Você pode baixar as fotos quantas vezes quiser, a qualquer momento."
    },
    {
      question: "As fotos têm marca d'água?",
      answer: "As fotos de visualização possuem marca d'água para proteção. Após a compra, você receberá a foto em alta resolução sem nenhuma marca d'água."
    },
    {
      question: "Quais formas de pagamento são aceitas?",
      answer: "Aceitamos pagamentos via Mercado Pago, que permite cartão de crédito, débito, PIX e boleto bancário. O pagamento é processado de forma segura."
    },
    {
      question: "Posso solicitar reembolso?",
      answer: "Devido à natureza digital do produto, reembolsos são analisados caso a caso. Entre em contato com nosso suporte através da página de contato explicando o motivo."
    },
    {
      question: "Como recebo as fotos após a compra?",
      answer: "Após confirmar o pagamento, as fotos ficam disponíveis imediatamente para download no seu dashboard. Você também receberá um email de confirmação com instruções."
    },
    {
      question: "Posso comprar fotos de eventos antigos?",
      answer: "Sim! As fotos dos eventos permanecem disponíveis na plataforma. Você pode acessar eventos anteriores através da página 'Eventos' e fazer compras normalmente."
    },
    {
      question: "Como altero meus dados cadastrais?",
      answer: "Acesse seu dashboard e clique na aba 'Perfil'. Lá você pode atualizar seu nome, email, foto de perfil e outras informações pessoais."
    }
  ];

  const photographerFAQs = [
    {
      question: "Como me torno um fotógrafo na plataforma?",
      answer: "Primeiro, crie uma conta como usuário comum. Depois, entre em contato com nossa equipe através da página de contato solicitando o upgrade para fotógrafo. Nossa equipe irá avaliar seu perfil e promover sua conta."
    },
    {
      question: "Como faço upload de fotos?",
      answer: "Após ser aprovado como fotógrafo, acesse seu dashboard e navegue até o evento em que você foi designado. Lá você encontrará o botão 'Fazer Upload de Fotos'. Você pode fazer upload de múltiplas fotos simultaneamente."
    },
    {
      question: "Preciso ser designado para um evento para fazer upload?",
      answer: "Sim. Os administradores devem atribuir você a um evento antes que você possa fazer upload de fotos. Você pode se candidatar a eventos disponíveis através da página 'Eventos Próximos'."
    },
    {
      question: "Como funciona a comissão dos fotógrafos?",
      answer: "A comissão é definida por evento e pode variar. Geralmente fica entre 10% e 40% do valor da venda. Você pode ver sua comissão específica no dashboard financeiro e solicitar saques quando atingir o valor mínimo."
    },
    {
      question: "Quando recebo o pagamento pelas vendas?",
      answer: "Você pode solicitar saque quando atingir o valor mínimo de R$ 50,00. Os pagamentos são processados em até 7 dias úteis após a solicitação. Acompanhe seus ganhos no dashboard financeiro."
    },
    {
      question: "Como me candidato para fotografar eventos?",
      answer: "Acesse a página 'Eventos Próximos' e visualize os eventos disponíveis. Clique em 'Candidatar-se' nos eventos de seu interesse. Os organizadores irão avaliar e aprovar as candidaturas."
    },
    {
      question: "Posso editar ou excluir fotos após o upload?",
      answer: "Sim, no seu dashboard você tem controle total sobre suas fotos. Pode editar informações, excluir fotos ou desativar temporariamente a venda de determinadas fotos."
    },
    {
      question: "Qual o tamanho e formato ideal das fotos?",
      answer: "Recomendamos JPG ou PNG em alta resolução (mínimo 1920x1080px). O sistema automaticamente gera versões com marca d'água para preview e mantém o original para venda."
    },
    {
      question: "Posso organizar minhas fotos em álbuns?",
      answer: "Sim! Você pode criar subálbuns dentro de cada evento para organizar melhor suas fotos. Isso ajuda os compradores a encontrarem suas fotos mais facilmente."
    },
    {
      question: "Como defino o preço das minhas fotos?",
      answer: "O preço padrão é definido pela plataforma (geralmente R$ 10,00 por foto), mas você pode ajustar individualmente por foto ou álbum no seu dashboard, respeitando os limites mínimos e máximos."
    },
    {
      question: "Recebo notificações quando minhas fotos são vendidas?",
      answer: "Sim! Você recebe notificações em tempo real no dashboard e por email sempre que uma de suas fotos é vendida. Você também pode acompanhar relatórios detalhados de vendas."
    }
  ];

  const adminFAQs = [
    {
      question: "Como crio um novo evento?",
      answer: "No painel administrativo, vá até a aba 'Eventos' e clique em 'Novo Evento'. Preencha as informações do evento, defina as porcentagens de comissão e ative o evento."
    },
    {
      question: "Como atribuo fotógrafos a um evento?",
      answer: "Na lista de eventos, clique em 'Gerenciar Fotógrafos' no evento desejado. Você pode selecionar múltiplos fotógrafos e atribuí-los ao evento."
    },
    {
      question: "Como aprovo candidaturas de fotógrafos?",
      answer: "Acesse a aba 'Candidaturas' no dashboard admin. Lá você verá todas as candidaturas pendentes e poderá aprovar ou rejeitar cada uma."
    },
    {
      question: "Como promovo um usuário para fotógrafo?",
      answer: "Na aba 'Usuários' do dashboard admin, localize o usuário e clique em 'Promover para Fotógrafo'. Confirme a ação e o usuário receberá as permissões de fotógrafo."
    },
    {
      question: "Posso alterar as porcentagens de comissão de um evento?",
      answer: "Sim, ao criar ou editar um evento você pode definir porcentagens personalizadas para Plataforma, Fotógrafo e Organização. A soma deve ser 100%."
    }
  ];

  const filteredUserFAQs = userFAQs.filter(faq =>
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPhotographerFAQs = photographerFAQs.filter(faq =>
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAdminFAQs = adminFAQs.filter(faq =>
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <MainLayout>
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <Link to="/">
            <Button variant="ghost" className="mb-4 text-primary-foreground hover:bg-primary-foreground/10">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-primary-foreground/10 p-3 rounded-full">
              <HelpCircle className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">Central de Ajuda</h1>
              <p className="text-primary-foreground/80 mt-2">
                Encontre respostas para suas dúvidas
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Search Bar */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar dúvidas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 text-lg"
              />
            </div>
          </CardContent>
        </Card>

        {/* FAQ Tabs */}
        <Tabs defaultValue="usuarios" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 h-auto">
            <TabsTrigger value="usuarios" className="flex flex-col gap-2 py-3">
              <User className="h-5 w-5" />
              <span className="text-sm">Usuários</span>
              <Badge variant="secondary" className="mt-1">
                {filteredUserFAQs.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="fotografos" className="flex flex-col gap-2 py-3">
              <Camera className="h-5 w-5" />
              <span className="text-sm">Fotógrafos</span>
              <Badge variant="secondary" className="mt-1">
                {filteredPhotographerFAQs.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="admins" className="flex flex-col gap-2 py-3">
              <Shield className="h-5 w-5" />
              <span className="text-sm">Administradores</span>
              <Badge variant="secondary" className="mt-1">
                {filteredAdminFAQs.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* Usuários */}
          <TabsContent value="usuarios">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Perguntas Frequentes - Usuários
                </CardTitle>
                <CardDescription>
                  Dúvidas comuns sobre como comprar e usar a plataforma
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredUserFAQs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma pergunta encontrada com "{searchQuery}"
                  </p>
                ) : (
                  <Accordion type="single" collapsible className="w-full">
                    {filteredUserFAQs.map((faq, index) => (
                      <AccordionItem key={index} value={`user-${index}`}>
                        <AccordionTrigger className="text-left">
                          {faq.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                          {faq.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Fotógrafos */}
          <TabsContent value="fotografos">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Perguntas Frequentes - Fotógrafos
                </CardTitle>
                <CardDescription>
                  Informações sobre como trabalhar como fotógrafo na plataforma
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredPhotographerFAQs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma pergunta encontrada com "{searchQuery}"
                  </p>
                ) : (
                  <Accordion type="single" collapsible className="w-full">
                    {filteredPhotographerFAQs.map((faq, index) => (
                      <AccordionItem key={index} value={`photographer-${index}`}>
                        <AccordionTrigger className="text-left">
                          {faq.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                          {faq.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Administradores */}
          <TabsContent value="admins">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Perguntas Frequentes - Administradores
                </CardTitle>
                <CardDescription>
                  Guia para gerenciar eventos, fotógrafos e organizações
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredAdminFAQs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma pergunta encontrada com "{searchQuery}"
                  </p>
                ) : (
                  <Accordion type="single" collapsible className="w-full">
                    {filteredAdminFAQs.map((faq, index) => (
                      <AccordionItem key={index} value={`admin-${index}`}>
                        <AccordionTrigger className="text-left">
                          {faq.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                          {faq.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Contact Card */}
        <Card className="mt-8 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="bg-primary text-primary-foreground p-3 rounded-full">
                  <Mail className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Não encontrou sua dúvida?</h3>
                  <p className="text-muted-foreground">
                    Nossa equipe está pronta para ajudar você
                  </p>
                </div>
              </div>
              <Link to="/contato">
                <Button size="lg" className="w-full md:w-auto">
                  Entrar em Contato
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <Link to="/events">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardContent className="pt-6 text-center">
                <ShoppingCart className="h-8 w-8 mx-auto mb-3 text-primary" />
                <h3 className="font-semibold mb-2">Explorar Eventos</h3>
                <p className="text-sm text-muted-foreground">
                  Veja eventos disponíveis
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/fotografos">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardContent className="pt-6 text-center">
                <Camera className="h-8 w-8 mx-auto mb-3 text-primary" />
                <h3 className="font-semibold mb-2">Seja um Fotógrafo</h3>
                <p className="text-sm text-muted-foreground">
                  Trabalhe conosco
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/dashboard">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardContent className="pt-6 text-center">
                <User className="h-8 w-8 mx-auto mb-3 text-primary" />
                <h3 className="font-semibold mb-2">Meu Dashboard</h3>
                <p className="text-sm text-muted-foreground">
                  Acesse seu perfil
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </MainLayout>
  );
}
