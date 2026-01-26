import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Camera, 
  Calendar,
  MessageSquare,
  ExternalLink,
  Award,
  Settings,
  Loader2
} from "lucide-react";

interface PhotographerApplication {
  id: string;
  status: string;
  portfolio_url: string | null;
  experience_years: number | null;
  equipment: string | null;
  message: string | null;
  created_at: string;
  processed_at: string | null;
  rejection_reason: string | null;
}

interface PhotographerApplicationStatusProps {
  onShowApplicationForm: () => void;
}

export const PhotographerApplicationStatus = ({ onShowApplicationForm }: PhotographerApplicationStatusProps) => {
  const [application, setApplication] = useState<PhotographerApplication | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    const fetchApplication = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from("photographer_applications")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1);

        if (error) {
          console.error("Erro na query de candidatura:", error);
          throw error;
        }

        setApplication(data?.[0] || null);
      } catch (error) {
        console.error("Erro ao buscar candidatura:", error);
        toast({
          title: "Erro ao carregar candidatura",
          description: "Ocorreu um erro ao buscar sua candidatura. Tente novamente.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchApplication();
  }, [user, toast]);

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "pending":
        return {
          label: "Aguardando análise",
          icon: Clock,
          variant: "secondary" as const,
          color: "text-yellow-600",
          bgColor: "bg-yellow-50",
          borderColor: "border-yellow-200",
        };
      case "approved":
        return {
          label: "Aprovado",
          icon: CheckCircle,
          variant: "default" as const,
          color: "text-green-600",
          bgColor: "bg-green-50",
          borderColor: "border-green-200",
        };
      case "rejected":
        return {
          label: "Rejeitado",
          icon: XCircle,
          variant: "destructive" as const,
          color: "text-red-600",
          bgColor: "bg-red-50",
          borderColor: "border-red-200",
        };
      default:
        return {
          label: status,
          icon: Clock,
          variant: "secondary" as const,
          color: "text-muted-foreground",
          bgColor: "bg-muted",
          borderColor: "border-border",
        };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Carregando candidatura...
        </CardContent>
      </Card>
    );
  }

  if (!application) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Torne-se um fotógrafo
          </CardTitle>
          <CardDescription>
            Você ainda não enviou uma candidatura para se tornar fotógrafo credenciado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">
              Cadastre-se como fotógrafo e comece a monetizar seus trabalhos em eventos!
            </p>
            <Button onClick={onShowApplicationForm} className="w-full sm:w-auto">
              <Camera className="mr-2 h-4 w-4" />
              Enviar candidatura
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const statusInfo = getStatusInfo(application.status);
  const StatusIcon = statusInfo.icon;

  return (
    <Card className={`w-full max-w-2xl mx-auto ${statusInfo.bgColor} ${statusInfo.borderColor}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Candidatura para Fotógrafo
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant={statusInfo.variant} className="flex items-center gap-1">
            <StatusIcon className="h-3 w-3" />
            {statusInfo.label}
          </Badge>
          {application.processed_at && (
            <span className="text-sm text-muted-foreground">
              Processado em {formatDate(application.processed_at)}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Calendar className="h-4 w-4" />
              Data da candidatura
            </div>
            <p className="text-sm text-muted-foreground">
              {formatDate(application.created_at)}
            </p>
          </div>

          {application.experience_years && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Award className="h-4 w-4" />
                Experiência
              </div>
              <p className="text-sm text-muted-foreground">
                {application.experience_years} anos
              </p>
            </div>
          )}
        </div>

        {application.portfolio_url && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ExternalLink className="h-4 w-4" />
              Portfolio
            </div>
            <a
              href={application.portfolio_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800 underline break-all"
            >
              {application.portfolio_url}
            </a>
          </div>
        )}

        {application.equipment && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Settings className="h-4 w-4" />
              Equipamentos
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {application.equipment}
            </p>
          </div>
        )}

        {application.message && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <MessageSquare className="h-4 w-4" />
              Mensagem
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {application.message}
            </p>
          </div>
        )}

        {application.status === "rejected" && application.rejection_reason && (
          <div className={`p-4 rounded-lg ${statusInfo.bgColor} ${statusInfo.borderColor} border`}>
            <div className="flex items-center gap-2 text-sm font-medium text-red-700 mb-2">
              <XCircle className="h-4 w-4" />
              Motivo da rejeição
            </div>
            <p className="text-sm text-red-600 whitespace-pre-wrap">
              {application.rejection_reason}
            </p>
          </div>
        )}

        {application.status === "approved" && (
          <div className={`p-4 rounded-lg ${statusInfo.bgColor} ${statusInfo.borderColor} border`}>
            <div className="flex items-center gap-2 text-sm font-medium text-green-700 mb-2">
              <CheckCircle className="h-4 w-4" />
              Parabéns! Você foi aprovado!
            </div>
            <p className="text-sm text-green-600 mb-3">
              Sua conta foi atualizada para fotógrafo. Recarregue a página para ver as novas funcionalidades.
            </p>
            <Button
              onClick={() => window.location.reload()}
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
            >
              Recarregar Página
            </Button>
          </div>
        )}

        {application.status === "pending" && (
          <div className={`p-4 rounded-lg ${statusInfo.bgColor} ${statusInfo.borderColor} border`}>
            <div className="flex items-center gap-2 text-sm font-medium text-yellow-700 mb-2">
              <Clock className="h-4 w-4" />
              Análise em andamento
            </div>
            <p className="text-sm text-yellow-600">
              Sua candidatura está sendo analisada pela nossa equipe. Você receberá um email com o resultado em breve.
            </p>
          </div>
        )}

        {application.status === "rejected" && (
          <div className="pt-4 border-t">
            <Button 
              onClick={onShowApplicationForm} 
              variant="outline" 
              className="w-full sm:w-auto"
            >
              <Camera className="mr-2 h-4 w-4" />
              Enviar nova candidatura
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};