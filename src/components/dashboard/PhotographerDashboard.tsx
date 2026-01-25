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
      const { data } = await supabase
        .from('purchases')
        .select(`
          id, 
          amount, 
          created_at, 
          buyer_id, 
          buyer:profiles!purchases_buyer_id_fkey(full_name, email), 
          photo:photos(id, title, thumbnail_url, watermarked_url)
        `)
        .eq('photographer_id', profile?.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(10);

      const activities: ActivityItem[] = (data || []).map((sale: any) => ({
        id: sale.id,
        type: 'sale' as const,
        title: sale.buyer?.full_name || 'Cliente',
        description: sale.photo?.title || 'Foto vendida',
        timestamp: sale.created_at,
        amount: Number(sale.amount),
        buyerId: sale.buyer_id,
        buyerEmail: sale.buyer?.email,
        photoId: sale.photo?.id,
        photoUrl: sale.photo?.thumbnail_url || sale.photo?.watermarked_url,
      }));

      setRecentSales(activities);
    } catch (error) {
      console.error('Error fetching recent sales:', error);
    }
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
          <MetricCard
            title="Vendas do Mês"
            value={balance.monthlySales}
            subtitle={`${balance.totalSales} total`}
            icon={TrendingUp}
            variant="primary"
          />
          <MetricCard
            title="Fotos Publicadas"
            value={balance.totalPhotos}
            subtitle={`${balance.conversionRate.toFixed(1)}% conversão`}
            icon={Image}
            variant="default"
          />
        </div>

        {/* Quick Actions with Create Event Modal */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Ações Rápidas</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Create Event Card - Special handling for modal */}
            <Card className="cursor-pointer hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 border hover:border-primary/30 bg-card group overflow-hidden">
              <CardContent className="p-4 sm:p-6 flex flex-col items-center justify-center text-center h-[140px] sm:h-[160px]">
                <div className="h-12 w-12 sm:h-14 sm:w-14 mx-auto rounded-xl bg-primary flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:scale-110 transition-all duration-300 mb-3">
                  <CalendarPlus className="h-6 w-6 sm:h-7 sm:w-7 text-primary-foreground" />
                </div>
                <CreateCampaignModal onCampaignCreated={fetchData} />
              </CardContent>
            </Card>

            {/* Upload Photos */}
            <Card 
              className="cursor-pointer hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 border hover:border-primary/30 bg-card group overflow-hidden"
              onClick={() => setShowUploadModal(true)}
            >
              <CardContent className="p-4 sm:p-6 flex flex-col items-center justify-center text-center h-[140px] sm:h-[160px]">
                <div className="h-12 w-12 sm:h-14 sm:w-14 mx-auto rounded-xl bg-primary flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:scale-110 transition-all duration-300 mb-3">
                  <Upload className="h-6 w-6 sm:h-7 sm:w-7 text-primary-foreground" />
                </div>
                <h4 className="font-semibold text-sm sm:text-base text-foreground">Upload Fotos</h4>
              </CardContent>
            </Card>

            {/* Request Payout */}
            <Link to="/dashboard/photographer/payout">
              <Card className="cursor-pointer hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 border hover:border-primary/30 bg-card group overflow-hidden">
                <CardContent className="p-4 sm:p-6 flex flex-col items-center justify-center text-center h-[140px] sm:h-[160px]">
                  <div className="h-12 w-12 sm:h-14 sm:w-14 mx-auto rounded-xl bg-primary flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:scale-110 transition-all duration-300 mb-3">
                    <Wallet className="h-6 w-6 sm:h-7 sm:w-7 text-primary-foreground" />
                  </div>
                  <h4 className="font-semibold text-sm sm:text-base text-foreground">Solicitar Saque</h4>
                  <p className="text-xs text-muted-foreground mt-1">{formatCurrency(balance.availableAmount)}</p>
                </CardContent>
              </Card>
            </Link>

            {/* Reports */}
            <Link to="/dashboard/photographer/album-reports">
              <Card className="cursor-pointer hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 border hover:border-primary/30 bg-card group overflow-hidden">
                <CardContent className="p-4 sm:p-6 flex flex-col items-center justify-center text-center h-[140px] sm:h-[160px]">
                  <div className="h-12 w-12 sm:h-14 sm:w-14 mx-auto rounded-xl bg-primary flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:scale-110 transition-all duration-300 mb-3">
                    <BarChart3 className="h-6 w-6 sm:h-7 sm:w-7 text-primary-foreground" />
                  </div>
                  <h4 className="font-semibold text-sm sm:text-base text-foreground">Relatórios</h4>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
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
              <TabsList className="grid w-full grid-cols-4 h-auto sm:h-10 p-1">
                <TabsTrigger value="analytics" className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1 py-2 sm:py-0 h-12 sm:h-9">
                  <BarChart3 className="h-4 w-4" />
                  <span className="text-[10px] sm:text-xs">Analytics</span>
                </TabsTrigger>
                <TabsTrigger value="events" className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1 py-2 sm:py-0 h-12 sm:h-9">
                  <Camera className="h-4 w-4" />
                  <span className="text-[10px] sm:text-xs">Eventos</span>
                </TabsTrigger>
                <TabsTrigger value="goals" className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1 py-2 sm:py-0 h-12 sm:h-9">
                  <Target className="h-4 w-4" />
                  <span className="text-[10px] sm:text-xs">Metas</span>
                </TabsTrigger>
                <TabsTrigger value="profile" className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1 py-2 sm:py-0 h-12 sm:h-9">
                  <User className="h-4 w-4" />
                  <span className="text-[10px] sm:text-xs">Perfil</span>
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
                <div className="grid gap-4">
                  {campaigns.length === 0 ? (
                    <Card className="p-8 text-center">
                      <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">Nenhum evento ainda</p>
                      <p className="text-sm text-muted-foreground mt-1">Crie seu primeiro evento para começar!</p>
                    </Card>
                  ) : (
                    campaigns.slice(0, 4).map((campaign) => (
                      <Card key={campaign.id} className="overflow-hidden hover:shadow-md transition-shadow">
                        <CardContent className="p-4 flex items-center gap-4">
                          <div className="h-16 w-16 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
                            {campaign.cover_image_url ? (
                              <img src={campaign.cover_image_url} alt={campaign.title} className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center">
                                <Camera className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">{campaign.title}</h4>
                            <p className="text-sm text-muted-foreground">{campaign.photos?.[0]?.count || 0} fotos</p>
                          </div>
                          <Link 
                            to={`/dashboard/photographer/events/${campaign.id}`}
                            className="text-sm text-primary hover:underline"
                          >
                            Gerenciar
                          </Link>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
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
