import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Star, Calendar, MapPin, Image as ImageIcon, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Campaign {
  id: string;
  title: string;
  location: string | null;
  event_date: string | null;
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
  cover_image_url: string | null;
  photographer_id: string | null;
}

export const FeaturedEventsManager = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('is_active', true)
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error('Erro ao buscar campanhas:', error);
      toast.error('Erro ao carregar eventos');
    } finally {
      setLoading(false);
    }
  };

  const toggleFeatured = async (campaignId: string, currentValue: boolean) => {
    try {
      setUpdating(campaignId);
      
      const { error } = await supabase
        .from('campaigns')
        .update({ is_featured: !currentValue })
        .eq('id', campaignId);

      if (error) throw error;

      // Atualizar estado local
      setCampaigns(prev =>
        prev.map(c =>
          c.id === campaignId ? { ...c, is_featured: !currentValue } : c
        )
      );

      toast.success(
        !currentValue
          ? 'Evento adicionado aos destaques!'
          : 'Evento removido dos destaques'
      );
    } catch (error) {
      console.error('Erro ao atualizar destaque:', error);
      toast.error('Erro ao atualizar evento');
    } finally {
      setUpdating(null);
    }
  };

  const featuredCount = campaigns.filter(c => c.is_featured).length;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 bg-muted rounded w-1/3 animate-pulse"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded animate-pulse"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="bg-gradient-to-r from-yellow-50 to-transparent dark:from-yellow-950/20">
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-600" />
            Gerenciar Eventos em Destaque
          </CardTitle>
          <CardDescription>
            Escolha quais eventos aparecem na seção de destaques da página inicial
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="mb-6 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Eventos em Destaque Ativos</p>
                <p className="text-xs text-muted-foreground">
                  Recomendamos manter entre 3-6 eventos em destaque
                </p>
              </div>
              <Badge variant={featuredCount > 6 ? 'destructive' : 'default'} className="text-lg px-4 py-2">
                {featuredCount}
              </Badge>
            </div>
          </div>

          <div className="space-y-3">
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className={`
                  border rounded-lg p-4 transition-all duration-200
                  ${campaign.is_featured 
                    ? 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900' 
                    : 'bg-card hover:bg-muted/50'
                  }
                `}
              >
                <div className="flex items-start gap-4">
                  {/* Thumbnail */}
                  <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                    {campaign.cover_image_url ? (
                      <img
                        src={campaign.cover_image_url}
                        alt={campaign.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-base truncate">
                        {campaign.title}
                      </h3>
                      {campaign.is_featured && (
                        <Badge variant="default" className="gap-1 flex-shrink-0">
                          <Star className="h-3 w-3" />
                          Destaque
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-1 text-sm text-muted-foreground">
                      {campaign.event_date && (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>
                            {new Date(campaign.event_date).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                      )}
                      {campaign.location && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" />
                          <span className="truncate">{campaign.location}</span>
                        </div>
                      )}
                      <div className="text-xs">
                        Criado{' '}
                        {formatDistanceToNow(new Date(campaign.created_at), {
                          addSuffix: true,
                          locale: ptBR
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Toggle */}
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={campaign.is_featured}
                      onCheckedChange={() => toggleFeatured(campaign.id, campaign.is_featured)}
                      disabled={updating === campaign.id}
                    />
                    {updating === campaign.id && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                </div>
              </div>
            ))}

            {campaigns.length === 0 && (
              <div className="text-center py-12">
                <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhum evento ativo encontrado</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
