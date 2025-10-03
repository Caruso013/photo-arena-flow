import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Upload, Camera, Award, MessageSquare } from "lucide-react";

interface PhotographerApplicationFormProps {
  onApplicationSubmitted?: () => void;
}

export const PhotographerApplicationForm = ({ onApplicationSubmitted }: PhotographerApplicationFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [equipment, setEquipment] = useState("");
  const [message, setMessage] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Erro de autenticação",
        description: "Você precisa estar logado para enviar uma candidatura.",
        variant: "destructive",
      });
      return;
    }

    if (!portfolioUrl.trim()) {
      toast({
        title: "Portfolio necessário",
        description: "Por favor, forneça o link do seu portfolio.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from("photographer_applications")
        .insert({
          user_id: user.id,
          portfolio_url: portfolioUrl.trim(),
          experience_years: experienceYears ? parseInt(experienceYears) : null,
          equipment: equipment.trim() || null,
          message: message.trim() || null,
          status: "pending",
        });

      if (error) {
        // Check if it's a unique constraint violation (user already has pending application)
        if (error.code === "23505") {
          toast({
            title: "Candidatura já enviada",
            description: "Você já possui uma candidatura pendente. Aguarde a análise do nosso time.",
            variant: "destructive",
          });
          return;
        }
        throw error;
      }

      // Send confirmation email
      try {
        await supabase.functions.invoke('send-photographer-notification', {
          body: {
            email: user.email,
            name: user.user_metadata?.full_name || "Usuário",
            status: "submitted",
          },
        });
      } catch (emailError) {
        console.error("Erro ao enviar email de confirmação:", emailError);
        // Don't fail the application submission if email fails
      }

      toast({
        title: "Candidatura enviada com sucesso!",
        description: "Sua candidatura foi enviada para análise. Você receberá um email com o resultado em breve.",
      });

      // Reset form
      setPortfolioUrl("");
      setExperienceYears("");
      setEquipment("");
      setMessage("");
      
      onApplicationSubmitted?.();
    } catch (error) {
      console.error("Erro ao enviar candidatura:", error);
      toast({
        title: "Erro ao enviar candidatura",
        description: "Ocorreu um erro inesperado. Tente novamente ou entre em contato conosco.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Candidatura para Fotógrafo
        </CardTitle>
        <CardDescription>
          Envie sua candidatura para se tornar um fotógrafo credenciado na nossa plataforma.
          Analisaremos seu portfolio e entraremos em contato em breve.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="portfolio" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Link do Portfolio *
            </Label>
            <Input
              id="portfolio"
              type="url"
              placeholder="https://meuportfolio.com ou https://instagram.com/meuperfil"
              value={portfolioUrl}
              onChange={(e) => setPortfolioUrl(e.target.value)}
              required
              disabled={isLoading}
            />
            <p className="text-sm text-muted-foreground">
              Compartilhe o link do seu portfolio online (site pessoal, Instagram, Behance, etc.)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="experience" className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              Anos de experiência
            </Label>
            <Input
              id="experience"
              type="number"
              min="0"
              max="50"
              placeholder="Ex: 3"
              value={experienceYears}
              onChange={(e) => setExperienceYears(e.target.value)}
              disabled={isLoading}
            />
            <p className="text-sm text-muted-foreground">
              Quantos anos você trabalha como fotógrafo profissionalmente?
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="equipment">Equipamentos principais</Label>
            <Textarea
              id="equipment"
              placeholder="Ex: Canon EOS R5, Lentes 24-70mm f/2.8, 85mm f/1.4, Flash Godox..."
              value={equipment}
              onChange={(e) => setEquipment(e.target.value)}
              disabled={isLoading}
              rows={3}
            />
            <p className="text-sm text-muted-foreground">
              Liste seus principais equipamentos fotográficos (câmeras, lentes, acessórios)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Mensagem adicional
            </Label>
            <Textarea
              id="message"
              placeholder="Conte-nos um pouco sobre sua experiência, especialidades e por que quer fazer parte da nossa plataforma..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isLoading}
              rows={4}
            />
            <p className="text-sm text-muted-foreground">
              Fale sobre suas especialidades, experiências relevantes e motivação
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">O que analisamos:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Qualidade técnica e artística do portfolio</li>
              <li>• Experiência comprovada em fotografia de eventos</li>
              <li>• Profissionalismo e comprometimento</li>
              <li>• Adequação aos nossos padrões de qualidade</li>
            </ul>
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading || !portfolioUrl.trim()}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando candidatura...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Enviar candidatura
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Ao enviar sua candidatura, você concorda com nossos termos de uso e política de privacidade.
          </p>
        </form>
      </CardContent>
    </Card>
  );
};