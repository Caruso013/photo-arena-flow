import { Wrench, Clock, Mail } from "lucide-react";

export default function MaintenanceMode() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Icon */}
        <div className="relative mx-auto w-24 h-24">
          <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
          <div className="relative bg-primary/10 rounded-full w-24 h-24 flex items-center justify-center">
            <Wrench className="w-12 h-12 text-primary animate-pulse" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-foreground">
            Site em Manutenção
          </h1>
          <p className="text-muted-foreground text-lg">
            Estamos realizando melhorias para oferecer uma experiência ainda melhor.
          </p>
        </div>

        {/* Info Card */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-center gap-2 text-primary">
            <Clock className="w-5 h-5" />
            <span className="font-medium">Voltaremos em breve!</span>
          </div>
          
          <p className="text-sm text-muted-foreground">
            Nossa equipe está trabalhando para trazer novidades e melhorias no sistema de pagamentos.
          </p>
        </div>

        {/* Contact */}
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Mail className="w-4 h-4" />
          <span>Dúvidas? Entre em contato: </span>
          <a 
            href="mailto:contato@stafotos.com" 
            className="text-primary hover:underline"
          >
            contato@stafotos.com
          </a>
        </div>

        {/* Footer */}
        <p className="text-xs text-muted-foreground/60">
          © {new Date().getFullYear()} STA Fotos. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
