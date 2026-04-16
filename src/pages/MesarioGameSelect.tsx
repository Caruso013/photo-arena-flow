import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { getTransformedImageUrl } from '@/lib/supabaseImageTransform';
import { QrCode, LogOut, MapPin, Calendar, Camera, Clock, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MesarioSessionData {
  id: string;
  mesario_name: string;
  organization_id: string | null;
  organization: {
    id: string;
    name: string;
    logo_url?: string;
  } | null;
}

interface GameCampaign {
  id: string;
  title: string;
  event_date: string | null;
  location: string | null;
  cover_image_url: string | null;
  event_start_time: string | null;
  event_end_time: string | null;
}

const MesarioGameSelect = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<MesarioSessionData | null>(null);
  const [games, setGames] = useState<GameCampaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sessionData = sessionStorage.getItem('mesario_session');
    if (!sessionData) {
      navigate('/mesario');
      return;
    }

    const parsed = JSON.parse(sessionData);
    setSession(parsed);
    fetchTodaysGames(parsed.organization_id);
  }, [navigate]);

  const fetchTodaysGames = async (organizationId: string | null) => {
    try {
        const today = format(new Date(), 'yyyy-MM-dd');

      let query = supabase
        .from('campaigns')
        .select('id, title, event_date, location, cover_image_url, event_start_time, event_end_time')
        .eq('is_active', true)
        .eq('event_date', today);

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data, error } = await query.order('event_start_time', { ascending: true });

      if (error) throw error;
      setGames(data || []);
    } catch (err) {
      console.error('Erro ao buscar jogos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectGame = (game: GameCampaign) => {
    // Store selected campaign in session
    const sessionData = sessionStorage.getItem('mesario_session');
    if (sessionData) {
      const parsed = JSON.parse(sessionData);
      parsed.campaign = {
        id: game.id,
        title: game.title,
        event_date: game.event_date,
        location: game.location,
        cover_image_url: game.cover_image_url,
      };
      sessionStorage.setItem('mesario_session', JSON.stringify(parsed));
    }
    navigate('/mesario/scanner');
  };

  const handleLogout = () => {
    sessionStorage.removeItem('mesario_session');
    navigate('/mesario');
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-background via-muted/30 to-background flex flex-col overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b shrink-0">
        <div className="flex items-center justify-between h-14 px-3 sm:px-4 max-w-lg mx-auto w-full">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {session.organization?.logo_url ? (
              <img 
                src={session.organization.logo_url} 
                alt={session.organization.name}
                className="w-8 h-8 rounded-lg object-cover shrink-0"
              />
            ) : (
              <QrCode className="h-5 w-5 text-primary shrink-0" />
            )}
            <div className="min-w-0">
              <span className="font-semibold text-sm block leading-tight truncate">
                {session.organization?.name || 'Mesário'}
              </span>
              <span className="text-xs text-muted-foreground truncate block">{session.mesario_name}</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="shrink-0 ml-2">
            <LogOut className="h-4 w-4 mr-1" />
            Sair
          </Button>
        </div>
      </header>

      <main className="flex-1 px-3 sm:px-4 py-4 sm:py-6 max-w-lg mx-auto w-full">
        {/* Title */}
        <div className="text-center mb-5 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold mb-1">Qual seu jogo?</h1>
          <p className="text-muted-foreground text-xs sm:text-sm px-2">
            Selecione o jogo de hoje para validar fotógrafos
          </p>
          <Badge variant="outline" className="mt-2">
            <Calendar className="h-3 w-3 mr-1" />
            {format(new Date(), "dd 'de' MMMM, yyyy", { locale: ptBR })}
          </Badge>
        </div>

        {/* Games List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 sm:h-24 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        ) : games.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="text-center py-10 sm:py-12 px-4">
              <Calendar className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
              <h3 className="font-semibold mb-1 text-sm sm:text-base">Nenhum jogo hoje</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Não há jogos agendados para hoje
                {session.organization ? ` na ${session.organization.name}` : ''}.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {games.map((game) => (
              <Card 
                key={game.id} 
                className="overflow-hidden cursor-pointer hover:border-primary/50 transition-colors active:scale-[0.98]"
                onClick={() => handleSelectGame(game)}
              >
                <CardContent className="p-0">
                  <div className="flex gap-0">
                    {/* Thumbnail */}
                    <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 bg-muted">
                      {game.cover_image_url ? (
                        <img
                          src={getTransformedImageUrl(game.cover_image_url, 'thumbnail')}
                          alt={game.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary/5">
                          <Camera className="h-5 w-5 sm:h-6 sm:w-6 text-primary/30" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-2.5 sm:p-3 flex items-center justify-between gap-2 min-w-0">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-xs sm:text-sm leading-tight truncate">{game.title}</h3>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[10px] sm:text-xs text-muted-foreground">
                          {game.location && (
                            <span className="flex items-center gap-1 truncate">
                              <MapPin className="h-3 w-3 shrink-0" />
                              <span className="truncate">{game.location}</span>
                            </span>
                          )}
                          {game.event_start_time && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3 shrink-0" />
                              {game.event_start_time}
                              {game.event_end_time && ` - ${game.event_end_time}`}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default MesarioGameSelect;
