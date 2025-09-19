import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import { Search, Camera, ShoppingCart, Download, FileImage } from 'lucide-react';
import { Link } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';

interface Campaign {
  id: string;
  title: string;
  description: string;
  event_date: string;
  location: string;
  cover_image_url: string;
  photographer: {
    full_name: string;
  };
}

interface PurchasedPhoto {
  id: string;
  amount: number;
  created_at: string;
  status: string;
  photo: {
    id: string;
    title: string;
    original_url: string;
    thumbnail_url: string;
    watermarked_url: string;
    campaign: {
      title: string;
    };
  };
}

const UserDashboard = () => {
  const { user, profile } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [purchasedPhotos, setPurchasedPhotos] = useState<PurchasedPhoto[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCampaigns();
    if (user) {
      fetchPurchasedPhotos();
    }
  }, [user]);

  const fetchPurchasedPhotos = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('purchases')
        .select(`
          id,
          amount,
          created_at,
          status,
          photo:photos (
            id,
            title,
            original_url,
            thumbnail_url,
            watermarked_url,
            campaign:campaigns (title)
          )
        `)
        .eq('buyer_id', user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPurchasedPhotos(data || []);
    } catch (error) {
      console.error('Error fetching purchased photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (photo: PurchasedPhoto) => {
    try {
      if (!photo.photo.original_url) {
        toast({
          title: "Erro no download",
          description: "URL da foto não encontrada.",
          variant: "destructive",
        });
        return;
      }

      // Criar um link de download
      const link = document.createElement('a');
      link.href = photo.photo.original_url;
      link.download = `${photo.photo.title || 'foto'}_original.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Download iniciado",
        description: "Sua foto está sendo baixada.",
      });
    } catch (error) {
      console.error('Error downloading photo:', error);
      toast({
        title: "Erro no download",
        description: "Não foi possível baixar a foto.",
        variant: "destructive",
      });
    }
  };

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          photographer:profiles(full_name)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(6);

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    }
  };

  const filteredCampaigns = campaigns.filter(campaign =>
    campaign.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    campaign.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="bg-gradient-primary rounded-lg p-8 text-white">
          <h1 className="text-3xl font-bold mb-2">
            Bem-vindo, {profile?.full_name || 'Usuário'}!
          </h1>
          <p className="text-lg opacity-90">
            Encontre e compre as melhores fotos dos seus eventos esportivos favoritos
          </p>
        </div>

        {/* Search Section */}
        <Card>
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar eventos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="events" className="space-y-4">
          <TabsList>
            <TabsTrigger value="events">Eventos Disponíveis</TabsTrigger>
            <TabsTrigger value="purchases">Minhas Fotos Compradas</TabsTrigger>
          </TabsList>

          <TabsContent value="events" className="space-y-4">
            <h2 className="text-2xl font-bold">
              Eventos em Destaque {searchTerm && `(${filteredCampaigns.length} resultados)`}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCampaigns.map((campaign) => (
                <Card key={campaign.id} className="overflow-hidden hover:shadow-lg transition-shadow">
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
                      <span className="text-sm">Por: {campaign.photographer?.full_name}</span>
                      <Link to={`/campaign/${campaign.id}`}>
                        <Button size="sm" className="gap-1">
                          <Camera className="h-3 w-3" />
                          Ver Fotos
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredCampaigns.length === 0 && (
              <Card className="p-12 text-center">
                <Camera className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum evento encontrado</h3>
                <p className="text-muted-foreground">
                  {searchTerm 
                    ? `Não encontramos eventos para "${searchTerm}"`
                    : "Não há eventos disponíveis no momento"
                  }
                </p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="purchases" className="space-y-4">
            <h2 className="text-2xl font-bold">
              Minhas Fotos Compradas ({purchasedPhotos.length})
            </h2>
            
            {purchasedPhotos.length === 0 ? (
              <Card className="p-12 text-center">
                <FileImage className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhuma foto comprada ainda</h3>
                <p className="text-muted-foreground">
                  Explore os eventos e compre suas fotos favoritas!
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {purchasedPhotos.map((purchase) => (
                  <Card key={purchase.id} className="overflow-hidden">
                    <div className="aspect-square bg-gradient-subtle relative">
                      <img
                        src={purchase.photo.thumbnail_url || purchase.photo.watermarked_url}
                        alt={purchase.photo.title || 'Foto'}
                        className="w-full h-full object-cover"
                      />
                      <Badge className="absolute top-2 right-2 bg-green-600 text-white">
                        Comprada
                      </Badge>
                    </div>
                    <CardContent className="p-3">
                      <div className="space-y-2">
                        <p className="text-sm font-medium truncate">
                          {purchase.photo.title || 'Foto'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {purchase.photo.campaign?.title}
                        </p>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-green-600 font-medium">
                            R$ {purchase.amount.toFixed(2)}
                          </span>
                          <Button 
                            size="sm" 
                            className="gap-1"
                            onClick={() => handleDownload(purchase)}
                          >
                            <Download className="h-3 w-3" />
                            Baixar
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Comprada em {new Date(purchase.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default UserDashboard;