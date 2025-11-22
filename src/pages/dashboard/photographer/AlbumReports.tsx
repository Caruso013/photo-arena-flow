import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import { Folder, DollarSign, Camera, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface AlbumReport {
  album_id: string;
  album_title: string;
  campaign_title: string;
  photos_sold: number;
  total_revenue: number;
  avg_photo_price: number;
}

const AlbumReports = () => {
  const { user } = useAuth();
  const [albums, setAlbums] = useState<AlbumReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalPhotosSold, setTotalPhotosSold] = useState(0);

  useEffect(() => {
    if (user) {
      fetchAlbumReports();
    }
  }, [user]);

  const fetchAlbumReports = async () => {
    try {
      setLoading(true);

      // Buscar revenue_shares do fotógrafo com informações de álbum
      const { data: revenueData, error } = await supabase
        .from('revenue_shares')
        .select(`
          *,
          purchases!revenue_shares_purchase_id_fkey(
            photos!purchases_photo_id_fkey(
              sub_event_id,
              price,
              sub_events:sub_events!photos_sub_event_id_fkey(
                id,
                title,
                campaigns!sub_events_campaign_id_fkey(
                  title
                )
              )
            )
          )
        `)
        .eq('photographer_id', user?.id);

      if (error) throw error;

      // Agrupar por álbum
      const albumMap = new Map<string, AlbumReport>();
      let totalRev = 0;
      let totalPhotos = 0;

      revenueData?.forEach((revenue: any) => {
        const photo = revenue.purchases?.photos;
        const subEvent = photo?.sub_events;
        const campaign = subEvent?.campaigns;

        if (!subEvent) return; // Fotos sem álbum

        const albumId = subEvent.id;
        const photographerAmount = Number(revenue.photographer_amount || 0);
        
        totalRev += photographerAmount;
        totalPhotos++;

        if (!albumMap.has(albumId)) {
          albumMap.set(albumId, {
            album_id: albumId,
            album_title: subEvent.title,
            campaign_title: campaign?.title || 'Sem campanha',
            photos_sold: 0,
            total_revenue: 0,
            avg_photo_price: 0,
          });
        }

        const albumReport = albumMap.get(albumId)!;
        albumReport.photos_sold += 1;
        albumReport.total_revenue += photographerAmount;
      });

      // Calcular médias
      const albumReports = Array.from(albumMap.values()).map(album => ({
        ...album,
        avg_photo_price: album.photos_sold > 0 ? album.total_revenue / album.photos_sold : 0,
      })).sort((a, b) => b.total_revenue - a.total_revenue);

      setAlbums(albumReports);
      setTotalRevenue(totalRev);
      setTotalPhotosSold(totalPhotos);
    } catch (error) {
      console.error('Erro ao buscar relatórios de álbuns:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Relatórios por Álbum</h1>
        <p className="text-muted-foreground mt-2">
          Análise detalhada de vendas por álbum
        </p>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <DollarSign className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              De todos os álbuns
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fotos Vendidas</CardTitle>
            <Camera className="h-5 w-5 text-accent-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPhotosSold}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total de vendas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Álbuns com Vendas</CardTitle>
            <Folder className="h-5 w-5 text-secondary-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{albums.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total de álbuns ativos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Álbuns */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Folder className="h-5 w-5" />
            Desempenho por Álbum
          </CardTitle>
          <CardDescription>
            Receita e vendas detalhadas de cada álbum
          </CardDescription>
        </CardHeader>
        <CardContent>
          {albums.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhum álbum com vendas ainda
            </p>
          ) : (
            <div className="space-y-4">
              {albums.map((album, index) => (
                <Card key={album.album_id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {index < 3 && (
                          <Badge variant={index === 0 ? 'default' : 'secondary'}>
                            <TrendingUp className="h-3 w-3 mr-1" />
                            #{index + 1}
                          </Badge>
                        )}
                        <h3 className="font-semibold text-lg">{album.album_title}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {album.campaign_title}
                      </p>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Fotos Vendidas</p>
                          <p className="font-semibold">{album.photos_sold}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Receita Total</p>
                          <p className="font-semibold text-green-600">
                            {formatCurrency(album.total_revenue)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Ticket Médio</p>
                          <p className="font-semibold">
                            {formatCurrency(album.avg_photo_price)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AlbumReports;