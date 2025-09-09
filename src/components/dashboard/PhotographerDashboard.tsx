import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Camera, DollarSign, BarChart3, Plus, Eye, Edit } from 'lucide-react';
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

const PhotographerDashboard = () => {
  const { profile } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalCampaigns: 0,
    totalPhotos: 0,
    totalSales: 0,
    totalRevenue: 0
  });
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCreateCampaignModal, setShowCreateCampaignModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    await Promise.all([
      fetchCampaigns(),
      fetchPhotos(),
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

      setStats({
        totalCampaigns: campaignsCount || 0,
        totalPhotos: photosCount || 0,
        totalSales,
        totalRevenue
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
          </div>
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