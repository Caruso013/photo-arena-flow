import React, { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Camera, ShoppingCart, Download, FileImage } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PhotographerApplicationForm } from './PhotographerApplicationForm';

interface Campaign {
  id: string;
  short_code?: string;
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
              <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 sm:h-5 sm:w-5" />
              <Input
                placeholder="Buscar eventos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 sm:pl-12 h-11 sm:h-12 text-sm sm:text-base"
              />
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="events" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3 h-auto sm:h-10 p-1">
            <TabsTrigger value="events" className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-2 py-2 sm:py-0 h-14 sm:h-9">
              <Camera className="h-4 w-4 flex-shrink-0" />
              <span className="text-xs sm:text-sm">Eventos</span>
            </TabsTrigger>
            <TabsTrigger value="purchases" className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-2 py-2 sm:py-0 h-14 sm:h-9">
              <ShoppingCart className="h-4 w-4 flex-shrink-0" />
              <span className="text-xs sm:text-sm">Compras</span>
            </TabsTrigger>
            <TabsTrigger value="photographer" className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-2 py-2 sm:py-0 h-14 sm:h-9">
              <Camera className="h-4 w-4 flex-shrink-0" />
              <span className="text-xs sm:text-sm">Fotógrafo</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="events" className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                Eventos em Destaque
              </h2>
              {searchTerm && (
                <Badge variant="secondary" className="text-xs sm:text-sm">
                  {filteredCampaigns.length} resultado(s)
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredCampaigns.map((campaign) => (
                <Card key={campaign.id} className="group overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-2 hover:border-primary/20">
                  <div className="aspect-[4/5] bg-gradient-subtle relative">
                    {campaign.cover_image_url ? (
                      <img
                        src={campaign.cover_image_url}
                        alt={campaign.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Camera className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-3 sm:p-4">
                    <CardTitle className="text-base sm:text-lg mb-2 line-clamp-2">{campaign.title}</CardTitle>
                    <CardDescription className="text-xs sm:text-sm mb-2 line-clamp-2">
                      {campaign.description}
                    </CardDescription>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 text-xs sm:text-sm text-muted-foreground mb-3">
                      <span className="truncate max-w-full">{campaign.location}</span>
                      <span className="flex-shrink-0">{new Date(campaign.event_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <span className="text-xs sm:text-sm truncate">Por: {campaign.photographer?.full_name}</span>
                      <Link to={campaign.short_code ? `/E/${campaign.short_code}` : `/campaign/${campaign.id}`} className="w-full sm:w-auto">
                        <Button size="sm" className="gap-1 w-full sm:w-auto h-9 sm:h-8">
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
              <Card className="p-6 sm:p-12 text-center">
                <Camera className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-base sm:text-lg font-medium mb-2">Nenhum evento encontrado</h3>
                <p className="text-sm sm:text-base text-muted-foreground">
                  {searchTerm 
                    ? `Não encontramos eventos para "${searchTerm}"`
                    : "Não há eventos disponíveis no momento"
                  }
                </p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="purchases" className="space-y-6 animate-fade-in">
            <div className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-bold">Minhas Fotos Compradas ({purchasedPhotos.length})</h2>
              
              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <Card>
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm text-muted-foreground">Total de Fotos</p>
                        <p className="text-xl sm:text-2xl font-bold">{purchasedPhotos.length}</p>
                      </div>
                      <FileImage className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500 flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm text-muted-foreground">Eventos</p>
                        <p className="text-xl sm:text-2xl font-bold">
                          {new Set(purchasedPhotos.map(p => p.photo.campaign?.title)).size}
                        </p>
                      </div>
                      <Camera className="h-6 w-6 sm:h-8 sm:w-8 text-green-500 flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm text-muted-foreground">Total Gasto</p>
                        <p className="text-xl sm:text-2xl font-bold truncate">
                          {formatCurrency(purchasedPhotos.reduce((sum, p) => sum + Number(p.amount), 0))}
                        </p>
                      </div>
                      <ShoppingCart className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500 flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {purchasedPhotos.length === 0 ? (
              <Card>
                <CardContent className="py-8 sm:py-12 text-center">
                  <ShoppingCart className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg sm:text-xl font-medium mb-2">Nenhuma compra realizada</h3>
                  <p className="text-sm sm:text-base text-muted-foreground">
                    Explore os eventos e adquira suas fotos
                  </p>
                </CardContent>
              </Card>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                {purchasedPhotos.map((purchase) => (
                  <Card key={purchase.id} className="overflow-hidden hover:shadow-lg transition-all group border border-green-200 dark:border-green-800">
                    <div className="relative">
                      <div className="aspect-square relative bg-muted overflow-hidden">
                        {/* ✅ FOTO COMPRADA: mostra original SEM marca d'água */}
                        <img
                          src={purchase.photo.original_url || purchase.photo.thumbnail_url}
                          alt="Foto comprada - sem marca d'água"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (purchase.photo.thumbnail_url && target.src !== purchase.photo.thumbnail_url) {
                              target.src = purchase.photo.thumbnail_url;
                            }
                          }}
                        />
                        <Badge className="absolute top-1 left-1 bg-green-500 text-xs px-1.5 py-0.5 sm:top-2 sm:left-2 sm:px-2 sm:py-1">
                          <span className="hidden sm:inline">Comprada</span>
                          <span className="sm:hidden">✓</span>
                        </Badge>
                      </div>
                    </div>
                    <CardContent className="p-2 sm:p-3">
                      <p className="text-xs sm:text-sm font-medium mb-1 line-clamp-1" title={purchase.photo.title || `Foto ${purchase.photo.id.slice(0, 8)}`}>
                        {purchase.photo.title || `Foto ${purchase.photo.id.slice(0, 8)}`}
                      </p>
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-1" title={purchase.photo.campaign?.title}>
                        {purchase.photo.campaign?.title}
                      </p>
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <span className="text-xs sm:text-sm font-bold text-green-600 truncate">
                          {formatCurrency(Number(purchase.amount))}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 flex-shrink-0"
                          disabled={purchase.status !== 'completed'}
                          onClick={async () => {
                            try {
                              const parseStoragePath = (url: string) => {
                                try {
                                  const marker = '/storage/v1/object/';
                                  const idx = url.indexOf(marker);
                                  if (idx === -1) return null;
                                  let rest = url.slice(idx + marker.length);
                                  // remove leading 'public/' if present
                                  if (rest.startsWith('public/')) rest = rest.replace('public/', '');
                                  const firstSlash = rest.indexOf('/');
                                  if (firstSlash === -1) return null;
                                  const bucket = rest.slice(0, firstSlash);
                                  const path = rest.slice(firstSlash + 1);
                                  return { bucket, path } as const;
                                } catch { return null; }
                              };

                              const parsed = parseStoragePath(purchase.photo.original_url);
                              let downloadUrl = purchase.photo.original_url;

                              if (parsed) {
                                const { data, error } = await supabase
                                  .storage
                                  .from(parsed.bucket)
                                  .createSignedUrl(parsed.path, 60);
                                if (error) throw error;
                                if (data?.signedUrl) downloadUrl = data.signedUrl;
                              }

                              const response = await fetch(downloadUrl);
                              if (!response.ok) throw new Error(`HTTP ${response.status}`);
                              const blob = await response.blob();
                              const url = window.URL.createObjectURL(blob);
                              const link = document.createElement('a');
                              link.href = url;
                              link.download = `foto-${purchase.photo.id}.jpg`;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              window.URL.revokeObjectURL(url);
                            } catch (error) {
                              console.error('Erro ao baixar foto:', error);
                              // Fallback abre em nova aba (permite o usuário salvar manualmente)
                              window.open(purchase.photo.original_url, '_blank');
                            }
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Comprada em {new Date(purchase.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="photographer" className="space-y-6 animate-fade-in">
            <PhotographerApplicationForm />
          </TabsContent>
        </Tabs>
      </div>
  );
};

export default UserDashboard;