import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { Camera, ShoppingCart, Download } from 'lucide-react';
import WatermarkedPhoto from '@/components/WatermarkedPhoto';
import { sendPurchaseConfirmationEmail } from '@/lib/email';

interface Photo {
  id: string;
  title?: string;
  watermarked_url: string;
  thumbnail_url?: string;
  original_url?: string;
  price?: number;
  is_available?: boolean;
}

interface CampaignData {
  id: string;
  title: string;
  cover_image_url?: string;
  description?: string;
}

interface Purchase {
  id: string;
  photo_id: string;
  status: string;
}

const Campaign = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [campaign, setCampaign] = useState<CampaignData | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [openPhoto, setOpenPhoto] = useState<Photo | null>(null);
  const [purchasingPhoto, setPurchasingPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchData(id);
  }, [id]);

  useEffect(() => {
    if (user) {
      fetchUserPurchases();
    }
  }, [user]);

  const fetchUserPurchases = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('purchases')
        .select('id, photo_id, status')
        .eq('buyer_id', user.id)
        .eq('status', 'completed');

      if (error) throw error;
      setPurchases(data || []);
    } catch (error) {
      console.error('Error fetching purchases:', error);
    }
  };

  const handlePurchase = async (photo: Photo) => {
    if (!user) {
      toast({
        title: "Login necessário",
        description: "Você precisa estar logado para comprar fotos.",
        variant: "destructive",
      });
      return;
    }

    if (!photo.price) {
      toast({
        title: "Preço não definido",
        description: "Esta foto não está disponível para compra.",
        variant: "destructive",
      });
      return;
    }

    setPurchasingPhoto(photo.id);

    try {
      // Aqui você implementaria a integração com Mercado Pago
      // Por enquanto, vamos simular uma compra bem-sucedida
      
      const { error } = await supabase
        .from('purchases')
        .insert({
          photo_id: photo.id,
          buyer_id: user.id,
          photographer_id: photos.find(p => p.id === photo.id)?.id || '', // Precisará ser ajustado
          amount: photo.price,
          status: 'completed',
          mercado_pago_payment_id: 'simulated_' + Date.now()
        });

      if (error) throw error;

      toast({
        title: "Compra realizada!",
        description: "Foto comprada com sucesso. Verifique seu e-mail e dashboard.",
      });

      // Atualizar lista de compras
      await fetchUserPurchases();
      
      // Enviar e-mail com a foto
      await sendPhotoByEmail(photo);

    } catch (error) {
      console.error('Error purchasing photo:', error);
      toast({
        title: "Erro na compra",
        description: "Não foi possível processar a compra. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setPurchasingPhoto(null);
    }
  };

  const sendPhotoByEmail = async (photo: Photo) => {
    if (!user?.email || !campaign) return;

    try {
      const result = await sendPurchaseConfirmationEmail(
        user.email,
        user.user_metadata?.full_name || 'Cliente',
        {
          photoTitle: photo.title || 'Foto sem título',
          photoUrl: photo.original_url || photo.watermarked_url,
          campaignTitle: campaign.title,
          amount: photo.price || 0,
          purchaseDate: new Date().toISOString()
        }
      );

      if (result.success) {
        toast({
          title: "E-mail enviado!",
          description: "Verifique sua caixa de entrada para baixar a foto.",
        });
      } else {
        console.log('Erro ao enviar e-mail:', result.message);
      }
    } catch (error) {
      console.error('Error sending email:', error);
    }
  };

  const isPhotoPurchased = (photoId: string) => {
    return purchases.some(purchase => purchase.photo_id === photoId);
  };

  const fetchData = async (campaignId: string) => {
    setLoading(true);
    try {
      const { data: campaignData, error: campErr } = await supabase
        .from('campaigns')
        .select('id, title, cover_image_url, description')
        .eq('id', campaignId)
        .single();

      if (campErr) throw campErr;
      setCampaign(campaignData as CampaignData);

      const { data: photosData, error: photosErr } = await supabase
        .from('photos')
        .select('id, title, watermarked_url, thumbnail_url, original_url, price, is_available')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false });

      if (photosErr) throw photosErr;
      setPhotos((photosData as Photo[]) || []);
    } catch (error) {
      console.error('Error fetching campaign photos:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-secondary text-secondary-foreground">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 md:gap-3">
              <img src="/lovable-uploads/6fdfc5d2-230c-4142-bf7c-3a326e5e45a8.png" alt="Logo" className="h-8 md:h-10 w-auto" />
            </Link>
          </div>
        </div>
      </header>

  <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-bold">{campaign?.title || 'Evento'}</h1>
              {campaign?.description && <p className="text-muted-foreground mt-2">{campaign.description}</p>}
            </div>

            {photos.length === 0 ? (
              <Card className="p-8 text-center">
                <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhuma foto encontrada</h3>
                <p className="text-muted-foreground">As fotos deste evento ainda não foram enviadas ou estão indisponíveis.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {photos.map((photo) => (
                  <Card key={photo.id} className="overflow-hidden">
                    <div className="aspect-square bg-gradient-subtle relative">
                      <WatermarkedPhoto
                        src={photo.thumbnail_url || photo.watermarked_url}
                        alt={photo.title || 'Foto'}
                        position="full"
                        opacity={0.4}
                      />
                    </div>
                    <CardContent className="p-3">
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <p className="text-sm truncate">{photo.title || 'Foto'}</p>
                          {photo.price && (
                            <p className="text-sm font-medium text-green-600">
                              R$ {photo.price.toFixed(2)}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" onClick={() => setOpenPhoto(photo)}>
                            Ver
                          </Button>
                          {isPhotoPurchased(photo.id) ? (
                            <Badge variant="default" className="text-xs">
                              Comprada
                            </Badge>
                          ) : photo.price && photo.is_available ? (
                            <Button 
                              size="sm" 
                              className="gap-1"
                              onClick={() => handlePurchase(photo)}
                              disabled={purchasingPhoto === photo.id}
                            >
                              {purchasingPhoto === photo.id ? (
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                              ) : (
                                <ShoppingCart className="h-3 w-3" />
                              )}
                              {purchasingPhoto === photo.id ? 'Comprando...' : 'Comprar'}
                            </Button>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              Indisponível
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Lightbox modal with front watermark overlay */}
      {openPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setOpenPhoto(null)}
        >
          <div
            className="relative max-w-[90vw] max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Display opened photo */}
            <WatermarkedPhoto
              src={openPhoto.watermarked_url}
              alt={openPhoto.title || 'Foto'}
              position="full"
              opacity={0.3}
              imgClassName="max-w-full max-h-[90vh] object-contain block"
              watermarkClassName=""
            />

            {/* Close button */}
            <button
              className="absolute top-2 right-2 bg-white/10 hover:bg-white/20 text-white rounded-full w-8 h-8 flex items-center justify-center"
              onClick={() => setOpenPhoto(null)}
              aria-label="Fechar"
            >
              ✕
            </button>

            {/* Purchase button in modal */}
            {openPhoto && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {isPhotoPurchased(openPhoto.id) ? (
                  <Badge variant="default" className="bg-green-600 text-white px-4 py-2">
                    <Download className="h-4 w-4 mr-2" />
                    Foto Comprada
                  </Badge>
                ) : openPhoto.price && openPhoto.is_available ? (
                  <Button 
                    className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={() => handlePurchase(openPhoto)}
                    disabled={purchasingPhoto === openPhoto.id}
                  >
                    {purchasingPhoto === openPhoto.id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        Comprando...
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="h-4 w-4" />
                        Comprar por R$ {openPhoto.price.toFixed(2)}
                      </>
                    )}
                  </Button>
                ) : (
                  <Badge variant="secondary" className="px-4 py-2">
                    Foto não disponível para compra
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Campaign;

// Inline modal markup appended at end of file via React portal-like pattern is not available here,
// so we include modal markup inside the component render above. To keep the patch minimal we've
// implemented opening via `openPhoto` state which should be present in the component.


/*
Notes for watermark usage:
- Place the front watermark image you shared into the public folder at: `public/watermark_front.png`.
- The lightbox will overlay that image centered on top of the displayed photo.

If you want a different filename or location, update the `watermarkUrl` below in the modal markup.
*/
