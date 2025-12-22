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
import { Dialog, DialogContent } from '@/components/ui/dialog';
import AntiScreenshotProtection from '@/components/security/AntiScreenshotProtection';
import UploadPhotoModal from '@/components/modals/UploadPhotoModal';
import CreateCampaignModal from '@/components/modals/CreateCampaignModal';
import PhotographerGoals from './PhotographerGoals';
import { ProfileEditor } from '../profile/ProfileEditor';
import { SalesChart } from './SalesChart';
import { useSalesData } from '@/hooks/useSalesData';
import WelcomeHeader from './WelcomeHeader';
import MetricCard from './MetricCard';
import QuickActions, { QuickAction } from './QuickActions';
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

interface Stats {
  totalSales: number;
  monthlySales: number;
  pendingAmount: number;
  availableAmount: number;
  totalPhotos: number;
  conversionRate: number;
}

const PhotographerDashboard = () => {
  const { profile, user } = useAuth();
  const { data: salesData, loading: loadingSales } = useSalesData(30, user?.id);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [recentSales, setRecentSales] = useState<ActivityItem[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalSales: 0,
    monthlySales: 0,
    pendingAmount: 0,
    availableAmount: 0,
    totalPhotos: 0,
    conversionRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCreateAlbumModal, setShowCreateAlbumModal] = useState(false);
  const [selectedCampaignForAlbum, setSelectedCampaignForAlbum] = useState<{ id: string; title: string } | null>(null);
  const [showEditCoverModal, setShowEditCoverModal] = useState(false);
  const [selectedCampaignForCover, setSelectedCampaignForCover] = useState<{ id: string; title: string; coverUrl?: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    await Promise.all([
      fetchCampaigns(),
      fetchStats(),
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
        .select('id, amount, created_at, buyer:profiles!purchases_buyer_id_fkey(full_name), photo:photos(title)')
        .eq('photographer_id', profile?.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(5);

      const activities: ActivityItem[] = (data || []).map((sale: any) => ({
        id: sale.id,
        type: 'sale' as const,
        title: sale.buyer?.full_name || 'Cliente',
        description: sale.photo?.title || 'Foto vendida',
        timestamp: sale.created_at,
        amount: Number(sale.amount),
      }));

      setRecentSales(activities);
    } catch (error) {
      console.error('Error fetching recent sales:', error);
    }
  };

  const fetchStats = async () => {
    try {
      // Count total photos
      const { count: totalPhotos } = await supabase
        .from('photos')
        .select('*', { count: 'exact', head: true })
        .eq('photographer_id', profile?.id);

      // Count sales
      const { data: salesData } = await supabase
        .from('purchases')
        .select('created_at')
        .eq('photographer_id', profile?.id)
        .eq('status', 'completed');

      const totalSales = salesData?.length || 0;

      // Monthly sales
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthlySales = salesData?.filter(sale => 
        new Date(sale.created_at) >= firstDayOfMonth
      ).length || 0;

      // Calculate conversion rate
      const conversionRate = totalPhotos && totalPhotos > 0 
        ? ((totalSales / totalPhotos) * 100) 
        : 0;

      // Revenue shares
      const { data: rsData } = await supabase
        .from('revenue_shares')
        .select('photographer_amount, purchases!revenue_shares_purchase_id_fkey(created_at, status)')
        .eq('photographer_id', profile?.id);

      let availableSum = 0;
      let pendingSum = 0;

      rsData?.forEach((row: any) => {
        const amt = Number(row.photographer_amount || 0);
        const purchase = row.purchases;
        
        if (purchase?.status === 'completed') {
          const createdDate = new Date(purchase.created_at);
          const hoursSinceSale = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60);
          
          if (hoursSinceSale >= 12) {
            availableSum += amt;
          } else {
            pendingSum += amt;
          }
        }
      });

      // Subtract pending/approved payouts
      const { data: reqs } = await supabase
        .from('payout_requests')
        .select('amount, status')
        .eq('photographer_id', user?.id)
        .in('status', ['pending', 'approved', 'completed']);

      const blockedAmount = reqs?.reduce((sum, r) => sum + Number(r.amount || 0), 0) || 0;
      const finalAvailable = Math.max(availableSum - blockedAmount, 0);

      setStats({
        totalSales,
        monthlySales,
        pendingAmount: pendingSum,
        availableAmount: finalAvailable,
        totalPhotos: totalPhotos || 0,
        conversionRate
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const quickActions: QuickAction[] = [
    {
      icon: CalendarPlus,
      label: 'Criar Evento',
      onClick: () => {}, // Handled by CreateCampaignModal
    },
    {
      icon: Upload,
      label: 'Upload Fotos',
      onClick: () => setShowUploadModal(true),
    },
    {
      icon: Wallet,
      label: 'Solicitar Saque',
      description: formatCurrency(stats.availableAmount),
      href: '/dashboard/photographer/payout',
    },
    {
      icon: BarChart3,
      label: 'Relatórios',
      href: '/dashboard/photographer/album-reports',
    },
  ];

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
    <AntiScreenshotProtection>
      <div className="space-y-6 sm:space-y-8">
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
            value={formatCurrency(stats.availableAmount)}
            subtitle="Pronto para saque"
            icon={DollarSign}
            variant="success"
          />
          <MetricCard
            title="A Liberar"
            value={formatCurrency(stats.pendingAmount)}
            subtitle="Aguardando 12h"
            icon={CreditCard}
            variant="warning"
          />
          <MetricCard
            title="Vendas do Mês"
            value={stats.monthlySales}
            subtitle={`${stats.totalSales} total`}
            icon={TrendingUp}
            variant="primary"
          />
          <MetricCard
            title="Fotos Publicadas"
            value={stats.totalPhotos}
            subtitle={`${stats.conversionRate.toFixed(1)}% conversão`}
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
                  <p className="text-xs text-muted-foreground mt-1">{formatCurrency(stats.availableAmount)}</p>
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
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-4">Vendas dos Últimos 30 Dias</h3>
                    {loadingSales ? (
                      <div className="animate-pulse space-y-4">
                        <div className="h-4 bg-muted rounded w-1/3" />
                        <div className="h-[200px] bg-muted rounded" />
                      </div>
                    ) : (
                      <SalesChart data={salesData} />
                    )}
                  </CardContent>
                </Card>
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
    </AntiScreenshotProtection>
  );
};

export default PhotographerDashboard;
