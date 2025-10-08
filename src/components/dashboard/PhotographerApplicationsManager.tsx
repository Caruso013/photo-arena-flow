import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Eye, 
  ExternalLink,
  Filter,
  Search,
  Award,
  Settings,
  MessageSquare,
  Calendar,
  User,
  Loader2,
  Mail
} from "lucide-react";

interface PhotographerApplication {
  id: string;
  user_id: string;
  status: string;
  portfolio_url: string | null;
  experience_years: number | null;
  equipment: string | null;
  message: string | null;
  created_at: string;
  processed_at: string | null;
  processed_by: string | null;
  rejection_reason: string | null;
  profiles: {
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

export const PhotographerApplicationsManager = () => {
  const [applications, setApplications] = useState<PhotographerApplication[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<PhotographerApplication[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<PhotographerApplication | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [rejectionReason, setRejectionReason] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchApplications();
  }, []);

  useEffect(() => {
    filterApplications();
  }, [applications, searchTerm, statusFilter]);

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from("photographer_applications")
        .select(`
          *,
          profiles!photographer_applications_user_id_fkey (
            full_name,
            email,
            avatar_url
          )
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erro na query:", error);
        throw error;
      }
      
      setApplications(data || []);
    } catch (error) {
      console.error("Erro ao buscar candidaturas:", error);
      toast({
        title: "Erro ao carregar candidaturas",
        description: "Ocorreu um erro ao buscar as candidaturas. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterApplications = () => {
    let filtered = applications;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(app => 
        app.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.profiles?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter(app => app.status === statusFilter);
    }

    setFilteredApplications(filtered);
  };

  const handleViewApplication = (application: PhotographerApplication) => {
    setSelectedApplication(application);
    setRejectionReason("");
  };

  const handleApprove = async () => {
    if (!selectedApplication || !user) return;

    setIsProcessing(true);
    try {
      // Start a transaction to update both application status and user role
      const { error: applicationError } = await supabase
        .from("photographer_applications")
        .update({
          status: "approved",
          processed_at: new Date().toISOString(),
          processed_by: user.id,
          rejection_reason: null,
        })
        .eq("id", selectedApplication.id);

      if (applicationError) throw applicationError;

      // Update user role to photographer
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          role: "photographer",
        })
        .eq("id", selectedApplication.user_id);

      if (profileError) throw profileError;

      // Send approval email notification
      await sendEmailNotification(selectedApplication, "approved");

      toast({
        title: "Candidatura aprovada!",
        description: "O usuário foi promovido a fotógrafo e será notificado por email.",
      });

      setSelectedApplication(null);
      fetchApplications();
    } catch (error) {
      console.error("Erro ao aprovar candidatura:", error);
      toast({
        title: "Erro ao aprovar candidatura",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApplication || !user || !rejectionReason.trim()) {
      toast({
        title: "Motivo necessário",
        description: "Por favor, forneça um motivo para a rejeição.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from("photographer_applications")
        .update({
          status: "rejected",
          processed_at: new Date().toISOString(),
          processed_by: user.id,
          rejection_reason: rejectionReason.trim(),
        })
        .eq("id", selectedApplication.id);

      if (error) throw error;

      // Send rejection email notification
      await sendEmailNotification(selectedApplication, "rejected", rejectionReason.trim());

      toast({
        title: "Candidatura rejeitada",
        description: "O usuário será notificado sobre a rejeição por email.",
      });

      setSelectedApplication(null);
      setRejectionReason("");
      fetchApplications();
    } catch (error) {
      console.error("Erro ao rejeitar candidatura:", error);
      toast({
        title: "Erro ao rejeitar candidatura",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const sendEmailNotification = async (
    application: PhotographerApplication, 
    status: "approved" | "rejected", 
    rejectionReason?: string
  ) => {
    try {
      const { data, error } = await supabase.functions.invoke('send-photographer-notification', {
        body: {
          email: application.profiles?.email,
          name: application.profiles?.full_name || "Usuário",
          status,
          rejectionReason,
        },
      });

      if (error) {
        console.error("Erro ao enviar email de notificação:", error);
        return;
      }

      console.log("Email de notificação enviado com sucesso:", data);
    } catch (error) {
      console.error("Erro ao enviar email de notificação:", error);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "pending":
        return {
          label: "Pendente",
          icon: Clock,
          variant: "secondary" as const,
          color: "text-yellow-600",
        };
      case "approved":
        return {
          label: "Aprovado",
          icon: CheckCircle,
          variant: "default" as const,
          color: "text-green-600",
        };
      case "rejected":
        return {
          label: "Rejeitado",
          icon: XCircle,
          variant: "destructive" as const,
          color: "text-red-600",
        };
      default:
        return {
          label: status,
          icon: Clock,
          variant: "secondary" as const,
          color: "text-gray-600",
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

  const getStatistics = () => {
    const total = applications.length;
    const pending = applications.filter(app => app.status === "pending").length;
    const approved = applications.filter(app => app.status === "approved").length;
    const rejected = applications.filter(app => app.status === "rejected").length;

    return { total, pending, approved, rejected };
  };

  const stats = getStatistics();

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Carregando candidaturas...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Gerenciar Candidaturas de Fotógrafos
          </CardTitle>
          <CardDescription>
            Analise e processe candidaturas para se tornarem fotógrafos credenciados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Statistics */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-blue-600">Total</p>
                  <p className="text-2xl font-bold text-blue-700">{stats.total}</p>
                </div>
              </div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="text-sm text-yellow-600">Pendentes</p>
                  <p className="text-2xl font-bold text-yellow-700">{stats.pending}</p>
                </div>
              </div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-green-600">Aprovados</p>
                  <p className="text-2xl font-bold text-green-700">{stats.approved}</p>
                </div>
              </div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-sm text-red-600">Rejeitados</p>
                  <p className="text-2xl font-bold text-red-700">{stats.rejected}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por nome, email ou ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="approved">Aprovados</SelectItem>
                <SelectItem value="rejected">Rejeitados</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Applications List */}
          {filteredApplications.length === 0 ? (
            <div className="text-center py-8">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma candidatura encontrada</h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== "all" 
                  ? "Tente ajustar os filtros de busca" 
                  : "Ainda não há candidaturas para revisar"
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredApplications.map((application) => {
                const statusInfo = getStatusInfo(application.status);
                const StatusIcon = statusInfo.icon;

                return (
                  <Card key={application.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                              {application.profiles?.full_name?.charAt(0) || "U"}
                            </div>
                            <div>
                              <h4 className="font-medium">
                                {application.profiles?.full_name || "Nome não informado"}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {application.profiles?.email}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {formatDate(application.created_at)}
                            </div>
                            {application.experience_years && (
                              <div className="flex items-center gap-1">
                                <Award className="h-4 w-4" />
                                {application.experience_years} anos
                              </div>
                            )}
                            <Badge variant={statusInfo.variant} className="flex items-center gap-1">
                              <StatusIcon className="h-3 w-3" />
                              {statusInfo.label}
                            </Badge>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewApplication(application)}
                            className="gap-1"
                          >
                            <Eye className="h-4 w-4" />
                            Analisar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Application Details Modal */}
      <Dialog open={selectedApplication !== null} onOpenChange={() => setSelectedApplication(null)}>
        <DialogContent className="max-w-4xl w-[90vw] max-h-[90vh] overflow-y-auto">
          {selectedApplication && (
            <div className="space-y-6">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Candidatura de {selectedApplication.profiles?.full_name || "Usuário"}
                </DialogTitle>
                <DialogDescription>
                  Analise os detalhes da candidatura e tome uma decisão
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* User Info */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Informações do Candidato</h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                        {selectedApplication.profiles?.full_name?.charAt(0) || "U"}
                      </div>
                      <div>
                        <p className="font-medium">
                          {selectedApplication.profiles?.full_name || "Nome não informado"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {selectedApplication.profiles?.email}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <Label className="text-sm font-medium">Data da candidatura</Label>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(selectedApplication.created_at)}
                        </p>
                      </div>

                      {selectedApplication.experience_years && (
                        <div>
                          <Label className="text-sm font-medium">Anos de experiência</Label>
                          <p className="text-sm text-muted-foreground">
                            {selectedApplication.experience_years} anos
                          </p>
                        </div>
                      )}

                      <div>
                        <Label className="text-sm font-medium">Status atual</Label>
                        <div className="mt-1">
                          <Badge variant={getStatusInfo(selectedApplication.status).variant} className="flex items-center gap-1 w-fit">
                            {(() => {
                              const StatusIcon = getStatusInfo(selectedApplication.status).icon;
                              return <StatusIcon className="h-3 w-3" />;
                            })()}
                            {getStatusInfo(selectedApplication.status).label}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Application Details */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Detalhes da Candidatura</h3>
                  
                  <div className="space-y-4">
                    {selectedApplication.portfolio_url && (
                      <div>
                        <Label className="text-sm font-medium flex items-center gap-1">
                          <ExternalLink className="h-4 w-4" />
                          Portfolio
                        </Label>
                        <a
                          href={selectedApplication.portfolio_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800 underline break-all block mt-1"
                        >
                          {selectedApplication.portfolio_url}
                        </a>
                      </div>
                    )}

                    {selectedApplication.equipment && (
                      <div>
                        <Label className="text-sm font-medium flex items-center gap-1">
                          <Settings className="h-4 w-4" />
                          Equipamentos
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                          {selectedApplication.equipment}
                        </p>
                      </div>
                    )}

                    {selectedApplication.message && (
                      <div>
                        <Label className="text-sm font-medium flex items-center gap-1">
                          <MessageSquare className="h-4 w-4" />
                          Mensagem
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                          {selectedApplication.message}
                        </p>
                      </div>
                    )}

                    {selectedApplication.status === "rejected" && selectedApplication.rejection_reason && (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                        <Label className="text-sm font-medium text-red-700 flex items-center gap-1">
                          <XCircle className="h-4 w-4" />
                          Motivo da rejeição
                        </Label>
                        <p className="text-sm text-red-600 mt-1 whitespace-pre-wrap">
                          {selectedApplication.rejection_reason}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Section */}
              {selectedApplication.status === "pending" && (
                <div className="border-t pt-6">
                  <h3 className="font-semibold text-lg mb-4">Processar Candidatura</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="rejection-reason">Motivo da rejeição (obrigatório para rejeitar)</Label>
                      <Textarea
                        id="rejection-reason"
                        placeholder="Descreva o motivo da rejeição de forma clara e construtiva..."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        rows={3}
                      />
                    </div>

                    <DialogFooter className="gap-2">
                      <Button
                        variant="destructive"
                        onClick={handleReject}
                        disabled={isProcessing || !rejectionReason.trim()}
                        className="gap-2"
                      >
                        {isProcessing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                        Rejeitar
                      </Button>
                      <Button
                        onClick={handleApprove}
                        disabled={isProcessing}
                        className="gap-2"
                      >
                        {isProcessing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4" />
                        )}
                        Aprovar
                      </Button>
                    </DialogFooter>
                  </div>
                </div>
              )}

              {selectedApplication.status !== "pending" && (
                <div className="border-t pt-6">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Processado em {selectedApplication.processed_at && formatDate(selectedApplication.processed_at)}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};