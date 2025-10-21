import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import PaymentModal from '@/components/modals/PaymentModal';
import WatermarkedPhoto from '@/components/WatermarkedPhoto';
import AntiScreenshotProtection from '@/components/security/AntiScreenshotProtection';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Clock,
  Folder,
  Image as ImageIcon
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

interface SubEvent {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  event_time: string | null;
  photo_count?: number;
}

interface Photo {
  id: string;
  title: string | null;
  original_url: string;
  watermarked_url: string;
  thumbnail_url: string | null;
  price: number;
  is_available: boolean;
  sub_event_id: string | null;
}

const Campaign = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();
  
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [subEvents, setSubEvents] = useState<SubEvent[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedSubEvent, setSelectedSubEvent] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [albumPreviews, setAlbumPreviews] = useState<Record<string, string>>({});
  
  // Paginação
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const PHOTOS_PER_PAGE = 24;

  // Memoizar contagem total de fotos
  const totalPhotos = useMemo(() => {
    if (selectedSubEvent) {
      return subEvents.find(se => se.id === selectedSubEvent)?.photo_count || 0;
    }
    return subEvents.reduce((sum, se) => sum + (se.photo_count || 0), 0);
  }, [subEvents, selectedSubEvent]);

  useEffect(() => {
    if (id) {
      fetchCampaign();
      fetchSubEvents();
    }
  }, [id]);

  // Resetar página quando trocar de álbum
  useEffect(() => {
    setPage(1);
    setPhotos([]);
    if (id) {
      fetchPhotos(1);
    }
  }, [selectedSubEvent]);

  // Buscar fotos quando mudar de página
  useEffect(() => {
    if (id && page > 1) {
      fetchPhotos(page);
    }
  }, [page]);

  // Otimização: Buscar previews em paralelo
  useEffect(() => {
    const fetchAlbumPreviews = async () => {
      if (subEvents.length === 0) return;
      
      try {
        // Buscar todos os previews em paralelo (muito mais rápido!)
        const previewPromises = subEvents.map(async (subEvent) => {
          const { data } = await supabase
            .from('photos')
            .select('thumbnail_url, watermarked_url')
            .eq('sub_event_id', subEvent.id)
            .eq('is_available', true)
            .limit(1)
            .maybeSingle();
          
          return { id: subEvent.id, url: data?.thumbnail_url || data?.watermarked_url };
        });
        
        const results = await Promise.all(previewPromises);
        
        const previews: Record<string, string> = {};
        results.forEach(result => {
          if (result.url) {
            previews[result.id] = result.url;
          }
        });
        
        setAlbumPreviews(previews);
      } catch (error) {
        // Silenciar erro de preview - não é crítico
      }
    };
    
    fetchAlbumPreviews();
  }, [subEvents]);

  const fetchCampaign = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          id, title, description, event_date, location, cover_image_url,
          is_active, photographer_id, organization_id, created_at,
          photographer:profiles!campaigns_photographer_id_fkey(full_name, email),
          organization:organizations(name, description)
        `)
        .eq('id', id)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      setCampaign(data as any);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar a campanha.",
        variant: "destructive",
      });
      navigate('/events');
    }
  };

  const fetchSubEvents = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('sub_events')
        .select(`
          id, title, description, location, event_time,
          photos:photos(count)
        `)
        .eq('campaign_id', id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const subEventsWithCount = (data || []).map(se => ({
        ...se,
        photo_count: se.photos?.[0]?.count || 0
      }));
      
      setSubEvents(subEventsWithCount);
    } catch (error) {
      // Silenciar erro de sub-eventos - não é crítico
    }
  };

  const fetchPhotos = async (pageNum: number) => {
    if (!id) return;

    try {
      setLoadingPhotos(true);
      
      const from = (pageNum - 1) * PHOTOS_PER_PAGE;
      const to = from + PHOTOS_PER_PAGE - 1;

      // Primeiro, contar o total de fotos
      let countQuery = supabase
        .from('photos')
        .select('id', { count: 'exact', head: true })
        .eq('campaign_id', id)
        .eq('is_available', true);

      if (selectedSubEvent) {
        countQuery = countQuery.eq('sub_event_id', selectedSubEvent);
      }

      const { count } = await countQuery;
      const total = count || 0;
      setTotalPages(Math.ceil(total / PHOTOS_PER_PAGE));

      // Depois buscar as fotos
      let query = supabase
        .from('photos')
        .select('id, title, original_url, watermarked_url, thumbnail_url, price, is_available, sub_event_id')
        .eq('campaign_id', id)
        .eq('is_available', true)
        .range(from, to);

      if (selectedSubEvent) {
        query = query.eq('sub_event_id', selectedSubEvent);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      
      setPhotos(data || []);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar as fotos.",
        variant: "destructive",
      });
    } finally {
      setLoadingPhotos(false);
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

  const handleAddToCart = (photo: Photo) => {
    if (!user) {
      toast({
        title: "Login necessário",
        description: "Você precisa fazer login para adicionar fotos ao carrinho.",
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }

    addToCart({
      id: photo.id,
      title: photo.title,
      price: photo.price,
      watermarked_url: photo.watermarked_url,
      thumbnail_url: photo.thumbnail_url,
    });
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
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header Skeleton */}
        <div className="mb-8">
          <Skeleton className="h-8 w-32 mb-4" />
          <Skeleton className="h-12 w-3/4 mb-4" />
          <div className="flex flex-wrap gap-4 mb-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-6 w-36" />
          </div>
        </div>

        {/* Albums Skeleton */}
        <div className="mb-8">
          <Skeleton className="h-8 w-48 mb-4" />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <Skeleton className="aspect-video" />
                <CardContent className="p-6">
                  <Skeleton className="h-6 w-full mb-2" />
                  <Skeleton className="h-4 w-20" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Photos Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="aspect-square" />
              <CardContent className="p-4">
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
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
        <div className="container mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/events')}
            className="gap-1 sm:gap-2 h-9 sm:h-10 text-xs sm:text-sm"
          >
            <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Voltar</span>
          </Button>
          
          <div className="flex items-center gap-2">
            <CartDrawer />
            <Camera className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            <span className="font-semibold text-sm sm:text-base">STA Fotos</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Campaign Header */}
        <div className="mb-6 sm:mb-8">
          <div className="relative rounded-xl overflow-hidden mb-4 sm:mb-6">
            {campaign.cover_image_url ? (
              <img
                src={campaign.cover_image_url}
                alt={campaign.title}
                className="w-full h-48 sm:h-64 object-cover"
              />
            ) : (
              <div className="w-full h-48 sm:h-64 bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center">
                <Camera className="h-12 w-12 sm:h-16 sm:w-16 text-white" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/20" />
            <div className="absolute bottom-3 sm:bottom-4 left-3 sm:left-4 text-white">
              <h1 className="text-xl sm:text-3xl font-bold mb-1 sm:mb-2">{campaign.title}</h1>
              <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm">
                {campaign.event_date && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">{new Date(campaign.event_date).toLocaleDateString('pt-BR')}</span>
                    <span className="sm:hidden">{new Date(campaign.event_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                  </div>
                )}
                {campaign.location && (
                  <div className="flex items-center gap-1 max-w-[200px] sm:max-w-none">
                    <MapPin className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="truncate">{campaign.location}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="flex items-center gap-2 text-primary text-base sm:text-lg">
                  <Camera className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                  <span className="truncate">Fotógrafo Responsável</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-base sm:text-lg font-bold text-foreground truncate">{campaign.photographer?.full_name}</p>
                <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <User className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{campaign.photographer?.email}</span>
                </p>
              </CardContent>
            </Card>

            {campaign.organization && (
              <Card>
                <CardHeader className="pb-3 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Building2 className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                    <span className="truncate">Organização</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="font-medium truncate">{campaign.organization.name}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{campaign.organization.description}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {campaign.description && (
            <Card className="mb-6 sm:mb-8">
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="text-base sm:text-lg">Sobre o Evento</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-muted-foreground text-sm sm:text-base">{campaign.description}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Albums/Sub-Events Section */}
        {subEvents.length > 0 && (
          <div className="mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 flex items-center gap-2">
              <Folder className="h-5 w-5 sm:h-6 sm:w-6" />
              Todas as Pastas
            </h2>
            <p className="text-muted-foreground mb-4 sm:mb-6 text-sm sm:text-base">
              Navegue pelos álbuns deste evento para encontrar suas fotos
            </p>
            
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
              {/* Botão "Todas as Fotos" */}
              <Card 
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  selectedSubEvent === null ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setSelectedSubEvent(null)}
              >
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col items-center text-center gap-2 sm:gap-3">
                    <div className={`p-3 sm:p-4 rounded-full ${
                      selectedSubEvent === null ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      <ImageIcon className="h-6 w-6 sm:h-8 sm:w-8" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm sm:text-base">Todas as Fotos</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                        {totalPhotos} fotos
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Álbuns/Pastas */}
              {subEvents.map((subEvent) => (
                <Card 
                  key={subEvent.id}
                  className={`cursor-pointer transition-all hover:shadow-lg overflow-hidden ${
                    selectedSubEvent === subEvent.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedSubEvent(subEvent.id)}
                >
                  {/* Preview da foto */}
                  {albumPreviews[subEvent.id] && (
                    <div className="aspect-[4/5] relative">
                      <img 
                        src={albumPreviews[subEvent.id]} 
                        alt={subEvent.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/20" />
                    </div>
                  )}
                  
                  <CardContent className="p-3 sm:p-6">
                    <div className="flex flex-col items-center text-center gap-2 sm:gap-3">
                      <div className={`p-3 sm:p-4 rounded-full ${
                        selectedSubEvent === subEvent.id ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      }`}>
                        <Folder className="h-6 w-6 sm:h-8 sm:w-8" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm sm:text-base line-clamp-2">{subEvent.title}</h3>
                        <Badge variant="secondary" className="mt-1 sm:mt-2 text-xs">
                          {subEvent.photo_count} fotos
                        </Badge>
                        {subEvent.location && (
                          <p className="text-xs text-muted-foreground mt-1 sm:mt-2 flex items-center justify-center gap-1 truncate">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{subEvent.location}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Photos Grid */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 flex items-center gap-2">
            <ImageIcon className="h-5 w-5 sm:h-6 sm:w-6" />
            <span className="truncate">
              {selectedSubEvent 
                ? `${subEvents.find(se => se.id === selectedSubEvent)?.title || 'Álbum'} (${photos.length})` 
                : `Todas as Fotos (${photos.length})`
              }
            </span>
          </h2>

          {photos.length === 0 ? (
            <Card className="p-8 sm:p-12 text-center">
              <Camera className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-base sm:text-lg font-medium mb-2">Nenhuma foto disponível</h3>
              <p className="text-muted-foreground text-sm sm:text-base">
                As fotos deste evento ainda não foram publicadas.
              </p>
            </Card>
          ) : (
            <>
              <AntiScreenshotProtection>
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                  {photos.map((photo, index) => (
                    <Card key={photo.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                      <div className="aspect-square bg-gradient-subtle relative">
                        <WatermarkedPhoto
                          src={photo.thumbnail_url || photo.watermarked_url}
                          alt={photo.title || 'Foto'}
                          position="full"
                          opacity={0.85}
                          imgClassName="w-full h-full object-cover"
                          loading={index < 8 ? "eager" : "lazy"}
                        />
                        <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="secondary" className="gap-1 h-8 sm:h-9 text-xs sm:text-sm">
                                <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                                Ver
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-[95vw] sm:max-w-4xl w-[90vw]">
                              <DialogHeader>
                                <DialogTitle className="text-sm sm:text-base truncate">{photo.title || 'Foto'}</DialogTitle>
                              </DialogHeader>
                              <div className="relative">
                                <AntiScreenshotProtection>
                                  <WatermarkedPhoto
                                    src={photo.watermarked_url || photo.original_url}
                                    alt={photo.title || 'Foto'}
                                    position="full"
                                    opacity={0.85}
                                    imgClassName="w-full max-h-[60vh] sm:max-h-[70vh] object-contain rounded-lg"
                                  />
                                </AntiScreenshotProtection>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                      <CardContent className="p-2 sm:p-3">
                        <div className="space-y-1 sm:space-y-2">
                          <p className="text-xs sm:text-sm font-medium truncate">
                            {photo.title || 'Foto'}
                          </p>
                          <div className="flex justify-between items-center gap-2">
                            <span className="text-base sm:text-lg font-bold text-green-600 flex-shrink-0">
                              {formatCurrency(photo.price)}
                            </span>
                            <div className="flex gap-1 sm:gap-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleAddToCart(photo)}
                                className="gap-1 h-8 sm:h-9 w-8 sm:w-auto px-2 sm:px-3"
                              >
                                <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                onClick={() => handleBuyPhoto(photo)}
                                className="gap-1 h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-3"
                              >
                                <span className="hidden sm:inline">Comprar</span>
                                <span className="sm:hidden">R$</span>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </AntiScreenshotProtection>
              
              {/* Paginação */}
              {totalPages > 1 && (
                <div className="mt-6 sm:mt-8">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                          className={page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                      
                      {[...Array(totalPages)].map((_, i) => {
                        const pageNum = i + 1;
                        // Mostrar apenas algumas páginas
                        if (
                          pageNum === 1 ||
                          pageNum === totalPages ||
                          (pageNum >= page - 1 && pageNum <= page + 1)
                        ) {
                          return (
                            <PaginationItem key={pageNum}>
                              <PaginationLink
                                onClick={() => setPage(pageNum)}
                                isActive={page === pageNum}
                                className="cursor-pointer"
                              >
                                {pageNum}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        } else if (pageNum === page - 2 || pageNum === page + 2) {
                          return (
                            <PaginationItem key={pageNum}>
                              <span className="px-4">...</span>
                            </PaginationItem>
                          );
                        }
                        return null;
                      })}
                      
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                          className={page === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
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
