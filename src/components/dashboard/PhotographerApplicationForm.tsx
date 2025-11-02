import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { Camera, CheckCircle2, Clock, XCircle, AlertCircle } from 'lucide-react';
import { z } from 'zod';

const applicationSchema = z.object({
  message: z.string().trim().min(50, 'A mensagem deve ter pelo menos 50 caracteres').max(1000, 'Mensagem muito longa'),
  portfolio_url: z.string().trim().url('URL inválida').optional().or(z.literal('')),
  equipment: z.string().trim().max(500, 'Descrição muito longa').optional(),
  experience_years: z.number().min(0, 'Anos de experiência inválido').max(50, 'Valor muito alto')
});

interface Application {
  id: string;
  status: string;
  message: string;
  portfolio_url: string | null;
  equipment: string | null;
  experience_years: number | null;
  applied_at: string;
  rejection_reason: string | null;
}

export const PhotographerApplicationForm = () => {
  const { user } = useAuth();
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    message: '',
    portfolio_url: '',
    equipment: '',
    experience_years: 0
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    fetchApplication();
  }, [user]);

  const fetchApplication = async () => {
    if (!user) return;

    try {
      const { data, error } = await (supabase as any)
        .from('photographer_applications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setApplication(data as Application | null);
    } catch (error) {
      console.error('Error fetching application:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    try {
      applicationSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: { [key: string]: string } = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: "Faça login",
        description: "Você precisa estar autenticado para enviar a solicitação.",
        variant: "destructive",
      });
      return;
    }

    if (!validateForm()) {
      toast({
        title: "Erro de validação",
        description: "Por favor, corrija os erros no formulário.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);

      const { error } = await (supabase as any)
        .from('photographer_applications')
        .insert({
          user_id: user?.id,
          message: formData.message,
          portfolio_url: formData.portfolio_url || null,
          equipment: formData.equipment || null,
          experience_years: formData.experience_years,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Solicitação enviada!",
        description: "Sua solicitação foi enviada com sucesso. Você será notificado quando for processada.",
      });

      // Reset form and fetch updated application
      setFormData({
        message: '',
        portfolio_url: '',
        equipment: '',
        experience_years: 0
      });
      fetchApplication();
    } catch (error: any) {
      console.error('Error submitting application:', error);
      toast({
        title: "Erro ao enviar",
        description: error.message || "Não foi possível enviar sua solicitação. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500"><Clock className="h-3 w-3 mr-1" /> Pendente</Badge>;
      case 'approved':
        return <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" /> Aprovada</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Rejeitada</Badge>;
      default:
        return null;
    }
  };

  // If user has a pending or approved application
  if (application && application.status !== 'rejected') {
    return (
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" />
              <CardTitle>Sua Solicitação para Fotógrafo</CardTitle>
            </div>
            {getStatusBadge(application.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {application.status === 'pending' && (
            <div className="flex items-start gap-2 p-4 bg-accent/10 border border-accent/20 rounded-lg">
              <Clock className="h-5 w-5 text-accent-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-foreground">Solicitação em análise</p>
                <p className="text-sm text-muted-foreground">
                  Nossa equipe está analisando sua solicitação. Você será notificado em breve!
                </p>
              </div>
            </div>
          )}
          
          {application.status === 'approved' && (
            <div className="flex items-start gap-2 p-4 bg-success/10 border border-success/20 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-foreground">Parabéns! Você foi aprovado!</p>
                <p className="text-sm text-muted-foreground">
                  Sua conta foi atualizada para fotógrafo. Recarregue a página para ver as novas funcionalidades.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-medium">Mensagem enviada:</Label>
            <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
              {application.message}
            </p>
          </div>

          {application.portfolio_url && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Portfólio:</Label>
              <a 
                href={application.portfolio_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                {application.portfolio_url}
              </a>
            </div>
          )}

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Solicitado em: {new Date(application.applied_at).toLocaleDateString('pt-BR')}</span>
            <span>{application.experience_years} anos de experiência</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show application form
  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Camera className="h-5 w-5 text-primary" />
          <CardTitle>Torne-se um Fotógrafo</CardTitle>
        </div>
        <CardDescription>
          Preencha o formulário abaixo para solicitar acesso como fotógrafo profissional na plataforma
        </CardDescription>
      </CardHeader>
      <CardContent>
        {application?.status === 'rejected' && (
          <div className="mb-4 flex items-start gap-2 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-foreground">Solicitação anterior rejeitada</p>
              {application.rejection_reason && (
                <p className="text-sm text-muted-foreground mt-1">
                  Motivo: {application.rejection_reason}
                </p>
              )}
              <p className="text-sm text-muted-foreground mt-1">
                Você pode enviar uma nova solicitação.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="message">
              Por que você quer ser fotógrafo? <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="message"
              placeholder="Conte-nos sobre sua paixão pela fotografia, experiência e por que você quer fazer parte da nossa plataforma..."
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className={errors.message ? 'border-red-500' : ''}
              rows={5}
            />
            {errors.message && (
              <p className="text-sm text-red-500">{errors.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Mínimo de 50 caracteres. {formData.message.length}/1000
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="experience_years">
              Anos de experiência <span className="text-red-500">*</span>
            </Label>
            <Input
              id="experience_years"
              type="number"
              min="0"
              max="50"
              placeholder="0"
              value={formData.experience_years}
              onChange={(e) => setFormData({ ...formData, experience_years: parseInt(e.target.value) || 0 })}
              className={errors.experience_years ? 'border-red-500' : ''}
            />
            {errors.experience_years && (
              <p className="text-sm text-red-500">{errors.experience_years}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="portfolio_url">
              Link do Portfólio (opcional)
            </Label>
            <Input
              id="portfolio_url"
              type="url"
              placeholder="https://seuportfolio.com"
              value={formData.portfolio_url}
              onChange={(e) => setFormData({ ...formData, portfolio_url: e.target.value })}
              className={errors.portfolio_url ? 'border-red-500' : ''}
            />
            {errors.portfolio_url && (
              <p className="text-sm text-red-500">{errors.portfolio_url}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="equipment">
              Equipamento fotográfico (opcional)
            </Label>
            <Textarea
              id="equipment"
              placeholder="Descreva suas câmeras, lentes e outros equipamentos..."
              value={formData.equipment}
              onChange={(e) => setFormData({ ...formData, equipment: e.target.value })}
              className={errors.equipment ? 'border-red-500' : ''}
              rows={3}
            />
            {errors.equipment && (
              <p className="text-sm text-red-500">{errors.equipment}</p>
            )}
          </div>

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Enviando...
              </>
            ) : (
              <>
                <Camera className="h-4 w-4 mr-2" />
                Enviar Solicitação
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};