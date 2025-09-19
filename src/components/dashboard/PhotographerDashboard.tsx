import React, { useState, useEffect } from 'react';
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
import DashboardLayout from './DashboardLayout';
import UploadPhotoModal from '@/components/modals/UploadPhotoModal';
import CreateCampaignModal from '@/components/modals/CreateCampaignModal';
import AntiScreenshotProtection from '@/components/security/AntiScreenshotProtection';

interface Campaign {
  id: string;
  title: string;
  description: string;
  event_date: string;
  location: string;
  cover_image_url: string;
  is_active: boolean;
  photos: { count: number }[];
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
      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          photos(count)
        `)
        .eq('photographer_id', profile?.id)
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
      // Fetch campaigns count
      const { count: campaignsCount } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('photographer_id', profile?.id);

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
      const totalRevenue = salesData?.reduce((sum, sale) => sum + Number(sale.amount), 0) || 0;
      const photographerCommission = totalRevenue * 0.7; // 70% for photographer

      setStats({
        totalCampaigns: campaignsCount || 0,
        totalPhotos: photosCount || 0,
        totalSales,
        totalRevenue: photographerCommission
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
      <DashboardLayout>
        <div className="space-y-8">
        {/* Welcome Section */}
        <div className="bg-gradient-primary rounded-lg p-8 text-white">
          <h1 className="text-3xl font-bold mb-2">
            Painel do Fotógrafo
          </h1>
          <p className="text-lg opacity-90 mb-4">
            Olá, {profile?.full_name}! Gerencie seus eventos e fotos aqui.
          </p>
          <div className="flex gap-4">
            <Button 
              variant="secondary" 
              className="gap-2"
              onClick={() => setShowCreateCampaignModal(true)}
            >
              <Plus className="h-4 w-4" />
              Novo Evento
            </Button>
            <Button 
              variant="outline" 
              className="gap-2 border-white/20 text-white hover:bg-white/10"
              onClick={() => setShowUploadModal(true)}
            >
              <Upload className="h-4 w-4" />
              Upload de Fotos
            </Button>
            <Link to="/eventos-proximos">
              <Button 
                variant="outline" 
                className="gap-2 border-white/20 text-white hover:bg-white/10"
              >
                <CalendarPlus className="h-4 w-4" />
                Eventos Próximos
              </Button>
            </Link>
          </div>
          
          {profile?.role === 'photographer' && (
            <div className="mt-4 p-4 bg-blue-500/20 border border-blue-500/30 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-200 mt-0.5" />
                <div>
                  <h3 className="font-medium text-blue-100">Bem-vindo!</h3>
                  <p className="text-sm text-blue-200">
                    Você está logado como fotógrafo. Explore suas campanhas e gerencie seus eventos.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Eventos</p>
                  <p className="text-2xl font-bold">{stats.totalCampaigns}</p>
                </div>
                <Camera className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Fotos</p>
                  <p className="text-2xl font-bold">{stats.totalPhotos}</p>
                </div>
                <Eye className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Vendas</p>
                  <p className="text-2xl font-bold">{stats.totalSales}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Faturamento</p>
                  <p className="text-2xl font-bold">R$ {stats.totalRevenue.toFixed(2)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="campaigns" className="space-y-4">
          <TabsList>
            <TabsTrigger value="campaigns">Meus Eventos</TabsTrigger>
            <TabsTrigger value="photos">Minhas Fotos</TabsTrigger>
            <TabsTrigger value="payouts">Repasses</TabsTrigger>
          </TabsList>

          <TabsContent value="campaigns" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Eventos Criados</h2>
              <Button onClick={() => setShowCreateCampaignModal(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Evento
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
                    <div className="flex justify-between items-center">
                      <span className="text-sm">
                        {campaign.photos?.[0]?.count || 0} fotos
                      </span>
                      <Button size="sm" variant="outline" className="gap-1">
                        <Edit className="h-3 w-3" />
                        Editar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {campaigns.length === 0 && (
              <Card className="p-12 text-center">
                <Camera className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum evento criado ainda</h3>
                <p className="text-muted-foreground mb-4">
                  Crie seu primeiro evento para começar a vender fotos
                </p>
                <Button onClick={() => setShowCreateCampaignModal(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Criar Primeiro Evento
                </Button>
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
                        R$ {photo.price.toFixed(2)}
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
                      Receita disponível: R$ {stats.totalRevenue.toFixed(2)}
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
                            <p className="font-medium">R$ {Number(request.amount).toFixed(2)}</p>
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
        </Tabs>
      </div>

      {showUploadModal && (
        <UploadPhotoModal 
          onClose={() => setShowUploadModal(false)}
          onUploadComplete={fetchData}
        />
      )}

      {showCreateCampaignModal && (
        <CreateCampaignModal 
          onClose={() => setShowCreateCampaignModal(false)}
          onCampaignCreated={fetchData}
        />
      )}
      </DashboardLayout>
    </AntiScreenshotProtection>
  );
};

export default PhotographerDashboard;