import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Camera, ShoppingCart, Download } from 'lucide-react';
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

interface Photo {
  id: string;
  title: string;
  watermarked_url: string;
  thumbnail_url: string;
  price: number;
  campaign: {
    title: string;
  };
}

const UserDashboard = () => {
  const { profile } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCampaigns();
    fetchPhotos();
  }, []);

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

  const fetchPhotos = async () => {
    try {
      const { data, error } = await supabase
        .from('photos')
        .select(`
          *,
          campaign:campaigns(title)
        `)
        .eq('is_available', true)
        .order('created_at', { ascending: false })
        .limit(12);

      if (error) throw error;
      setPhotos(data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching photos:', error);
      setLoading(false);
    }
  };

  const filteredPhotos = photos.filter(photo =>
    photo.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    photo.campaign?.title?.toLowerCase().includes(searchTerm.toLowerCase())
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
                placeholder="Buscar fotos por evento ou título..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Featured Campaigns */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Eventos em Destaque</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map((campaign) => (
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
                  <div className="flex justify-between items-center text-sm text-muted-foreground">
                    <span>{campaign.location}</span>
                    <span>{new Date(campaign.event_date).toLocaleDateString()}</span>
                  </div>
                  <p className="text-xs mt-2">Por: {campaign.photographer?.full_name}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Photos Grid */}
        <div>
          <h2 className="text-2xl font-bold mb-4">
            Fotos Disponíveis {searchTerm && `(${filteredPhotos.length} resultados)`}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredPhotos.map((photo) => (
              <Card key={photo.id} className="overflow-hidden hover:shadow-lg transition-shadow group">
                <div className="aspect-square bg-gradient-subtle relative">
                  <img
                    src={photo.watermarked_url}
                    alt={photo.title || 'Foto'}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <Button size="sm" className="gap-2">
                      <ShoppingCart className="h-4 w-4" />
                      Comprar
                    </Button>
                  </div>
                </div>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{photo.title || 'Foto sem título'}</p>
                      <p className="text-xs text-muted-foreground">{photo.campaign?.title}</p>
                    </div>
                    <Badge variant="secondary" className="ml-2">
                      R$ {photo.price.toFixed(2)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {filteredPhotos.length === 0 && (
            <Card className="p-12 text-center">
              <Camera className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma foto encontrada</h3>
              <p className="text-muted-foreground">
                {searchTerm 
                  ? 'Tente buscar com outros termos'
                  : 'Ainda não há fotos disponíveis para compra'
                }
              </p>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default UserDashboard;