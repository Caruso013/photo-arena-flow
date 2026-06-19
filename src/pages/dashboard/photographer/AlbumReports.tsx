import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import { Folder, DollarSign, Camera, TrendingUp, Image, ShoppingCart, Percent, BarChart3, PieChart as PieChartIcon, ChevronRight, Users, ScanSearch } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Link, useSearchParams } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface AlbumReport {
  album_id: string;
  album_title: string;
  campaign_title: string;
  photos_sold: number;
  total_revenue: number;
  avg_photo_price: number;
  unique_buyers: number; // Quantidade de compradores únicos
  avg_ticket: number;    // Ticket médio = receita / compradores
}

interface OverallMetrics {
  total_photos_uploaded: number;
  total_photos_sold: number;
  conversion_rate: number;
  avg_photos_per_order: number;
  active_carts: number;
}

const PIE_COLORS = ['#F59E0B', '#3B82F6', '#10B981', '#8B5CF6', '#EF4444', '#14B8A6'];

const AlbumReports = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const campaignFilter = searchParams.get('campaign');
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
  }, [user, campaignFilter]);

  // Helper para paginação (evitar limite de 1000 registros do Supabase)
  const fetchAllFromTable = async (buildQuery: (from: number, to: number) => any) => {
    const PAGE_SIZE = 1000;
    let all: any[] = [];
    let from = 0;
    while (true) {
      const { data, error } = await buildQuery(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      all = [...all, ...(data || [])];
      if (!data || data.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }
    return all;
  };

  const fetchAlbumReports = async () => {
    try {
      setLoading(true);

      // Buscar revenue_shares do fotógrafo com informações de álbum e buyer (COM PAGINAÇÃO)
      const revenueData = await fetchAllFromTable((from, to) =>
        supabase
          .from('revenue_shares')
          .select(`
            *,
            purchases!revenue_shares_purchase_id_fkey(
              buyer_id,
              photos!purchases_photo_id_fkey(
                sub_event_id,
                price,
                campaign_id,
                sub_events:sub_events!photos_sub_event_id_fkey(
                  id,
                  title,
                  campaigns!sub_events_campaign_id_fkey(
                    id,
                    title
                  )
                )
              )
            )
          `)
          .eq('photographer_id', user?.id)
          .range(from, to)
      );

      const filteredRevenueData = campaignFilter
        ? revenueData.filter((revenue: any) => revenue.purchases?.photos?.sub_events?.campaigns?.id === campaignFilter)
        : revenueData;

      // Agrupar por álbum (com tracking de compradores únicos)
      const albumMap = new Map<string, AlbumReport & { buyers: Set<string> }>();
      let totalRev = 0;
      let totalPhotos = 0;

      filteredRevenueData?.forEach((revenue: any) => {
        const purchase = revenue.purchases;
        const photo = purchase?.photos;
        const subEvent = photo?.sub_events;
        const campaign = subEvent?.campaigns;
        const buyerId = purchase?.buyer_id;

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
            unique_buyers: 0,
            avg_ticket: 0,
            buyers: new Set<string>(),
          });
        }

        const albumReport = albumMap.get(albumId)!;
        albumReport.photos_sold += 1;
        albumReport.total_revenue += photographerAmount;
        if (buyerId) {
          albumReport.buyers.add(buyerId);
        }
      });

      // Calcular médias e ticket médio
      const albumReports = Array.from(albumMap.values()).map(album => {
        const uniqueBuyers = album.buyers.size;
        return {
          album_id: album.album_id,
          album_title: album.album_title,
          campaign_title: album.campaign_title,
          photos_sold: album.photos_sold,
          total_revenue: Math.round(album.total_revenue * 100) / 100,
          avg_photo_price: album.photos_sold > 0 ? Math.round((album.total_revenue / album.photos_sold) * 100) / 100 : 0,
          unique_buyers: uniqueBuyers,
          avg_ticket: uniqueBuyers > 0 ? Math.round((album.total_revenue / uniqueBuyers) * 100) / 100 : 0,
        };
      }).sort((a, b) => b.total_revenue - a.total_revenue);

      setAlbums(albumReports);
      setTotalRevenue(Math.round(totalRev * 100) / 100);
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
      const photosQuery = supabase
        .from('photos')
        .select('*', { count: 'exact', head: true })
        .eq('photographer_id', user?.id);

      if (campaignFilter) {
        photosQuery.eq('campaign_id', campaignFilter);
      }

      const { count: totalPhotos } = await photosQuery;

      // Buscar vendas completadas (COM PAGINAÇÃO)
      const completedPurchases = await fetchAllFromTable((from, to) =>
        supabase
          .from('purchases')
          .select('id, photo_id, photos!inner(campaign_id)')
          .eq('photographer_id', user?.id)
          .eq('status', 'completed')
          .range(from, to)
      );

      const filteredPurchases = campaignFilter
        ? completedPurchases.filter((purchase: any) => purchase.photos?.campaign_id === campaignFilter)
        : completedPurchases;

      // Contar fotos únicas vendidas
      const uniquePhotosSold = new Set(filteredPurchases?.map((p: any) => p.photo_id) || []).size;

      // Calcular média de fotos por pedido (agrupando por buyer)
      const purchasesByBuyer = filteredPurchases?.reduce((acc: any, purchase) => {
        if (!acc[purchase.id]) acc[purchase.id] = [];
        acc[purchase.id].push(purchase);
        return acc;
      }, {}) || {};

      const totalOrders = Object.keys(purchasesByBuyer).length;
      const avgPhotosPerOrder = totalOrders > 0 
        ? (filteredPurchases?.length || 0) / totalOrders 
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
        active_carts: 0,
      });
    } catch (error) {
      console.error('Erro ao buscar métricas gerais:', error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 p-3 sm:p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    );
  }

  const topAlbums = albums.slice(0, 6);
  const pieData = topAlbums.map((album) => ({
    name: album.album_title,
    value: album.total_revenue,
  }));

  return (
    <div className="space-y-6 p-3 sm:p-6">
      <div className="space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Relatórios por Álbum</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Análise direta de vendas, compradores e receita por álbum.
            </p>
          </div>
          {campaignFilter && (
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                Relatório individual do evento
              </Badge>
              <Button asChild variant="ghost" size="sm" className="h-9 px-3">
                <Link to="/dashboard/photographer/album-reports">Limpar filtro</Link>
              </Button>
            </div>
          )}
        </div>

        <Card className="border-amber-200/60 bg-gradient-to-r from-amber-50 via-white to-blue-50">
          <CardContent className="p-4 sm:p-5">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <ScanSearch className="h-4 w-4 text-primary" />
                  Resumo visual
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-2xl border bg-white/90 p-3 shadow-sm">
                    <p className="text-xs text-muted-foreground">Fotos enviadas</p>
                    <p className="mt-1 text-xl sm:text-2xl font-bold">{metrics.total_photos_uploaded}</p>
                  </div>
                  <div className="rounded-2xl border bg-white/90 p-3 shadow-sm">
                    <p className="text-xs text-muted-foreground">Fotos vendidas</p>
                    <p className="mt-1 text-xl sm:text-2xl font-bold">{totalPhotosSold}</p>
                  </div>
                  <div className="rounded-2xl border bg-white/90 p-3 shadow-sm">
                    <p className="text-xs text-muted-foreground">Álbuns com vendas</p>
                    <p className="mt-1 text-xl sm:text-2xl font-bold">{albums.length}</p>
                  </div>
                  <div className="rounded-2xl border bg-white/90 p-3 shadow-sm">
                    <p className="text-xs text-muted-foreground">Receita total</p>
                    <p className="mt-1 text-lg sm:text-xl font-bold text-primary">{formatCurrency(totalRevenue)}</p>
                  </div>
                </div>
                <div className="rounded-2xl border bg-white/90 p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3 text-sm mb-2">
                    <span className="font-medium">Conversão de envios em vendas</span>
                    <span className="font-semibold text-primary">{metrics.conversion_rate.toFixed(1)}%</span>
                  </div>
                  <Progress value={metrics.conversion_rate} className="h-3" />
                  <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                    <span>{metrics.total_photos_uploaded} fotos</span>
                    <span>{metrics.total_photos_sold} vendidas</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border bg-white/90 p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <PieChartIcon className="h-4 w-4 text-primary" />
                  Receita por álbum
                </div>
                {pieData.length > 0 ? (
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={55}
                          outerRadius={90}
                          paddingAngle={2}
                        >
                          {pieData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex h-72 items-center justify-center rounded-2xl border border-dashed text-sm text-muted-foreground">
                    Sem dados suficientes para o gráfico.
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Receita total</CardTitle>
            <DollarSign className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-primary">{formatCurrency(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">De todos os álbuns</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Fotos vendidas</CardTitle>
            <Camera className="h-5 w-5 text-accent-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{totalPhotosSold}</div>
            <p className="text-xs text-muted-foreground mt-1">Total de vendas em álbuns</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Compradores únicos</CardTitle>
            <Users className="h-5 w-5 text-secondary-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{albums.reduce((sum, album) => sum + album.unique_buyers, 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">Audiência que comprou</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Taxa de conversão</CardTitle>
            <Percent className="h-5 w-5 text-secondary-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{metrics.conversion_rate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">Envios convertidos</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Folder className="h-5 w-5" />
            Desempenho por Álbum
          </CardTitle>
          <CardDescription>
            Receitas e métricas principais de cada álbum.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          {albums.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhum álbum com vendas ainda</p>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {albums.map((album, index) => (
                <Card key={album.album_id} className="overflow-hidden">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-wrap items-start gap-2">
                        {index < 3 && (
                          <Badge variant={index === 0 ? 'default' : 'secondary'} className="shrink-0">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            #{index + 1}
                          </Badge>
                        )}
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-base sm:text-lg line-clamp-2">{album.album_title}</h3>
                          <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-1">{album.campaign_title}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                        <div className="rounded-xl border bg-muted/30 p-3">
                          <p className="text-xs text-muted-foreground">Fotos vendidas</p>
                          <p className="mt-1 font-semibold text-base">{album.photos_sold}</p>
                        </div>
                        <div className="rounded-xl border bg-muted/30 p-3">
                          <p className="text-xs text-muted-foreground">Compradores</p>
                          <p className="mt-1 font-semibold text-base">{album.unique_buyers}</p>
                        </div>
                        <div className="rounded-xl border bg-muted/30 p-3">
                          <p className="text-xs text-muted-foreground">Receita</p>
                          <p className="mt-1 font-semibold text-base text-green-600">{formatCurrency(album.total_revenue)}</p>
                        </div>
                        <div className="rounded-xl border bg-muted/30 p-3">
                          <p className="text-xs text-muted-foreground">Ticket médio</p>
                          <p className="mt-1 font-semibold text-base text-primary">{formatCurrency(album.avg_ticket)}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
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