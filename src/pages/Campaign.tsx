import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import PaymentModal from '@/components/modals/PaymentModal';
import { 
  Calendar, 
  MapPin, 
  Camera, 
  ArrowLeft, 
  Download,
  Eye,
  ShoppingCart,
  User,
  Building2,
  Clock
} from 'lucide-react';

interface Campaign {
  id: string;
  title: string;
  description: string | null;
  event_date: string | null;
  location: string | null;
  cover_image_url: string | null;
  is_active: boolean;
  photographer_id: string;
  organization_id: string | null;
  created_at: string;
  photographer?: {
    full_name: string;
    email: string;
  };
  organization?: {
    name: string;
    description: string;
  };
}

interface Photo {
  id: string;
  title: string | null;
  original_url: string;
  watermarked_url: string;
  thumbnail_url: string | null;
  price: number;
  is_available: boolean;
}

const Campaign = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    if (id) {
      fetchCampaign();
      fetchPhotos();
    }
  }, [id]);

  const fetchCampaign = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          photographer:profiles!campaigns_photographer_id_fkey(full_name, email),
          organization:organizations(name, description)
        `)
        .eq('id', id)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      setCampaign(data as any);
    } catch (error) {
      console.error('Error fetching campaign:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar a campanha.",
        variant: "destructive",
      });
      navigate('/events');
    }
  };

  const fetchPhotos = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('photos')
        .select('*')
        .eq('campaign_id', id)
        .eq('is_available', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPhotos(data || []);
    } catch (error) {
      console.error('Error fetching photos:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as fotos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBuyPhoto = (photo: Photo) => {
    if (!user) {
      toast({
        title: "Login necessário",
        description: "Você precisa fazer login para comprar fotos.",
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }

    setSelectedPhoto(photo);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = async (paymentData: any) => {
    if (!selectedPhoto || !user) return;

    try {
      setPurchasing(true);

      // Criar registro de compra
      const { error } = await supabase
        .from('purchases')
        .insert({
          photo_id: selectedPhoto.id,
          buyer_id: user.id,
          photographer_id: campaign?.photographer_id,
          amount: selectedPhoto.price,
          mercadopago_payment_id: paymentData.id,
          status: 'completed'
        });

      if (error) throw error;

      toast({
        title: "Compra realizada!",
        description: "Sua foto foi comprada com sucesso. Você pode baixá-la no seu dashboard.",
      });

      setShowPaymentModal(false);
      setSelectedPhoto(null);
    } catch (error) {
      console.error('Error completing purchase:', error);
      toast({
        title: "Erro na compra",
        description: "Houve um problema ao finalizar sua compra.",
        variant: "destructive",
      });
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <h2 className="text-xl font-semibold mb-2">Campanha não encontrada</h2>
          <p className="text-muted-foreground mb-4">
            A campanha solicitada não existe ou não está mais ativa.
          </p>
          <Button onClick={() => navigate('/events')}>
            Voltar aos eventos
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Header */}
      <header className="border-b bg-white/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/events')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          
          <div className="flex items-center gap-2">
            <Camera className="h-6 w-6 text-primary" />
            <span className="font-semibold">Photo Arena</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Campaign Header */}
        <div className="mb-8">
          <div className="relative rounded-xl overflow-hidden mb-6">
            {campaign.cover_image_url ? (
              <img
                src={campaign.cover_image_url}
                alt={campaign.title}
                className="w-full h-64 object-cover"
              />
            ) : (
              <div className="w-full h-64 bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center">
                <Camera className="h-16 w-16 text-white" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/20" />
            <div className="absolute bottom-4 left-4 text-white">
              <h1 className="text-3xl font-bold mb-2">{campaign.title}</h1>
              <div className="flex flex-wrap gap-4 text-sm">
                {campaign.event_date && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {new Date(campaign.event_date).toLocaleDateString('pt-BR')}
                  </div>
                )}
                {campaign.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {campaign.location}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Fotógrafo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">{campaign.photographer?.full_name}</p>
                <p className="text-sm text-muted-foreground">{campaign.photographer?.email}</p>
              </CardContent>
            </Card>

            {campaign.organization && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Organização
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">{campaign.organization.name}</p>
                  <p className="text-sm text-muted-foreground">{campaign.organization.description}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {campaign.description && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Sobre o Evento</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{campaign.description}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Photos Grid */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6">
            Fotos do Evento ({photos.length})
          </h2>

          {photos.length === 0 ? (
            <Card className="p-12 text-center">
              <Camera className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma foto disponível</h3>
              <p className="text-muted-foreground">
                As fotos deste evento ainda não foram publicadas.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {photos.map((photo) => (
                <Card key={photo.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="aspect-square bg-gradient-subtle relative">
                    <img
                      src={photo.thumbnail_url || photo.watermarked_url}
                      alt={photo.title || 'Foto'}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="secondary" className="gap-1">
                            <Eye className="h-4 w-4" />
                            Ver
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl w-[90vw]">
                          <DialogHeader>
                            <DialogTitle>{photo.title || 'Foto'}</DialogTitle>
                          </DialogHeader>
                          <div className="relative">
                            <img
                              src={photo.watermarked_url}
                              alt={photo.title || 'Foto'}
                              className="w-full max-h-[70vh] object-contain rounded-lg"
                            />
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                  <CardContent className="p-3">
                    <div className="space-y-2">
                      <p className="text-sm font-medium truncate">
                        {photo.title || 'Foto'}
                      </p>
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-bold text-green-600">
                          R$ {photo.price.toFixed(2)}
                        </span>
                        <Button 
                          size="sm" 
                          onClick={() => handleBuyPhoto(photo)}
                          className="gap-1"
                        >
                          <ShoppingCart className="h-3 w-3" />
                          Comprar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Payment Modal */}
        {showPaymentModal && selectedPhoto && (
          <PaymentModal
            isOpen={showPaymentModal}
            onClose={() => {
              setShowPaymentModal(false);
              setSelectedPhoto(null);
            }}
            photo={{
              id: selectedPhoto.id,
              title: selectedPhoto.title || 'Foto',
              price: selectedPhoto.price,
              image_url: selectedPhoto.thumbnail_url || selectedPhoto.watermarked_url
            }}
            onPaymentSuccess={handlePaymentSuccess}
          />
        )}
      </div>
    </div>
  );
};

export default Campaign;
