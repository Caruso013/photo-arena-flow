import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  MapPin,
  Users,
  Camera,
  Search,
  CalendarDays,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  ClipboardList,
  Inbox,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import staLogo from '@/assets/sta-logo.png';

interface CampaignWithApplication {
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
  organization_id: string | null;
  organization?: { name: string; logo_url: string | null; primary_color: string | null } | null;
  my_application_status?: string | null;
  my_applied_at?: string | null;
}

export default function EventApplications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<CampaignWithApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!user) return;
    fetchCampaigns();
  }, [user]);

  const fetchCampaigns = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: campaignsData, error } = await supabase
        .from('campaigns')
        .select(`
          id, title, description, location, event_date,
          cover_image_url, applications_open, expected_audience,
          event_start_time, event_end_time, photo_price_display,
          available_slots, organization_id, is_active,
          organizations(name, logo_url, primary_color)
        `)
        .eq('is_active', true)
        .order('event_date', { ascending: true, nullsFirst: false });

      if (error) throw error;

      const { data: myApplications } = await supabase
        .from('event_applications')
        .select('campaign_id, status, applied_at')
        .eq('photographer_id', user.id);

      const appMap = new Map(
        myApplications?.map(a => [a.campaign_id, { status: a.status, applied_at: a.applied_at }]) || []
      );

      const enriched = (campaignsData || [])
        .filter(c => c.organization_id !== null || appMap.has(c.id) || (c as any).applications_open)
        .map(c => ({
          ...c,
          organization: c.organizations as any,
          my_application_status: appMap.get(c.id)?.status || null,
          my_applied_at: appMap.get(c.id)?.applied_at || null,
        }));

      setCampaigns(enriched);
    } catch (err) {
      console.error('Erro ao buscar eventos:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = campaigns.filter(c =>
    c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.location?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const available = filtered.filter(c => !c.my_application_status && c.applications_open);
  const applied = filtered.filter(c => c.my_application_status);

  const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
    pending: { label: 'Em Análise', variant: 'secondary', icon: <Clock className="h-3 w-3" /> },
    approved: { label: 'Aprovado', variant: 'default', icon: <CheckCircle className="h-3 w-3" /> },
    rejected: { label: 'Não Aprovado', variant: 'destructive', icon: <XCircle className="h-3 w-3" /> },
  };

  const renderCard = (campaign: CampaignWithApplication) => (
    <Card
      key={campaign.id}
      className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
      onClick={() => navigate(`/dashboard/photographer/apply/${campaign.id}`)}
    >
      <div className="relative aspect-[16/10] bg-muted overflow-hidden">
        {campaign.cover_image_url ? (
          <img
            src={campaign.cover_image_url}
            alt={campaign.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
            <Camera className="h-12 w-12 text-primary/40" />
          </div>
        )}

        {campaign.my_application_status && (
          <div className="absolute top-2 right-2">
            <Badge variant={statusConfig[campaign.my_application_status]?.variant || 'outline'} className="gap-1 shadow-sm">
              {statusConfig[campaign.my_application_status]?.icon}
              {statusConfig[campaign.my_application_status]?.label || campaign.my_application_status}
            </Badge>
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0">
          {campaign.applications_open ? (
            <div className="bg-primary/90 backdrop-blur-sm text-primary-foreground text-center py-2 text-sm font-semibold flex items-center justify-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Inscrições Abertas
            </div>
          ) : (
            <div className="bg-destructive/90 backdrop-blur-sm text-destructive-foreground text-center py-2 text-sm font-semibold flex items-center justify-center gap-2">
              <XCircle className="h-4 w-4" />
              Inscrições Encerradas
            </div>
          )}
        </div>
      </div>

      <CardContent className="p-4 space-y-3">
        <h3 className="font-bold text-base leading-tight line-clamp-2">{campaign.title}</h3>

        <div className="space-y-1.5 text-sm text-muted-foreground">
          {campaign.location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{campaign.location}</span>
            </div>
          )}
          {campaign.event_date && (
            <div className="flex items-center gap-2">
              <CalendarDays className="h-3.5 w-3.5 shrink-0" />
              <span>
                {format(parseISO(campaign.event_date), "dd/MM/yyyy", { locale: ptBR })}
                {campaign.event_start_time && campaign.event_end_time && (
                  <> - {campaign.event_start_time} às {campaign.event_end_time}</>
                )}
              </span>
            </div>
          )}
          {campaign.photo_price_display != null && (
            <div className="flex items-center gap-2">
              <DollarSign className="h-3.5 w-3.5 shrink-0" />
              <span>R$ {campaign.photo_price_display.toFixed(2).replace('.', ',')} por foto</span>
            </div>
          )}
          {campaign.expected_audience != null && (
            <div className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 shrink-0" />
              <span>{campaign.expected_audience.toLocaleString('pt-BR')} pessoas</span>
            </div>
          )}
        </div>

        {campaign.my_applied_at && (
          <p className="text-xs text-muted-foreground pt-1 border-t">
            Candidatou-se em {format(parseISO(campaign.my_applied_at), "dd/MM/yyyy", { locale: ptBR })}
          </p>
        )}

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            {campaign.organization?.logo_url ? (
              <img src={campaign.organization.logo_url} alt={campaign.organization.name} className="h-6 w-6 rounded-full object-cover" />
            ) : (
              <img src={staLogo} alt="STA Fotos" className="h-6 w-6 rounded-full object-contain" />
            )}
            <span className="text-xs text-muted-foreground truncate">
              {campaign.organization?.name || 'STA Fotos'}
            </span>
          </div>
          {campaign.available_slots != null && (
            <Badge variant="outline" className="text-xs">{campaign.available_slots} vagas</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const EmptyState = ({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle: string }) => (
    <Card>
      <CardContent className="py-12 text-center">
        <Icon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <img src={staLogo} alt="STA Fotos" className="h-10 w-10 rounded-lg object-contain" />
        <div>
          <h1 className="text-2xl font-bold">Candidaturas para Eventos</h1>
          <p className="text-sm text-muted-foreground">Encontre eventos e acompanhe suas candidaturas</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar evento por nome ou local..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-48 w-full" />
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Tabs defaultValue="available" className="space-y-4">
          <TabsList>
            <TabsTrigger value="available" className="gap-2">
              <ClipboardList className="h-4 w-4" />
              Disponíveis ({available.length})
            </TabsTrigger>
            <TabsTrigger value="applied" className="gap-2">
              <Inbox className="h-4 w-4" />
              Minhas Candidaturas ({applied.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="available">
            {available.length === 0 ? (
              <EmptyState icon={Camera} title="Nenhum evento disponível" subtitle="Não há eventos com inscrições abertas no momento." />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {available.map(renderCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="applied">
            {applied.length === 0 ? (
              <EmptyState icon={Inbox} title="Nenhuma candidatura" subtitle="Você ainda não se candidatou para nenhum evento." />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {applied.map(renderCard)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
