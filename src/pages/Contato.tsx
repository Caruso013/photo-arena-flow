import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Mail, Phone, Clock, MessageCircle } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';

const WHATSAPP_NUMBER = '5511957719467'; // Número configurável

const Contato = () => {
  return (
    <MainLayout>
      <section className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8 md:mb-12">
            <h1 className="text-2xl md:text-4xl font-bold mb-4">Entre em Contato</h1>
            <p className="text-base md:text-xl text-muted-foreground px-4">
              Estamos aqui para ajudar você com suas dúvidas e necessidades
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {/* Informações de Contato */}
            <div className="space-y-4 md:space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                    <Mail className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                    Informações de Contato
                  </CardTitle>
                  <CardDescription className="text-sm md:text-base">
                    Entre em contato conosco através dos canais abaixo
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-primary" />
                    <div>
                      <p className="font-medium text-sm md:text-base">E-mail</p>
                      <p className="text-muted-foreground text-sm md:text-base">contato@stafotos.com.br</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-primary" />
                      <div>
                        <p className="font-medium text-sm md:text-base">Telefone/WhatsApp</p>
                        <p className="text-muted-foreground text-sm md:text-base">(11) 95771-9467</p>
                      </div>
                    </div>
                    <Button 
                      onClick={() => window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=Olá! Gostaria de mais informações sobre a plataforma.`, '_blank')}
                      className="w-full gap-2 bg-[#25D366] hover:bg-[#20BA5A] text-white"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Falar no WhatsApp
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-primary" />
                    <div>
                      <p className="font-medium text-sm md:text-base">Horário de Atendimento</p>
                      <p className="text-muted-foreground text-sm">Segunda à Sexta: 9h às 18h</p>
                      <p className="text-muted-foreground text-sm">Sábado: 9h às 12h</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg md:text-xl">Como Podemos Ajudar?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm md:text-base">Para Fotógrafos:</h4>
                    <ul className="text-xs md:text-sm text-muted-foreground space-y-1 ml-4">
                      <li>• Cadastro na plataforma</li>
                      <li>• Upload e gerenciamento de fotos</li>
                      <li>• Configuração de eventos</li>
                      <li>• Suporte técnico</li>
                    </ul>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm md:text-base">Para Clientes:</h4>
                    <ul className="text-xs md:text-sm text-muted-foreground space-y-1 ml-4">
                      <li>• Ajuda com compras</li>
                      <li>• Problemas com downloads</li>
                      <li>• Dúvidas sobre eventos</li>
                      <li>• Suporte geral</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Formulário de Contato */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg md:text-xl">Envie sua Mensagem</CardTitle>
                <CardDescription className="text-sm md:text-base">
                  Preencha o formulário abaixo e responderemos em breve
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="nome" className="text-sm font-medium">Nome</Label>
                      <Input id="nome" placeholder="Seu nome completo" className="text-base" />
                    </div>
                    <div>
                      <Label htmlFor="email" className="text-sm font-medium">E-mail</Label>
                      <Input id="email" type="email" placeholder="seu@email.com" className="text-base" />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="telefone" className="text-sm font-medium">Telefone (opcional)</Label>
                    <Input id="telefone" placeholder="(11) 99999-9999" className="text-base" />
                  </div>
                  
                  <div>
                    <Label htmlFor="assunto" className="text-sm font-medium">Assunto</Label>
                    <Input id="assunto" placeholder="Como podemos ajudar?" className="text-base" />
                  </div>
                  
                  <div>
                    <Label htmlFor="mensagem" className="text-sm font-medium">Mensagem</Label>
                    <Textarea 
                      id="mensagem" 
                      placeholder="Descreva sua dúvida ou solicitação..."
                      rows={5}
                      className="text-base"
                    />
                  </div>
                  
                  <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 text-base font-medium">
                    Enviar Mensagem
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* FAQ Rápido */}
          <div className="mt-12 md:mt-16">
            <h2 className="text-xl md:text-2xl font-bold text-center mb-6 md:mb-8">Perguntas Frequentes</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base md:text-lg">Como comprar fotos?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm md:text-base text-muted-foreground">
                    Navegue pelos eventos, encontre suas fotos, adicione ao carrinho e finalize a compra com pagamento seguro.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base md:text-lg">Como me tornar fotógrafo?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm md:text-base text-muted-foreground">
                    Cadastre-se como fotógrafo na plataforma, aguarde aprovação e comece a criar seus eventos esportivos.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base md:text-lg">Problemas com download?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm md:text-base text-muted-foreground">
                    Entre em contato conosco imediatamente. Nosso suporte resolverá qualquer problema de download.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base md:text-lg">Qualidade das fotos?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm md:text-base text-muted-foreground">
                    Todas as fotos são entregues em alta resolução, sem marca d'água, prontas para impressão.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </MainLayout>
  );
};

export default Contato;