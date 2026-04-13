import React, { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Upload, 
  Camera, 
  DollarSign, 
  BarChart3, 
  CalendarPlus, 
  CreditCard, 
  TrendingUp,
  Image,
  Target,
  User,
  Wallet
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PixRequiredAlert } from '@/components/photographer/PixRequiredAlert';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import UploadPhotoModal from '@/components/modals/UploadPhotoModal';
import CreateCampaignModal from '@/components/modals/CreateCampaignModal';
import PhotographerGoals from './PhotographerGoals';
import PhotographerEventsTab from './PhotographerEventsTab';
import { ProfileEditor } from '../profile/ProfileEditor';
import { SalesChart } from './SalesChart';
import { useSalesData } from '@/hooks/useSalesData';
import { usePhotographerBalance } from '@/hooks/usePhotographerBalance';
import WelcomeHeader from './WelcomeHeader';
import MetricCard from './MetricCard';
import RecentActivity, { ActivityItem } from './RecentActivity';

interface Campaign {
  id: string;
  title: string;
  description?: string;
  event_date?: string;
  location?: string;
  cover_image_url?: string;
  is_active: boolean;
  organization_percentage?: number;
  photographer_id?: string | null;
  organization_id?: string | null;
  created_at: string;
  updated_at: string;
  photos?: { count: number }[];
}

const PhotographerDashboard = () => {
  const { profile, user } = useAuth();
  const [chartDays, setChartDays] = useState(30);
  const { data: salesData, loading: loadingSales, refetch: refetchSales } = useSalesData(chartDays, user?.id);
  const balance = usePhotographerBalance();
  
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [recentSales, setRecentSales] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const handlePeriodChange = (days: number) => {
    setChartDays(days);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    await Promise.all([
      fetchCampaigns(),
      fetchRecentSales()
    ]);
    setLoading(false);
  };

  const fetchCampaigns = async () => {
    try {
      const { data: photosData } = await supabase
        .from('photos')
        .select('campaign_id')
        .eq('photographer_id', profile?.id);

      const campaignIds = [...new Set(photosData?.map(p => p.campaign_id) || [])];

      if (campaignIds.length === 0) {
        setCampaigns([]);
        return;
      }

      const { data } = await supabase
        .from('campaigns')
        .select('*, photos(count)')
        .in('id', campaignIds)
        .order('created_at', { ascending: false });

      setCampaigns(data || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    }
  };

  const fetchRecentSales = async () => {
    try {
      // Buscar vendas COM o photographer_amount da revenue_shares e original_url
      const { data } = await supabase
        .from('purchases')
        .select(`
          id, 
          amount, 
          created_at, 
          buyer_id, 
          buyer:profiles!purchases_buyer_id_fkey(full_name, email), 
          photo:photos(id, title, thumbnail_url, watermarked_url, original_url),
          revenue_shares(photographer_amount)
        `)
        .eq('photographer_id', profile?.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(100); // Buscar mais para permitir agrupamento

      // Agrupar vendas do mesmo comprador em janela de 5 minutos
      const groupedSales = groupSalesByBuyer(data || []);
      
      setRecentSales(groupedSales.slice(0, 10));
    } catch (error) {
      console.error('Error fetching recent sales:', error);
    }
  };

  // Função para agrupar vendas do mesmo comprador em intervalo de 1 hora
  const groupSalesByBuyer = (sales: any[]): ActivityItem[] => {
    const groups: Map<string, any[]> = new Map();
    
    sales.forEach(sale => {
      const timestamp = new Date(sale.created_at).getTime();
      // Agrupar por comprador + janela de 1 hora (mais flexível para compras juntas)
      const windowKey = `${sale.buyer_id}-${Math.floor(timestamp / (60 * 60 * 1000))}`;
      
      if (!groups.has(windowKey)) {
        groups.set(windowKey, []);
      }
      groups.get(windowKey)!.push(sale);
    });
    
    // Converter grupos em ActivityItems
    return Array.from(groups.values()).map(group => {
      const first = group[0];
      // Somar os ganhos do fotógrafo (não o valor bruto da venda)
      const totalEarnings = group.reduce((sum, s) => 
        sum + Number(s.revenue_shares?.[0]?.photographer_amount || 0), 0
      );
      const photoCount = group.length;
      
      // Coletar todas as fotos do grupo para download
      const allPhotos = group.map(sale => ({
        id: sale.photo?.id,
        title: sale.photo?.title,
        thumbnail_url: sale.photo?.thumbnail_url,
        watermarked_url: sale.photo?.watermarked_url,
        original_url: sale.photo?.original_url,
      })).filter(p => p.id);
      
      // Buscar email do comprador através do profile
      const buyerEmail = first.buyer?.email;
      
      return {
        id: first.id,
        type: 'sale' as const,
        title: first.buyer?.full_name || 'Cliente',
        description: photoCount > 1 
          ? `${photoCount} fotos` 
          : (first.photo?.title || 'Foto vendida'),
        timestamp: first.created_at,
        amount: totalEarnings, // Ganho do fotógrafo, NÃO valor da venda
        photoCount,
        photoUrl: first.photo?.thumbnail_url || first.photo?.watermarked_url,
        photoId: first.photo?.id,
        photos: allPhotos, // Todas as fotos para exibição
        buyerEmail,
      };
    }).sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  };


  if (loading) {
    return (
      <div className="space-y-6 p-4">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 sm:space-y-8">
        {/* PIX Required Alert */}
        <PixRequiredAlert variant="banner" />

        {/* Welcome Header */}
        <WelcomeHeader
          title="Painel do Fotógrafo 📸"
          subtitle="Gerencie seus eventos, fotos e acompanhe suas vendas"
          userName={profile?.full_name || undefined}
          avatarUrl={profile?.avatar_url || undefined}
          icon={Camera}
        />

        {/* Metric Cards */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <MetricCard
            title="Saldo Disponível"
            value={formatCurrency(balance.availableAmount)}
            subtitle="Pronto para saque"
            icon={DollarSign}
            variant="success"
          />
          <MetricCard
            title="A Liberar"
            value={formatCurrency(balance.pendingAmount)}
            subtitle="Aguardando 12h"
            icon={CreditCard}
            variant="warning"
          />
        </div>

        {/* Quick Actions with Create Event Modal */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Ações Rápidas</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            {/* Create Event Card - Special handling for modal */}
            <Card className="cursor-pointer hover:shadow-lg active:scale-[0.97] transition-all duration-200 border hover:border-primary/30 bg-card group overflow-hidden">
              <CardContent className="p-3 sm:p-4 lg:p-6 flex flex-col items-center justify-center text-center h-[100px] sm:h-[130px] lg:h-[160px]">
                <div className="h-10 w-10 sm:h-12 sm:w-12 mx-auto rounded-lg sm:rounded-xl bg-primary flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300 mb-2 sm:mb-3">
                  <CalendarPlus className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
                </div>
                <CreateCampaignModal onCampaignCreated={fetchData} />
              </CardContent>
            </Card>

            {/* Upload Photos */}
            <Card 
              className="cursor-pointer hover:shadow-lg active:scale-[0.97] transition-all duration-200 border hover:border-primary/30 bg-card group overflow-hidden"
              onClick={() => setShowUploadModal(true)}
            >
              <CardContent className="p-3 sm:p-4 lg:p-6 flex flex-col items-center justify-center text-center h-[100px] sm:h-[130px] lg:h-[160px]">
                <div className="h-10 w-10 sm:h-12 sm:w-12 mx-auto rounded-lg sm:rounded-xl bg-primary flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300 mb-2 sm:mb-3">
                  <Upload className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
                </div>
                <h4 className="font-semibold text-xs sm:text-sm text-foreground">Upload Fotos</h4>
              </CardContent>
            </Card>

            {/* Request Payout */}
            <Link to="/dashboard/photographer/payout">
              <Card className="cursor-pointer hover:shadow-lg active:scale-[0.97] transition-all duration-200 border hover:border-primary/30 bg-card group overflow-hidden">
                <CardContent className="p-3 sm:p-4 lg:p-6 flex flex-col items-center justify-center text-center h-[100px] sm:h-[130px] lg:h-[160px]">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 mx-auto rounded-lg sm:rounded-xl bg-primary flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300 mb-2 sm:mb-3">
                    <Wallet className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
                  </div>
                  <h4 className="font-semibold text-xs sm:text-sm text-foreground">Solicitar Saque</h4>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{formatCurrency(balance.availableAmount)}</p>
                </CardContent>
              </Card>
            </Link>

            {/* Reports */}
            <Link to="/dashboard/photographer/album-reports">
              <Card className="cursor-pointer hover:shadow-lg active:scale-[0.97] transition-all duration-200 border hover:border-primary/30 bg-card group overflow-hidden">
                <CardContent className="p-3 sm:p-4 lg:p-6 flex flex-col items-center justify-center text-center h-[100px] sm:h-[130px] lg:h-[160px]">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 mx-auto rounded-lg sm:rounded-xl bg-primary flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300 mb-2 sm:mb-3">
                    <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
                  </div>
                  <h4 className="font-semibold text-xs sm:text-sm text-foreground">Relatórios</h4>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Recent Sales */}
          <div className="lg:col-span-1">
            <RecentActivity 
              activities={recentSales}
              title="Últimas Vendas"
              emptyMessage="Nenhuma venda ainda"
            />
          </div>

          {/* Tabs */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="analytics" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4 h-auto sm:h-10 p-0.5 sm:p-1">
                <TabsTrigger value="analytics" className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1 py-1.5 sm:py-0 h-10 sm:h-9">
                  <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="text-[9px] sm:text-xs">Analytics</span>
                </TabsTrigger>
                <TabsTrigger value="events" className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1 py-1.5 sm:py-0 h-10 sm:h-9">
                  <Camera className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="text-[9px] sm:text-xs">Eventos</span>
                </TabsTrigger>
                <TabsTrigger value="goals" className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1 py-1.5 sm:py-0 h-10 sm:h-9">
                  <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="text-[9px] sm:text-xs">Metas</span>
                </TabsTrigger>
                <TabsTrigger value="profile" className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1 py-1.5 sm:py-0 h-10 sm:h-9">
                  <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="text-[9px] sm:text-xs">Perfil</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="analytics" className="space-y-4">
                {loadingSales ? (
                  <Card>
                    <CardContent className="p-4">
                      <div className="animate-pulse space-y-4">
                        <div className="h-4 bg-muted rounded w-1/3" />
                        <div className="h-[200px] bg-muted rounded" />
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <SalesChart 
                    data={salesData} 
                    onPeriodChange={handlePeriodChange}
                    selectedPeriod={chartDays}
                    showPeriodFilter={true}
                  />
                )}
              </TabsContent>

              <TabsContent value="events" className="space-y-4">
                <PhotographerEventsTab />
              </TabsContent>

              <TabsContent value="goals" className="space-y-4">
                <PhotographerGoals />
              </TabsContent>

              <TabsContent value="profile" className="space-y-4">
                <ProfileEditor />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Upload Modal - using Dialog pattern */}
      {showUploadModal && (
        <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
          <DialogContent className="max-w-2xl">
            <UploadPhotoModal 
              onClose={() => setShowUploadModal(false)}
              onUploadComplete={() => {
                setShowUploadModal(false);
                fetchData();
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default PhotographerDashboard;
