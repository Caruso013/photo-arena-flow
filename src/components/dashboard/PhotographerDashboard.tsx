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
import { Upload, Camera, DollarSign, BarChart3, Plus, Eye, Edit, CreditCard, AlertCircle, CalendarPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import AntiScreenshotProtection from '@/components/security/AntiScreenshotProtection';

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
  totalCampaigns: number;
  totalPhotos: number;
  totalSales: number;
  totalRevenue: number;
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
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalCampaigns: 0,
    totalPhotos: 0,
    totalSales: 0,
    totalRevenue: 0
  });
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCreateCampaignModal, setShowCreateCampaignModal] = useState(false);
  const [showCreateAlbumModal, setShowCreateAlbumModal] = useState(false);
  const [selectedCampaignForAlbum, setSelectedCampaignForAlbum] = useState<{ id: string; title: string } | null>(null);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [isRequestingPayout, setIsRequestingPayout] = useState(false);
  const [payoutError, setPayoutError] = useState('');

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
      const { data, error } = await supabase
        .from('photos')
        .select(`
          *,
          campaign:campaigns(title)
        `)
        .eq('photographer_id', profile?.id)
        .order('created_at', { ascending: false })
        .limit(8);

      if (error) throw error;
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

      if (amount > stats.totalRevenue) {
        setPayoutError('O valor não pode ser maior que a receita disponível');
        return;
      }

      const { error } = await supabase
        .from('payout_requests')
        .insert({
          photographer_id: user.id,
          amount: amount
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
      // Contar eventos únicos onde o fotógrafo tem fotos
      const { data: photosData, error: photosCountError } = await supabase
        .from('photos')
        .select('campaign_id')
        .eq('photographer_id', profile?.id);

      if (photosCountError) throw photosCountError;

      const uniqueCampaignIds = [...new Set(photosData?.map(p => p.campaign_id) || [])];
      const campaignsCount = uniqueCampaignIds.length;

      // Fetch photos count
      const { count: photosCount } = await supabase
        .from('photos')
        .select('*', { count: 'exact', head: true })
        .eq('photographer_id', profile?.id);

      // Fetch sales stats
      const { data: salesData } = await supabase
        .from('purchases')
        .select('amount')
        .eq('photographer_id', profile?.id)
        .eq('status', 'completed');

      const totalSales = salesData?.length || 0;

      // Buscar revenue_shares reais para o fotógrafo
      const { data: revenueData } = await supabase
        .from('revenue_shares')
        .select('photographer_amount')
        .eq('photographer_id', profile?.id);

      const photographerRevenue = revenueData?.reduce(
        (sum, r) => sum + Number(r.photographer_amount), 
        0
      ) || 0;

      setStats({
        totalCampaigns: campaignsCount,
        totalPhotos: photosCount || 0,
        totalSales,
        totalRevenue: photographerRevenue
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
        <div className="relative overflow-hidden rounded-xl p-8 bg-gradient-primary text-white shadow-elegant">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30"></div>
          <div className="relative z-10 flex items-start gap-6">
            {/* Profile Avatar */}
            <Avatar className="h-24 w-24 border-4 border-white/30 shadow-lg animate-scale-in">
              <AvatarImage 
                src={profile?.avatar_url || ''} 
                alt={profile?.full_name || 'Fotógrafo'}
                className="object-cover"
              />
              <AvatarFallback className="text-3xl bg-white/20 backdrop-blur-sm">
                <Camera className="h-12 w-12 text-white" />
              </AvatarFallback>
            </Avatar>

            {/* Welcome Text */}
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-2 animate-fade-in drop-shadow-lg">
                Painel do Fotógrafo 📸
              </h1>
              <p className="text-lg opacity-95 mb-4 drop-shadow-md">
                Olá, <span className="font-semibold">{profile?.full_name || 'Fotógrafo'}</span>! Gerencie seus eventos e fotos aqui.
              </p>
              <div className="flex gap-3">
                <Button 
                  variant="secondary" 
                  className="gap-2 bg-white/95 text-primary hover:bg-white font-semibold shadow-md hover-scale"
                  onClick={() => setShowUploadModal(true)}
                >
                  <Upload className="h-4 w-4" />
                  Upload de Fotos
                </Button>
                <Link to="/eventos-proximos">
                  <Button 
                    variant="outline" 
                    className="gap-2 bg-white/20 border-white/30 text-white hover:bg-white/30 hover:text-white backdrop-blur-sm font-medium"
                  >
                    <CalendarPlus className="h-4 w-4" />
                    Eventos Próximos
                  </Button>
                </Link>
              </div>
            </div>
          </div>
          
          {profile?.role === 'photographer' && (
            <div className="mt-4 p-4 bg-white/20 border border-white/30 rounded-lg backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-white mt-0.5" />
                <div>
                  <h3 className="font-semibold text-white drop-shadow">Sobre o Upload</h3>
                  <p className="text-sm text-white/95 drop-shadow-sm">
                    Faça upload de fotos para eventos disponíveis. Apenas administradores criam novos eventos.
                    Confira os eventos próximos e candidate-se para cobri-los!
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Stats Cards - visual melhorado */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/20 animate-fade-in">
            <CardContent className="p-0">
              <div className="flex items-center p-6">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Eventos com Fotos</p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                    {stats.totalCampaigns}
                  </p>
                </div>
                <div className="bg-primary/10 p-4 rounded-lg">
                  <Camera className="h-8 w-8 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 border-2 hover:border-blue-500/20 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <CardContent className="p-0">
              <div className="flex items-center p-6">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Fotos Enviadas</p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                    {stats.totalPhotos}
                  </p>
                </div>
                <div className="bg-blue-500/10 p-4 rounded-lg">
                  <Eye className="h-8 w-8 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 border-2 hover:border-green-500/20 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <CardContent className="p-0">
              <div className="flex items-center p-6">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Vendas Totais</p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-green-500 bg-clip-text text-transparent">
                    {stats.totalSales}
                  </p>
                </div>
                <div className="bg-green-500/10 p-4 rounded-lg">
                  <BarChart3 className="h-8 w-8 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/30 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <CardContent className="p-0">
              <div className="flex items-center p-6">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Faturamento</p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-amber-500 bg-clip-text text-transparent">
                    {formatCurrency(stats.totalRevenue)}
                  </p>
                </div>
                <div className="bg-amber-500/10 p-4 rounded-lg">
                  <DollarSign className="h-8 w-8 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="campaigns" className="space-y-6">
          <TabsList className="grid w-full max-w-3xl grid-cols-4">
            <TabsTrigger value="campaigns" className="gap-2">
              <Camera className="h-4 w-4" />
              Meus Eventos
            </TabsTrigger>
            <TabsTrigger value="photos" className="gap-2">
              <Eye className="h-4 w-4" />
              Minhas Fotos
            </TabsTrigger>
            <TabsTrigger value="payouts" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Repasses
            </TabsTrigger>
            <TabsTrigger value="profile" className="gap-2">
              <Edit className="h-4 w-4" />
              Perfil
            </TabsTrigger>
          </TabsList>

          <TabsContent value="campaigns" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Eventos com Fotos</h2>
              <Button onClick={() => setShowUploadModal(true)} className="gap-2">
                <Upload className="h-4 w-4" />
                Upload de Fotos
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {campaigns.map((campaign) => (
                <Card key={campaign.id} className="overflow-hidden">
                  <div className="aspect-video bg-gradient-subtle relative">
                    {campaign.cover_image_url ? (
                      <img
                        src={campaign.cover_image_url}
                        alt={campaign.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Camera className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                    <Badge 
                      variant={campaign.is_active ? "default" : "secondary"} 
                      className="absolute top-2 right-2"
                    >
                      {campaign.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  <CardContent className="p-4">
                    <CardTitle className="text-lg mb-2">{campaign.title}</CardTitle>
                    <CardDescription className="text-sm mb-2">
                      {campaign.description}
                    </CardDescription>
                    <div className="flex justify-between items-center text-sm text-muted-foreground mb-3">
                      <span>{campaign.location}</span>
                      <span>{new Date(campaign.event_date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-sm">
                        {campaign.photos?.[0]?.count || 0} fotos
                      </span>
                      <div className="flex gap-1">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="gap-1"
                          onClick={() => {
                            setSelectedCampaignForAlbum({ id: campaign.id, title: campaign.title });
                            setShowCreateAlbumModal(true);
                          }}
                        >
                          <Plus className="h-3 w-3" />
                          Álbum
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {campaigns.length === 0 && (
              <Card className="p-12 text-center">
                <Camera className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum evento com fotos ainda</h3>
                <p className="text-muted-foreground mb-4">
                  Faça upload de fotos para eventos criados pelos administradores
                </p>
                <div className="flex gap-3 justify-center">
                  <Button onClick={() => setShowUploadModal(true)} className="gap-2">
                    <Upload className="h-4 w-4" />
                    Fazer Upload de Fotos
                  </Button>
                  <Link to="/eventos-proximos">
                    <Button variant="outline" className="gap-2">
                      <CalendarPlus className="h-4 w-4" />
                      Ver Eventos Disponíveis
                    </Button>
                  </Link>
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="photos" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Fotos Carregadas</h2>
              <Button onClick={() => setShowUploadModal(true)} className="gap-2">
                <Upload className="h-4 w-4" />
                Upload de Fotos
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {photos.map((photo) => (
                <Card key={photo.id} className="overflow-hidden">
                  <div className="aspect-square bg-gradient-subtle relative">
                    <img
                      src={photo.thumbnail_url || photo.watermarked_url}
                      alt={photo.title || 'Foto'}
                      className="w-full h-full object-cover"
                    />
                    <Badge 
                      variant={photo.is_available ? "default" : "secondary"} 
                      className="absolute top-2 right-2"
                    >
                      {photo.is_available ? "Disponível" : "Indisponível"}
                    </Badge>
                  </div>
                  <CardContent className="p-3">
                    <p className="font-medium text-sm mb-1">
                      {photo.title || 'Foto sem título'}
                    </p>
                    <p className="text-xs text-muted-foreground mb-2">
                      {photo.campaign?.title}
                    </p>
                    <div className="flex justify-between items-center">
                      <Badge variant="outline">
                        {formatCurrency(photo.price)}
                      </Badge>
                      <Button size="sm" variant="ghost" className="h-6 px-2">
                        <Edit className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {photos.length === 0 && (
              <Card className="p-12 text-center">
                <Upload className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhuma foto carregada ainda</h3>
                <p className="text-muted-foreground mb-4">
                  Faça o upload das suas fotos para começar a vender
                </p>
                <Button onClick={() => setShowUploadModal(true)} className="gap-2">
                  <Upload className="h-4 w-4" />
                  Fazer Upload
                </Button>
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
                  <div>
                    <Label htmlFor="payout-amount">Valor do Repasse</Label>
                    <Input
                      id="payout-amount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={payoutAmount}
                      onChange={(e) => setPayoutAmount(e.target.value)}
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Receita disponível: {formatCurrency(stats.totalRevenue)}
                    </p>
                  </div>
                  
                  {payoutError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{payoutError}</AlertDescription>
                    </Alert>
                  )}

                  <Button 
                    onClick={requestPayout}
                    disabled={isRequestingPayout || !payoutAmount}
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
                          <div>
                            <p className="font-medium">{formatCurrency(Number(request.amount))}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(request.requested_at).toLocaleDateString()}
                            </p>
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
    </AntiScreenshotProtection>
  );
};

export default PhotographerDashboard;