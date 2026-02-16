import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  MapPin,
  CalendarDays,
  
  DollarSign,
  Clock,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Camera,
  FileText,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { EventApplicationForm, type ApplicationFormData } from '@/components/events/EventApplicationForm';
import staLogo from '@/assets/sta-logo.png';

interface CampaignDetail {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  event_date: string | null;
  cover_image_url: string | null;
  applications_open: boolean;
  expected_audience: number | null;
  event_start_time: string | null;
  event_end_time: string | null;
  photo_price_display: number | null;
  available_slots: number | null;
  event_terms: string | null;
  event_terms_pdf_url: string | null;
  organization_id: string | null;
  photographer_percentage: number;
  organization?: { name: string; logo_url: string | null; primary_color: string | null } | null;
}

export default function EventApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [existingApplication, setExistingApplication] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const fetchData = useCallback(async () => {
    if (!id || !user) return;
    setLoading(true);
    try {
      const [campaignRes, appRes] = await Promise.all([
        supabase
          .from('campaigns')
          .select(`
            id, title, description, location, event_date,
            cover_image_url, applications_open, expected_audience,
            event_start_time, event_end_time, photo_price_display,
            available_slots, event_terms, event_terms_pdf_url,
            organization_id, photographer_percentage,
            organizations(name, logo_url, primary_color)
          `)
          .eq('id', id)
          .single(),
        supabase
          .from('event_applications')
          .select('*')
          .eq('campaign_id', id)
          .eq('photographer_id', user.id)
          .maybeSingle(),
      ]);

      if (campaignRes.error) throw campaignRes.error;
      setCampaign({
        ...campaignRes.data,
        organization: campaignRes.data.organizations as any,
      });
      setExistingApplication(appRes.data);
    } catch (err) {
      console.error('Erro ao buscar evento:', err);
      toast.error('Erro ao carregar detalhes do evento');
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async (data: ApplicationFormData) => {
    if (!user || !campaign) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('event_applications').insert({
        campaign_id: campaign.id,
        photographer_id: user.id,
        message: data.message || null,
        city: data.city,
        state: data.state,
        has_vehicle: data.has_vehicle,
        has_night_equipment: data.has_night_equipment,
        whatsapp: data.whatsapp,
        accepted_terms: data.accepted_terms,
        accepted_terms_at: data.accepted_terms ? new Date().toISOString() : null,
      });

      if (error) {
        if (error.code === '23505') {
          toast.error('Você já se candidatou para este evento');
        } else {
          throw error;
        }
        return;
      }

      toast.success('Candidatura enviada com sucesso! 🎉');
      fetchData();
    } catch (err: any) {
      console.error('Erro ao enviar candidatura:', err);
      toast.error('Erro ao enviar candidatura');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-12">
        <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-lg font-medium">Evento não encontrado</h2>
        <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
      </div>
    );
  }

  const orgName = campaign.organization?.name || 'STA Fotos';
  const orgLogo = campaign.organization?.logo_url || staLogo;
  const orgColor = campaign.organization?.primary_color || undefined;

  const applicationStatusMap: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    pending: { label: 'Candidatura em Análise', color: 'bg-amber-500/10 text-amber-700 border-amber-200 dark:text-amber-400 dark:border-amber-800', icon: <Clock className="h-5 w-5" /> },
    approved: { label: 'Candidatura Aprovada!', color: 'bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:text-emerald-400 dark:border-emerald-800', icon: <CheckCircle className="h-5 w-5" /> },
    rejected: { label: 'Candidatura Não Aprovada', color: 'bg-destructive/10 text-destructive border-destructive/20', icon: <XCircle className="h-5 w-5" /> },
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/photographer/applications')}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Voltar para eventos
      </Button>

      {/* Hero card */}
      <Card className="overflow-hidden border-2">
        <div className="relative aspect-[16/9] bg-muted overflow-hidden">
          {campaign.cover_image_url ? (
            <img src={campaign.cover_image_url} alt={campaign.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
              <Camera className="h-16 w-16 text-primary/40" />
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0">
            {campaign.applications_open ? (
              <div className="bg-primary/90 backdrop-blur-sm text-primary-foreground text-center py-2.5 text-sm font-semibold flex items-center justify-center gap-2">
                <CheckCircle className="h-4 w-4" /> Inscrições Abertas
              </div>
            ) : (
              <div className="bg-destructive/90 backdrop-blur-sm text-destructive-foreground text-center py-2.5 text-sm font-semibold flex items-center justify-center gap-2">
                <XCircle className="h-4 w-4" /> Inscrições Encerradas
              </div>
            )}
          </div>
        </div>

        <CardContent className="p-5 space-y-4">
          <h1 className="text-xl font-bold leading-tight">{campaign.title}</h1>
          {campaign.description && (
            <p className="text-sm text-muted-foreground">{campaign.description}</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {campaign.location && (
              <div className="flex items-center gap-2.5 text-sm">
                <MapPin className="h-4 w-4 text-primary shrink-0" />
                <span>{campaign.location}</span>
              </div>
            )}
            {campaign.event_date && (
              <div className="flex items-center gap-2.5 text-sm">
                <CalendarDays className="h-4 w-4 text-primary shrink-0" />
                <span>
                  {format(parseISO(campaign.event_date), "dd/MM/yyyy", { locale: ptBR })}
                  {campaign.event_start_time && campaign.event_end_time && (
                    <> - {campaign.event_start_time} às {campaign.event_end_time}</>
                  )}
                </span>
              </div>
            )}
            {campaign.photo_price_display != null && (
              <div className="flex items-center gap-2.5 text-sm">
                <DollarSign className="h-4 w-4 text-primary shrink-0" />
                <span>R$ {campaign.photo_price_display.toFixed(2).replace('.', ',')} por foto vendida</span>
              </div>
            )}
            {campaign.photographer_percentage > 0 && (
              <div className="flex items-center gap-2.5 text-sm">
                <DollarSign className="h-4 w-4 text-emerald-500 shrink-0" />
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  Você ganha {campaign.photographer_percentage}% por foto vendida
                </span>
              </div>
            )}
            {campaign.available_slots != null && (
              <div className="flex items-center gap-2.5 text-sm">
                <Camera className="h-4 w-4 text-primary shrink-0" />
                <span>{campaign.available_slots} vagas disponíveis</span>
              </div>
            )}
          </div>

          <Separator />

          <div className="flex items-center gap-3">
            <img src={orgLogo} alt={orgName} className="h-8 w-8 rounded-full object-contain border"
              style={orgColor ? { borderColor: orgColor } : undefined} />
            <div>
              <p className="text-xs text-muted-foreground">Organizado por</p>
              <p className="text-sm font-medium">{orgName}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Application status or inline form */}
      {existingApplication ? (
        <Card className={`border-2 ${applicationStatusMap[existingApplication.status]?.color || ''}`}>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              {applicationStatusMap[existingApplication.status]?.icon}
              <div>
                <p className="font-semibold">
                  {applicationStatusMap[existingApplication.status]?.label || existingApplication.status}
                </p>
                <p className="text-sm text-muted-foreground">
                  Enviada em {format(parseISO(existingApplication.applied_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : campaign.applications_open ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Formulário de Candidatura
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EventApplicationForm
              campaign={campaign}
              message={message}
              onMessageChange={setMessage}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              onCancel={() => navigate('/dashboard/photographer/applications')}
            />
          </CardContent>
        </Card>
      ) : (
        <Card className="border-2 border-destructive/20 bg-destructive/5">
          <CardContent className="p-5 text-center">
            <XCircle className="h-8 w-8 mx-auto text-destructive mb-2" />
            <p className="font-semibold text-destructive">Inscrições Encerradas</p>
            <p className="text-sm text-muted-foreground mt-1">
              As inscrições para este evento não estão mais disponíveis.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
