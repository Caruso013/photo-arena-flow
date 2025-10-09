import React from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, Target, Sparkles } from 'lucide-react';

const Sobre = () => {
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Sobre Nós
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Mudando a relação do futebol de base com a fotografia
          </p>
        </div>

        {/* Main Content Card */}
        <Card className="mb-12">
          <CardContent className="p-8 md:p-12">
            <div className="space-y-8">
              {/* Nossa História */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <Camera className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-bold">Nossa História</h2>
                </div>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  A ideia da STA nasceu de um sonho em 2022, revivido por <span className="font-semibold text-foreground">Kauan Castão</span> e <span className="font-semibold text-foreground">Kaiky Silva</span> com uma visão clara: mudar a relação do Futebol de base com a fotografia. Com a experiência adquirida e um olhar apurado para o mercado, transformamos aquela ideia inicial em uma empresa focada em elevar o padrão da mídia esportiva.
                </p>
              </section>

              {/* Nossa Missão */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <Target className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-bold">Nossa Missão</h2>
                </div>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Nossa Missão é clara: injetar profissionalismo e dinamismo na maneira como atletas, equipes e competições consomem e compartilham conteúdo. Não entregamos apenas fotos; entregamos a emoção da competição traduzida em conteúdo visual de ponta.
                </p>
              </section>

              {/* O que nos torna únicos */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <Sparkles className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-bold">O que nos torna únicos?</h2>
                </div>
                <p className="text-lg text-muted-foreground leading-relaxed mb-4">
                  Somos mais do que fotógrafos; somos criadores de ecossistemas de mídia. A STA é a única empresa de fotografia que oferece um pacote completo de mídias sociais, criando artes personalizadas, conteúdos variados e estratégias que vão além da "bolha" esportiva. Conectamos o público de fora ao talento e à qualidade dos atletas que trabalhamos.
                </p>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Guiados por tecnologia e foco total na experiência do cliente, garantimos que o atleta esteja no centro do nosso trabalho, do clique inicial à entrega final.
                </p>
              </section>
            </div>
          </CardContent>
        </Card>

        {/* Call to Action */}
        <div className="text-center py-12 px-6 rounded-xl bg-gradient-primary text-white shadow-elegant">
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 drop-shadow-lg">
              STA: Relembre a sua história.
            </h2>
            <p className="text-lg opacity-95 max-w-2xl mx-auto drop-shadow-md">
              Eternizando momentos e impulsionando carreiras através da fotografia esportiva de excelência
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Sobre;