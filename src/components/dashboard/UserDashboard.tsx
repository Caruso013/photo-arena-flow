import React, { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { Search, Camera, ShoppingCart, Download, FileImage, Filter, Eye, Calendar } from 'lucide-react';
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
  const [photoSearchTerm, setPhotoSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'campaign' | 'price'>('date');
  const [filterByCampaign, setFilterByCampaign] = useState<string>('all');
  const [selectedPhoto, setSelectedPhoto] = useState<PurchasedPhoto | null>(null);
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

  // Filter and sort purchased photos
  const filteredAndSortedPhotos = purchasedPhotos
    .filter(purchase => {
      const matchesSearch = 
        (purchase.photo.title?.toLowerCase() || '').includes(photoSearchTerm.toLowerCase()) ||
        purchase.photo.campaign?.title.toLowerCase().includes(photoSearchTerm.toLowerCase());
      
      const matchesCampaign = filterByCampaign === 'all' || 
        purchase.photo.campaign?.title === filterByCampaign;
      
      return matchesSearch && matchesCampaign;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'campaign':
          return (a.photo.campaign?.title || '').localeCompare(b.photo.campaign?.title || '');
        case 'price':
          return b.amount - a.amount;
        default:
          return 0;
      }
    });

  // Get unique campaigns from purchased photos for filter
  const uniqueCampaigns = [...new Set(purchasedPhotos.map(p => p.photo.campaign?.title).filter(Boolean))];

  const handleViewPhoto = (photo: PurchasedPhoto) => {
    setSelectedPhoto(photo);
  };

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
        <div className="relative overflow-hidden rounded-xl p-8 bg-gradient-primary text-white shadow-elegant">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30"></div>
          <div className="relative z-10">
            <h1 className="text-4xl font-bold mb-3 animate-fade-in drop-shadow-lg">
              Bem-vindo, {profile?.full_name || 'Usuário'}! 👋
            </h1>
            <p className="text-lg opacity-95 max-w-2xl drop-shadow-md">
              Encontre e compre as melhores fotos dos seus eventos esportivos favoritos
            </p>
          </div>
        </div>

        {/* Search Section */}
        <Card className="shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
              <Input
                placeholder="Buscar eventos por nome ou localização..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-12 text-base"
              />
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="events" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="events" className="gap-2">
              <Camera className="h-4 w-4" />
              Eventos Disponíveis
            </TabsTrigger>
            <TabsTrigger value="purchases" className="gap-2">
              <ShoppingCart className="h-4 w-4" />
              Minhas Compras
            </TabsTrigger>
          </TabsList>

          <TabsContent value="events" className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                Eventos em Destaque
              </h2>
              {searchTerm && (
                <Badge variant="secondary" className="text-sm">
                  {filteredCampaigns.length} resultado(s)
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCampaigns.map((campaign) => (
                <Card key={campaign.id} className="group overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-2 hover:border-primary/20">
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
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <h2 className="text-2xl font-bold">
                Minhas Fotos Compradas ({filteredAndSortedPhotos.length})
              </h2>
              
              {/* Controls for filtering and sorting */}
              {purchasedPhotos.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Buscar fotos..."
                      value={photoSearchTerm}
                      onChange={(e) => setPhotoSearchTerm(e.target.value)}
                      className="pl-10 w-48"
                    />
                  </div>
                  
                  <Select value={filterByCampaign} onValueChange={setFilterByCampaign}>
                    <SelectTrigger className="w-48">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filtrar por evento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os eventos</SelectItem>
                      {uniqueCampaigns.map((campaign) => (
                        <SelectItem key={campaign} value={campaign || ''}>
                          {campaign}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select value={sortBy} onValueChange={(value: 'date' | 'campaign' | 'price') => setSortBy(value)}>
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="Ordenar por" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Data de compra</SelectItem>
                      <SelectItem value="campaign">Evento</SelectItem>
                      <SelectItem value="price">Preço</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            
            {purchasedPhotos.length === 0 ? (
              <Card className="p-12 text-center">
                <FileImage className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhuma foto comprada ainda</h3>
                <p className="text-muted-foreground">
                  Explore os eventos e compre suas fotos favoritas!
                </p>
              </Card>
            ) : filteredAndSortedPhotos.length === 0 ? (
              <Card className="p-12 text-center">
                <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhuma foto encontrada</h3>
                <p className="text-muted-foreground">
                  Tente ajustar os filtros ou termos de busca
                </p>
              </Card>
            ) : (
              <>
                {/* Statistics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <FileImage className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="text-sm text-muted-foreground">Total de Fotos</p>
                          <p className="text-2xl font-bold">{purchasedPhotos.length}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="text-sm text-muted-foreground">Eventos</p>
                          <p className="text-2xl font-bold">{uniqueCampaigns.length}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5 text-purple-600" />
                        <div>
                          <p className="text-sm text-muted-foreground">Total Gasto</p>
                          <p className="text-2xl font-bold">
                            {formatCurrency(purchasedPhotos.reduce((sum, p) => sum + p.amount, 0))}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Photos Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {filteredAndSortedPhotos.map((purchase) => (
                    <Card key={purchase.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                      <div className="aspect-square bg-gradient-subtle relative cursor-pointer" 
                           onClick={() => handleViewPhoto(purchase)}>
                        <img
                          src={purchase.photo.thumbnail_url || purchase.photo.watermarked_url}
                          alt={purchase.photo.title || 'Foto'}
                          className="w-full h-full object-cover"
                        />
                        <Badge className="absolute top-2 right-2 bg-green-600 text-white">
                          Comprada
                        </Badge>
                        <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                          <Eye className="h-8 w-8 text-white" />
                        </div>
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
                              {formatCurrency(purchase.amount)}
                            </span>
                            <div className="flex gap-1">
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="gap-1 h-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewPhoto(purchase);
                                }}
                              >
                                <Eye className="h-3 w-3" />
                                Ver
                              </Button>
                              <Button 
                                size="sm" 
                                className="gap-1 h-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownload(purchase);
                                }}
                              >
                                <Download className="h-3 w-3" />
                                Baixar
                              </Button>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Comprada em {new Date(purchase.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Photo View Modal */}
      <Dialog open={selectedPhoto !== null} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-4xl w-[90vw] max-h-[90vh] p-0">
          {selectedPhoto && (
            <div className="flex flex-col">
              <DialogHeader className="p-6 pb-0">
                <DialogTitle className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-semibold">
                      {selectedPhoto.photo.title || 'Foto'}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedPhoto.photo.campaign?.title}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDownload(selectedPhoto)}
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Baixar Original
                    </Button>
                  </div>
                </DialogTitle>
                <DialogDescription>
                  Visualize e faça o download da sua foto em alta resolução.
                </DialogDescription>
              </DialogHeader>
              
              <div className="px-6 pb-6">
                <div className="relative bg-black/5 rounded-lg overflow-hidden">
                  <img
                    src={selectedPhoto.photo.original_url || selectedPhoto.photo.watermarked_url}
                    alt={selectedPhoto.photo.title || 'Foto'}
                    className="w-full max-h-[60vh] object-contain"
                  />
                </div>
                
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Evento</p>
                    <p className="font-medium">{selectedPhoto.photo.campaign?.title}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Data da Compra</p>
                    <p className="font-medium">
                      {new Date(selectedPhoto.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Valor Pago</p>
                    <p className="font-medium text-green-600">
                      {formatCurrency(selectedPhoto.amount)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default UserDashboard;