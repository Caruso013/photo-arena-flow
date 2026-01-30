import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AdminLayout from '@/components/dashboard/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { 
  ArrowLeft, 
  Users, 
  CheckCircle2, 
  Clock, 
  RefreshCw,
  Calendar,
  MapPin,
  UserPlus
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import CreateMesarioModal from '@/components/organization/CreateMesarioModal';

interface Campaign {
  id: string;
  title: string;
  event_date: string;
  location: string;
}

interface PhotographerAttendance {
  id: string;
  full_name: string;
  avatar_url?: string;
  status: 'present' | 'waiting';
  confirmed_at?: string;
}

const EventAttendance = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [photographers, setPhotographers] = useState<PhotographerAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showMesarioModal, setShowMesarioModal] = useState(false);

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const fetchData = async () => {
    try {
      // Buscar campanha
      const { data: campaignData, error: campaignError } = await supabase
        .from('campaigns')
        .select('id, title, event_date, location')
        .eq('id', id)
        .single();

      if (campaignError) throw campaignError;
      setCampaign(campaignData);

      // Buscar fotógrafos aprovados
      const { data: applications, error: appError } = await supabase
        .from('event_applications')
        .select('photographer_id')
        .eq('campaign_id', id)
        .eq('status', 'approved');

      if (appError) throw appError;

      // Buscar perfis dos fotógrafos
      const photographerIds = (applications || []).map(a => a.photographer_id);
      
      const { data: photographerProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', photographerIds);

      const profilesMap = new Map(
        (photographerProfiles || []).map(p => [p.id, p])
      );

      // Buscar presenças confirmadas
      const { data: attendances, error: attError } = await supabase
        .from('event_attendance')
        .select('photographer_id, confirmed_at')
        .eq('campaign_id', id);

      if (attError) throw attError;

      // Mapear dados
      const attendanceMap = new Map(
        attendances?.map(a => [a.photographer_id, a.confirmed_at]) || []
      );

      const photographersList: PhotographerAttendance[] = (applications || []).map(app => {
        const photographerProfile = profilesMap.get(app.photographer_id);
        return {
          id: app.photographer_id,
          full_name: photographerProfile?.full_name || 'Sem nome',
          avatar_url: photographerProfile?.avatar_url,
          status: attendanceMap.has(app.photographer_id) ? 'present' : 'waiting',
          confirmed_at: attendanceMap.get(app.photographer_id)
        };
      });

      // Ordenar: presentes primeiro, depois por nome
      photographersList.sort((a, b) => {
        if (a.status === 'present' && b.status !== 'present') return -1;
        if (a.status !== 'present' && b.status === 'present') return 1;
        return a.full_name.localeCompare(b.full_name);
      });

      setPhotographers(photographersList);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const presentCount = photographers.filter(p => p.status === 'present').length;
  const totalCount = photographers.length;
  const percentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  if (profile?.role !== 'admin') {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-2">Acesso Negado</h2>
          <p className="text-muted-foreground">Apenas administradores podem acessar esta página</p>
        </div>
      </AdminLayout>
    );
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Lista de Chamada</h1>
              <p className="text-muted-foreground">{campaign?.title}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button onClick={() => setShowMesarioModal(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Criar Mesário
            </Button>
          </div>
        </div>

        {/* Event Info */}
        {campaign && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {campaign.event_date 
                    ? format(new Date(campaign.event_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                    : 'Data não definida'
                  }
                </span>
                {campaign.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {campaign.location}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalCount}</p>
                  <p className="text-sm text-muted-foreground">Aprovados</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{presentCount}</p>
                  <p className="text-sm text-muted-foreground">Presentes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Taxa de Presença</p>
                  <p className="text-lg font-bold">{percentage}%</p>
                </div>
                <Progress value={percentage} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Photographers List */}
        <Card>
          <CardHeader>
            <CardTitle>Fotógrafos</CardTitle>
            <CardDescription>
              Lista de fotógrafos aprovados e status de presença
            </CardDescription>
          </CardHeader>
          <CardContent>
            {photographers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum fotógrafo aprovado para este evento</p>
              </div>
            ) : (
              <div className="space-y-2">
                {photographers.map((photographer) => (
                  <div 
                    key={photographer.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={photographer.avatar_url} />
                        <AvatarFallback>
                          {photographer.full_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{photographer.full_name}</p>
                        {photographer.confirmed_at && (
                          <p className="text-xs text-muted-foreground">
                            Entrada: {format(new Date(photographer.confirmed_at), 'HH:mm', { locale: ptBR })}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {photographer.status === 'present' ? (
                      <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Presente
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                        <Clock className="h-3 w-3 mr-1" />
                        Aguardando
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal para criar mesário */}
      {campaign && (
        <CreateMesarioModal
          open={showMesarioModal}
          onOpenChange={setShowMesarioModal}
          campaignId={campaign.id}
          campaignTitle={campaign.title}
        />
      )}
    </AdminLayout>
  );
};

export default EventAttendance;
