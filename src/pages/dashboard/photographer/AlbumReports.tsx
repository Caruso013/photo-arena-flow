import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import { Folder, DollarSign, Camera, TrendingUp, Image, ShoppingCart, Percent, BarChart3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface AlbumReport {
  album_id: string;
  album_title: string;
  campaign_title: string;
  photos_sold: number;
  total_revenue: number;
  avg_photo_price: number;
}

interface OverallMetrics {
  total_photos_uploaded: number;
  total_photos_sold: number;
  conversion_rate: number;
  avg_photos_per_order: number;
  active_carts: number;
}

const AlbumReports = () => {
  const { user } = useAuth();
  const [albums, setAlbums] = useState<AlbumReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalPhotosSold, setTotalPhotosSold] = useState(0);
  const [metrics, setMetrics] = useState<OverallMetrics>({
    total_photos_uploaded: 0,
    total_photos_sold: 0,
    conversion_rate: 0,
    avg_photos_per_order: 0,
    active_carts: 0,
  });

  useEffect(() => {
    if (user) {
      fetchAlbumReports();
      fetchOverallMetrics();
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

  const fetchOverallMetrics = async () => {
    try {
      // Buscar total de fotos enviadas pelo fotógrafo
      const { count: totalPhotos } = await supabase
        .from('photos')
        .select('*', { count: 'exact', head: true })
        .eq('photographer_id', user?.id);

      // Buscar vendas completadas
      const { data: completedPurchases } = await supabase
        .from('purchases')
        .select('id, photo_id')
        .eq('photographer_id', user?.id)
        .eq('status', 'completed');

      // Contar fotos únicas vendidas
      const uniquePhotosSold = new Set(completedPurchases?.map(p => p.photo_id) || []).size;

      // Calcular média de fotos por pedido (agrupando por buyer)
      const purchasesByBuyer = completedPurchases?.reduce((acc: any, purchase) => {
        if (!acc[purchase.id]) acc[purchase.id] = [];
        acc[purchase.id].push(purchase);
        return acc;
      }, {}) || {};

      const totalOrders = Object.keys(purchasesByBuyer).length;
      const avgPhotosPerOrder = totalOrders > 0 
        ? (completedPurchases?.length || 0) / totalOrders 
        : 0;

      // Taxa de conversão
      const conversionRate = totalPhotos && totalPhotos > 0 
        ? (uniquePhotosSold / totalPhotos) * 100 
        : 0;

      setMetrics({
        total_photos_uploaded: totalPhotos || 0,
        total_photos_sold: uniquePhotosSold,
        conversion_rate: conversionRate,
        avg_photos_per_order: avgPhotosPerOrder,
        active_carts: 0, // Deixar como 0 por enquanto
      });
    } catch (error) {
      console.error('Erro ao buscar métricas gerais:', error);
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

      {/* Métricas Gerais - Estilo Instagram Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Métricas Gerais de Desempenho
          </CardTitle>
          <CardDescription>
            Visão geral das suas fotos e vendas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Linha 1 */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Fotos enviadas</p>
              <p className="text-3xl font-bold">{metrics.total_photos_uploaded}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Vendas de fotos</p>
              <p className="text-3xl font-bold">{totalPhotosSold}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Média de fotos por pedido</p>
              <p className="text-3xl font-bold">{metrics.avg_photos_per_order.toFixed(2)}</p>
            </div>

            {/* Linha 2 */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Taxa de conversão</p>
              <p className="text-3xl font-bold">{metrics.conversion_rate.toFixed(2)}%</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Álbuns com vendas</p>
              <p className="text-3xl font-bold">{albums.length}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Receita Total</p>
              <p className="text-3xl font-bold text-primary">{formatCurrency(totalRevenue)}</p>
            </div>

            {/* Barra de progresso de envios */}
            <div className="md:col-span-3 space-y-3 pt-4 border-t">
              <p className="text-sm font-medium">% de envios convertidos em vendas</p>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span>Fotos: {metrics.total_photos_uploaded}</span>
                    <span>Vendas: {metrics.total_photos_sold}</span>
                  </div>
                  <Progress value={metrics.conversion_rate} className="h-3" />
                </div>
                <Badge variant="secondary" className="text-lg px-4 py-2">
                  {metrics.conversion_rate.toFixed(1)}%
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards de Resumo por Álbum */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total (Álbuns)</CardTitle>
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
            <CardTitle className="text-sm font-medium">Fotos Vendidas (Álbuns)</CardTitle>
            <Camera className="h-5 w-5 text-accent-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPhotosSold}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total de vendas em álbuns
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Álbuns Ativos</CardTitle>
            <Folder className="h-5 w-5 text-secondary-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{albums.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Com vendas registradas
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