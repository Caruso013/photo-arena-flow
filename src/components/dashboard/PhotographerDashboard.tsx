import React, { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MaskedInput, masks } from '@/components/ui/masked-input';
import { Skeleton } from '@/components/ui/skeleton';
import { Upload, Camera, DollarSign, BarChart3, Plus, Edit, CreditCard, AlertCircle, CalendarPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import AntiScreenshotProtection from '@/components/security/AntiScreenshotProtection';
import UploadPhotoModal from '@/components/modals/UploadPhotoModal';
import CreateCampaignModal from '@/components/modals/CreateCampaignModal';
import CreateAlbumModal from '@/components/modals/CreateAlbumModal';
import EditCampaignCoverModal from '@/components/modals/EditCampaignCoverModal';
import PhotographerGoals from './PhotographerGoals';
import { ProfileEditor } from '../profile/ProfileEditor';
import { SalesChart } from './SalesChart';
import { useSalesData } from '@/hooks/useSalesData';

interface Campaign {
  id: string;
  title: string;
  description?: string;
  event_date?: string;
  location?: string;
  cover_image_url?: string;
  is_active: boolean;
  organization_percentage?: number; // Made optional to match database
  photographer_id?: string | null;
  organization_id?: string | null;
  created_at: string;
  updated_at: string;
  photos?: { count: number }[];
}

interface Photo {
  id: string;
  title: string;
  watermarked_url: string;
  thumbnail_url: string;
  price: number;
  is_available: boolean;
  campaign: {
    title: string;
  };
}

interface Stats {
  totalSales: number;
  monthlySales: number;
  pendingAmount: number;
  availableAmount: number;
}

interface PayoutRequest {
  id: string;
  amount: number;
  status: string;
  requested_at: string;
  processed_at: string | null;
  notes: string | null;
}

const PhotographerDashboard = () => {
  const { profile, user } = useAuth();
  const { data: salesData, loading: loadingSales } = useSalesData(30, user?.id);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalSales: 0,
    monthlySales: 0,
    pendingAmount: 0,
    availableAmount: 0
  });
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCreateAlbumModal, setShowCreateAlbumModal] = useState(false);
  const [selectedCampaignForAlbum, setSelectedCampaignForAlbum] = useState<{ id: string; title: string } | null>(null);
  const [showEditCoverModal, setShowEditCoverModal] = useState(false);
  const [selectedCampaignForCover, setSelectedCampaignForCover] = useState<{ id: string; title: string; coverUrl?: string } | null>(null);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [isRequestingPayout, setIsRequestingPayout] = useState(false);
  const [payoutError, setPayoutError] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [pixKeyType, setPixKeyType] = useState<'cpf' | 'cnpj' | 'email' | 'phone' | 'random' | null>(null);
  
  // Detectar tipo de chave PIX automaticamente
  const detectPixKeyType = (value: string) => {
    const cleanValue = value.replace(/\D/g, '');
    
    if (/^\d+$/.test(cleanValue)) {
      if (cleanValue.length <= 11) return 'cpf';
      if (cleanValue.length <= 14) return 'cnpj';
      if (cleanValue.length <= 11) return 'phone';
    }
    if (/@/.test(value)) return 'email';
    return 'random';
  };
  
  const handlePixKeyChange = (value: string) => {
    setPixKey(value);
    setPixKeyType(detectPixKeyType(value));
  };
  const [recipientName, setRecipientName] = useState('');
  const [institution, setInstitution] = useState('');
  const [availableBalance, setAvailableBalance] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    await Promise.all([
      fetchCampaigns(),
      fetchPhotos(),
      fetchPayoutRequests(),
      fetchStats()
    ]);
    setLoading(false);
  };

  const fetchCampaigns = async () => {
    try {
      // Buscar campanhas onde o fotógrafo tem fotos
      const { data: photosData, error: photosError } = await supabase
        .from('photos')
        .select('campaign_id')
        .eq('photographer_id', profile?.id);

      if (photosError) throw photosError;

      // Pegar IDs únicos de campanhas
      const campaignIds = [...new Set(photosData?.map(p => p.campaign_id) || [])];

      if (campaignIds.length === 0) {
        setCampaigns([]);
        return;
      }

      // Buscar detalhes das campanhas
      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          photos(count)
        `)
        .in('id', campaignIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    }
  };

  const fetchPhotos = async () => {
    try {
      console.log('🔍 Buscando fotos do fotógrafo:', profile?.id);
      
      const { data, error } = await supabase
        .from('photos')
        .select(`
          *,
          campaign:campaigns(title)
        `)
        .eq('photographer_id', profile?.id)
        .order('created_at', { ascending: false })
        .limit(8);

      if (error) {
        console.error('❌ Erro ao buscar fotos:', error);
        throw error;
      }
      
      console.log('✅ Fotos encontradas:', data?.length, data);
      setPhotos(data || []);
    } catch (error) {
      console.error('Error fetching photos:', error);
    }
  };

  const fetchPayoutRequests = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('payout_requests')
        .select('*')
        .eq('photographer_id', user.id)
        .order('requested_at', { ascending: false });

      if (error) throw error;
      setPayoutRequests(data || []);
    } catch (error) {
      console.error('Error fetching payout requests:', error);
    }
  };

  const requestPayout = async () => {
    if (!user || !payoutAmount) return;
    
    setIsRequestingPayout(true);
    setPayoutError('');
    
    try {
      const amount = parseFloat(payoutAmount);
      
      if (amount <= 0) {
        setPayoutError('O valor deve ser maior que zero');
        return;
      }

      if (amount > availableBalance) {
        setPayoutError('O valor não pode ser maior que a receita disponível');
        return;
      }

      // Validate recipient info
      if (!pixKey || pixKey.trim() === '') {
        setPayoutError('Informe a chave PIX para receber o repasse');
        return;
      }

      if (!recipientName || recipientName.trim() === '') {
        setPayoutError('Informe o nome completo do beneficiário');
        return;
      }

      if (!institution || institution.trim() === '') {
        setPayoutError('Informe a instituição / banco do beneficiário');
        return;
      }

      const { error } = await supabase
        .from('payout_requests')
        .insert({
          photographer_id: user.id,
          amount: amount,
          pix_key: pixKey.trim(),
          recipient_name: recipientName.trim(),
          institution: institution.trim()
        });

      if (error) throw error;

      setPayoutAmount('');
      await fetchPayoutRequests();
    } catch (error) {
      console.error('Error requesting payout:', error);
      setPayoutError('Erro ao solicitar repasse. Tente novamente.');
    } finally {
      setIsRequestingPayout(false);
    }
  };

  const fetchStats = async () => {
    try {
      if (import.meta.env.DEV) {
        console.debug('fetchStats start', { profileId: profile?.id, userId: user?.id, email: profile?.email });
      }
      
      // Buscar todas as vendas completas
      const { data: salesData } = await supabase
        .from('purchases')
        .select('created_at')
        .eq('photographer_id', profile?.id)
        .eq('status', 'completed');

      const totalSales = salesData?.length || 0;

      // Calcular vendas do mês atual
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthlySales = salesData?.filter(sale => {
        const saleDate = new Date(sale.created_at);
        return saleDate >= firstDayOfMonth;
      }).length || 0;

      // Buscar revenue_shares com informações de purchase para calcular pendente/disponível
      const { data: rsWithPurchase, error: rsError } = await supabase
        .from('revenue_shares')
        .select('photographer_amount, purchases!revenue_shares_purchase_id_fkey(created_at, status)')
        .eq('photographer_id', profile?.id);

      if (rsError) {
        console.error('❌ Erro ao buscar revenue shares:', rsError);
      }

  if (import.meta.env.DEV) console.debug('Revenue shares found:', rsWithPurchase?.length || 0);

      let availableSum = 0;
      let pendingSum = 0;

      rsWithPurchase?.forEach((row: any) => {
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

      // Descontar solicitações pendentes/aprovadas/completed do saldo disponível
      // Apenas 'rejected' libera o saldo de volta
      const { data: reqs } = await supabase
        .from('payout_requests')
        .select('amount, status')
        .eq('photographer_id', user?.id)
        .in('status', ['pending', 'approved', 'completed']);

      const blockedAmount = reqs?.reduce((sum, r) => sum + Number(r.amount || 0), 0) || 0;

      const finalAvailable = Math.max(availableSum - blockedAmount, 0);
      
      if (import.meta.env.DEV) {
        console.debug('pendingSum', pendingSum, 'availableSum', availableSum, 'blockedAmount', blockedAmount, 'finalAvailable', finalAvailable);
      }
      
      setAvailableBalance(finalAvailable);

      setStats({
        totalSales,
        monthlySales,
        pendingAmount: pendingSum,
        availableAmount: finalAvailable
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <AntiScreenshotProtection>
      <div className="space-y-8">
        {/* Welcome Section with Profile */}
        <div className="relative overflow-hidden rounded-2xl p-6 sm:p-8 bg-gradient-to-br from-primary via-primary/95 to-primary/80 text-white shadow-2xl">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20"></div>
          <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
            {/* Profile Avatar */}
            <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-4 border-white/30 shadow-xl animate-scale-in ring-4 ring-white/10">
              <AvatarImage 
                src={profile?.avatar_url || ''} 
                alt={profile?.full_name || 'Fotógrafo'}
                className="object-cover"
              />
              <AvatarFallback className="text-3xl bg-white/20 backdrop-blur-sm">
                <Camera className="h-10 w-10 sm:h-12 sm:w-12 text-white" />
              </AvatarFallback>
            </Avatar>

            {/* Welcome Text */}
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-3xl sm:text-4xl font-bold mb-2 animate-fade-in drop-shadow-lg">
                Painel do Fotógrafo 📸
              </h1>
              <p className="text-base sm:text-lg opacity-95 drop-shadow-md">
                Olá, <span className="font-semibold">{profile?.full_name || 'Fotógrafo'}</span>! Gerencie seus eventos e fotos aqui.
              </p>
            </div>
          </div>
        </div>

        {/* Ações Principais - Cards Grandes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Criar Álbum */}
          <Card 
            className="cursor-pointer hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 border-2 border-transparent hover:border-yellow-500/30 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 group overflow-hidden"
            onClick={() => {
              if (campaigns.length === 0) {
                const campaignsTab = document.querySelector('[value="campaigns"]') as HTMLButtonElement;
                campaignsTab?.click();
              } else {
                setSelectedCampaignForAlbum({ id: campaigns[0].id, title: campaigns[0].title });
                setShowCreateAlbumModal(true);
              }
            }}
          >
            <CardContent className="p-6 sm:p-8 flex flex-col items-center justify-center text-center h-[180px] sm:h-[200px] relative">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative z-10 space-y-3 sm:space-y-4">
                <div className="h-16 w-16 sm:h-20 sm:w-20 mx-auto rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                  <Camera className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg sm:text-xl text-foreground">Criar Álbum</h3>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upload de Fotos */}
          <Card 
            className="cursor-pointer hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 border-2 border-transparent hover:border-blue-500/30 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 group overflow-hidden"
            onClick={() => setShowUploadModal(true)}
          >
            <CardContent className="p-6 sm:p-8 flex flex-col items-center justify-center text-center h-[180px] sm:h-[200px] relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative z-10 space-y-3 sm:space-y-4">
                <div className="h-16 w-16 sm:h-20 sm:w-20 mx-auto rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                  <Upload className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg sm:text-xl text-foreground">Upload de Fotos</h3>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* A Receber */}
          <Card className="hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 border-2 border-muted/50 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/30 dark:to-slate-800/30 group overflow-hidden">
            <CardContent className="p-6 sm:p-8 flex flex-col items-center justify-center text-center h-[180px] sm:h-[200px] relative">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-400/5 to-slate-500/5" />
              <div className="relative z-10 space-y-3">
                <div className="h-14 w-14 sm:h-16 sm:w-16 mx-auto rounded-2xl bg-muted/80 flex items-center justify-center shadow-md">
                  <CreditCard className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">🔒 A Receber</p>
                  <p className="text-2xl sm:text-3xl font-bold text-foreground">
                    {formatCurrency(stats.pendingAmount)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Disponível pra Repasse */}
          <Card className="hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5 group overflow-hidden">
            <CardContent className="p-6 sm:p-8 flex flex-col items-center justify-center text-center h-[180px] sm:h-[200px] relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/5" />
              <div className="relative z-10 space-y-3">
                <div className="h-14 w-14 sm:h-16 sm:w-16 mx-auto rounded-2xl bg-primary/20 flex items-center justify-center shadow-lg">
                  <DollarSign className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">✅ Disponível pra Repasse</p>
                  <p className="text-2xl sm:text-3xl font-bold text-primary">
                    {formatCurrency(stats.availableAmount)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="analytics" className="space-y-6">
          <TabsList className="grid w-full max-w-3xl grid-cols-2 sm:grid-cols-4 h-auto sm:h-11 p-1 bg-muted/50">
            <TabsTrigger value="analytics" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 sm:py-0 h-14 sm:h-9 data-[state=active]:bg-background data-[state=active]:shadow-md">
              <BarChart3 className="h-4 w-4 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-medium">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 sm:py-0 h-14 sm:h-9 data-[state=active]:bg-background data-[state=active]:shadow-md">
              <Camera className="h-4 w-4 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-medium">Eventos</span>
            </TabsTrigger>
            <TabsTrigger value="payouts" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 sm:py-0 h-14 sm:h-9 data-[state=active]:bg-background data-[state=active]:shadow-md">
              <CreditCard className="h-4 w-4 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-medium">Repasses</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 sm:py-0 h-14 sm:h-9 data-[state=active]:bg-background data-[state=active]:shadow-md">
              <Edit className="h-4 w-4" />
              <span className="text-xs sm:text-sm font-medium">Meu perfil</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="space-y-6">
            {/* Cards de Estatísticas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              <Card className="hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5 overflow-hidden group">
                <CardContent className="p-6 relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg flex-shrink-0">
                        <DollarSign className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Receita Total</p>
                        <p className="text-2xl sm:text-3xl font-bold text-foreground truncate mt-1">
                          {formatCurrency(stats.pendingAmount + stats.availableAmount)}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-accent/20 bg-gradient-to-br from-accent/5 to-accent/10 overflow-hidden group">
                <CardContent className="p-6 relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-accent to-accent/80 flex items-center justify-center shadow-lg flex-shrink-0">
                        <BarChart3 className="h-6 w-6 text-accent-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total de vendas</p>
                        <p className="text-2xl sm:text-3xl font-bold text-foreground mt-1">{stats.totalSales}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-cyan-500/10 dark:from-blue-500/10 dark:to-cyan-500/5 overflow-hidden group">
                <CardContent className="p-6 relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg flex-shrink-0">
                        <Camera className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ticket Médio</p>
                        <p className="text-2xl sm:text-3xl font-bold text-foreground truncate mt-1">
                          {formatCurrency(stats.totalSales > 0 ? (stats.pendingAmount + stats.availableAmount) / stats.totalSales : 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Gráfico e Metas */}
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                {loadingSales ? (
                  <div className="space-y-4">
                    <Skeleton className="h-[350px] w-full" />
                  </div>
                ) : (
                  <SalesChart 
                    data={salesData} 
                    title="📈 Minhas Vendas - Últimos 30 Dias"
                    description="Acompanhe a evolução das suas vendas e receita"
                    type="area"
                  />
                )}
              </div>
              
              <PhotographerGoals />
            </div>
          </TabsContent>

          <TabsContent value="campaigns" className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Eventos com Fotos</h2>
                <p className="text-sm text-muted-foreground mt-1">Gerencie seus eventos e crie álbuns</p>
              </div>
              <CreateCampaignModal onCampaignCreated={fetchData} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {campaigns.map((campaign) => (
                <Card key={campaign.id} className="overflow-hidden hover:shadow-2xl transition-all duration-300 group border-2 border-transparent hover:border-primary/20">
                  <div className="aspect-[4/3] bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 relative overflow-hidden">
                    {campaign.cover_image_url ? (
                      <img
                        src={campaign.cover_image_url}
                        alt={campaign.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Camera className="h-16 w-16 text-muted-foreground opacity-30" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <Badge 
                      variant={campaign.is_active ? "default" : "secondary"} 
                      className="absolute top-3 right-3 shadow-lg"
                    >
                      {campaign.is_active ? "✓ Ativo" : "○ Inativo"}
                    </Badge>
                  </div>
                  <CardContent className="p-4 sm:p-5">
                    <CardTitle className="text-lg sm:text-xl mb-2 line-clamp-1">{campaign.title}</CardTitle>
                    {campaign.description && (
                      <CardDescription className="text-sm mb-3 line-clamp-2">
                        {campaign.description}
                      </CardDescription>
                    )}
                    <div className="flex flex-wrap gap-2 text-xs sm:text-sm text-muted-foreground mb-4">
                      {campaign.location && (
                        <span className="flex items-center gap-1">
                          📍 {campaign.location}
                        </span>
                      )}
                      {campaign.event_date && (
                        <span className="flex items-center gap-1">
                          📅 {new Date(campaign.event_date).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between items-center gap-2 pt-3 border-t border-border">
                      <span className="text-sm font-medium text-muted-foreground">
                        🖼️ {campaign.photos?.[0]?.count || 0} fotos
                      </span>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="gap-1 h-8"
                          onClick={() => {
                            setSelectedCampaignForCover({ 
                              id: campaign.id, 
                              title: campaign.title,
                              coverUrl: campaign.cover_image_url 
                            });
                            setShowEditCoverModal(true);
                          }}
                        >
                          <Edit className="h-3 w-3" />
                          <span className="hidden sm:inline">Capa</span>
                        </Button>
                        <Button 
                          size="sm" 
                          variant="default" 
                          className="gap-1 h-8"
                          onClick={() => {
                            setSelectedCampaignForAlbum({ id: campaign.id, title: campaign.title });
                            setShowCreateAlbumModal(true);
                          }}
                        >
                          <Plus className="h-3 w-3" />
                          <span className="hidden sm:inline">Álbum</span>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {campaigns.length === 0 && (
              <Card className="p-8 sm:p-12 text-center border-2 border-dashed">
                <div className="max-w-md mx-auto space-y-4">
                  <div className="h-20 w-20 mx-auto rounded-full bg-muted/50 flex items-center justify-center">
                    <Camera className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">Nenhum evento com fotos</h3>
                    <p className="text-muted-foreground">
                      Comece fazendo upload de fotos ou aplique para eventos disponíveis
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                    <Button onClick={() => setShowUploadModal(true)} className="gap-2" size="lg">
                      <Upload className="h-5 w-5" />
                      Fazer Upload de Fotos
                    </Button>
                    <Link to="/eventos-proximos">
                      <Button variant="outline" className="gap-2 w-full sm:w-auto" size="lg">
                        <CalendarPlus className="h-5 w-5" />
                        Ver Eventos Disponíveis
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="payouts" className="space-y-4">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Solicitar Repasse
                  </CardTitle>
                  <CardDescription>
                    Solicite o pagamento da sua receita disponível
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-muted-foreground">Saldo Disponível</span>
                      <DollarSign className="h-4 w-4 text-primary" />
                    </div>
                    <p className="text-2xl font-bold text-primary">{formatCurrency(availableBalance)}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      ℹ️ Apenas vendas com mais de 12h podem ser solicitadas
                    </p>
                  </div>
                  
                  <div>
                    <Label htmlFor="payout-amount">Valor do Repasse (R$)</Label>
                    <Input
                      id="payout-amount"
                      type="number"
                      step="0.01"
                      max={availableBalance}
                      placeholder="0.00"
                      value={payoutAmount}
                      onChange={(e) => setPayoutAmount(e.target.value)}
                      className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Máximo: {formatCurrency(availableBalance)}
                    </p>
                  </div>
      
                  <div>
                    <Label htmlFor="pix-key">Chave PIX</Label>
                    {pixKeyType === 'cpf' ? (
                      <MaskedInput
                        id="pix-key"
                        mask={masks.cpf}
                        placeholder="000.000.000-00"
                        value={pixKey}
                        onChange={(e) => handlePixKeyChange(e.target.value)}
                        className="mt-2"
                      />
                    ) : pixKeyType === 'cnpj' ? (
                      <MaskedInput
                        id="pix-key"
                        mask={masks.cnpj}
                        placeholder="00.000.000/0000-00"
                        value={pixKey}
                        onChange={(e) => handlePixKeyChange(e.target.value)}
                        className="mt-2"
                      />
                    ) : pixKeyType === 'phone' ? (
                      <MaskedInput
                        id="pix-key"
                        mask={masks.phone}
                        placeholder="(11) 99999-9999"
                        value={pixKey}
                        onChange={(e) => handlePixKeyChange(e.target.value)}
                        className="mt-2"
                      />
                    ) : (
                      <Input
                        id="pix-key"
                        type="text"
                        placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
                        value={pixKey}
                        onChange={(e) => handlePixKeyChange(e.target.value)}
                        className="mt-2"
                      />
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {pixKeyType === 'cpf' && 'Formato: CPF'}
                      {pixKeyType === 'cnpj' && 'Formato: CNPJ'}
                      {pixKeyType === 'phone' && 'Formato: Telefone'}
                      {pixKeyType === 'email' && 'Formato: E-mail'}
                      {pixKeyType === 'random' && 'Formato: Chave aleatória'}
                      {!pixKeyType && 'Digite para detectar o tipo automaticamente'}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="recipient-name">Nome Completo</Label>
                    <Input
                      id="recipient-name"
                      type="text"
                      placeholder="Nome completo do beneficiário"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="institution">Instituição / Banco</Label>
                    <Input
                      id="institution"
                      type="text"
                      placeholder="Instituição (ex: Banco do Brasil, Nubank)"
                      value={institution}
                      onChange={(e) => setInstitution(e.target.value)}
                      className="mt-2"
                    />
                  </div>
                  
                  {payoutError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{payoutError}</AlertDescription>
                    </Alert>
                  )}

                  <Button 
                    onClick={requestPayout}
                    disabled={isRequestingPayout || !payoutAmount || availableBalance <= 0}
                    className="w-full"
                  >
                    {isRequestingPayout ? 'Solicitando...' : 'Solicitar Repasse'}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Minhas Solicitações</CardTitle>
                  <CardDescription>
                    Acompanhe o status das suas solicitações de repasse
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {payoutRequests.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhuma solicitação de repasse ainda
                      </p>
                    ) : (
                      payoutRequests.slice(0, 5).map((request) => (
                        <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex-1">
                                <p className="font-medium">{formatCurrency(Number(request.amount))}</p>
                                <p className="text-sm text-muted-foreground">
                                  {new Date(request.requested_at).toLocaleDateString()}
                                </p>
                                {request.status === 'rejected' && request.notes && (
                                  <p className="text-xs text-destructive italic mt-1">Motivo: {request.notes}</p>
                                )}
                              </div>
                              <Badge variant={
                                request.status === 'approved' ? 'default' :
                                request.status === 'pending' ? 'secondary' : 'destructive'
                              }>
                                {request.status === 'approved' ? 'Aprovado' :
                                 request.status === 'pending' ? 'Pendente' : 'Rejeitado'}
                              </Badge>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <ProfileEditor />
          </TabsContent>
        </Tabs>
        </div>

      {showUploadModal && (
        <UploadPhotoModal 
          onClose={() => setShowUploadModal(false)}
          onUploadComplete={fetchData}
        />
      )}

      {showCreateAlbumModal && selectedCampaignForAlbum && (
        <CreateAlbumModal
          campaignId={selectedCampaignForAlbum.id}
          campaignTitle={selectedCampaignForAlbum.title}
          open={showCreateAlbumModal}
          onClose={() => {
            setShowCreateAlbumModal(false);
            setSelectedCampaignForAlbum(null);
          }}
          onAlbumCreated={fetchData}
        />
      )}

      {showEditCoverModal && selectedCampaignForCover && (
        <EditCampaignCoverModal
          campaignId={selectedCampaignForCover.id}
          campaignTitle={selectedCampaignForCover.title}
          currentCoverUrl={selectedCampaignForCover.coverUrl}
          open={showEditCoverModal}
          onClose={() => {
            setShowEditCoverModal(false);
            setSelectedCampaignForCover(null);
          }}
          onCoverUpdated={fetchData}
        />
      )}
    </AntiScreenshotProtection>
  );
};

export default PhotographerDashboard;