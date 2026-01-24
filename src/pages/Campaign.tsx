import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSwipeable } from 'react-swipeable';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
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
  Image as ImageIcon,
  Heart,
  ScanFace,
  Edit,
  Star,
  ChevronLeft,
  ChevronRight,
  X,
  Trash2,
  Gift,
  Search,
  Mail,
  Loader2
} from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';
import { FaceRecognitionModal } from '@/components/FaceRecognitionModal';
import EditEventModal from '@/components/modals/EditEventModal';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

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
  progressive_discount_enabled?: boolean;
  created_at: string;
  photographer?: {
    avatar_url: any;
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
  cover_image_url?: string | null;
}

interface Photo {
  id: string;
  title: string | null;
  original_url: string;
  watermarked_url: string;
  thumbnail_url: string | null;
  price: number;
  is_available: boolean;
  is_featured?: boolean;
}

const Campaign = () => {
  const { id, code } = useParams<{ id?: string; code?: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { addToCart } = useCart();
  const { toggleFavorite, isFavorited } = useFavorites();
  const haptic = useHapticFeedback();
  const [togglingFeatured, setTogglingFeatured] = useState<string | null>(null);
  
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [campaignPhotographers, setCampaignPhotographers] = useState<Array<{
    avatar_url: any; full_name: string; email: string 
}>>([]);
  const [subEvents, setSubEvents] = useState<SubEvent[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedSubEvent, setSelectedSubEvent] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showEditEventModal, setShowEditEventModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [albumPreviews, setAlbumPreviews] = useState<Record<string, string>>({});
  const [showFaceRecognition, setShowFaceRecognition] = useState(false);
  const [deletingAlbum, setDeletingAlbum] = useState<string | null>(null);
  
  // Estados para liberar foto gratuitamente
  const [showReleasePhotoDialog, setShowReleasePhotoDialog] = useState(false);
  const [releasePhotoId, setReleasePhotoId] = useState<string | null>(null);
  const [releaseSearch, setReleaseSearch] = useState('');
  const [releaseSearchResults, setReleaseSearchResults] = useState<{id: string; full_name: string; email: string}[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [selectedUserForRelease, setSelectedUserForRelease] = useState<{id: string; full_name: string; email: string} | null>(null);
  const [releasingPhoto, setReleasingPhoto] = useState(false);
  
  // Paginação
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  // Aumentado para 50 fotos por página conforme solicitado
  const PHOTOS_PER_PAGE = 50;
  
  // Estado para foto selecionada no modal com navegação
  const [viewingPhotoIndex, setViewingPhotoIndex] = useState<number | null>(null);

  // Handlers para navegação de fotos com swipe
  const handlePrevPhoto = useCallback(() => {
    if (viewingPhotoIndex !== null && viewingPhotoIndex > 0) {
      haptic.light();
      setViewingPhotoIndex(viewingPhotoIndex - 1);
    }
  }, [viewingPhotoIndex, haptic]);

  const handleNextPhoto = useCallback(() => {
    if (viewingPhotoIndex !== null && viewingPhotoIndex < photos.length - 1) {
      haptic.light();
      setViewingPhotoIndex(viewingPhotoIndex + 1);
    }
  }, [viewingPhotoIndex, photos.length, haptic]);

  // Swipe handlers para navegação mobile
  const swipeHandlers = useSwipeable({
    onSwipedLeft: handleNextPhoto,
    onSwipedRight: handlePrevPhoto,
    preventScrollOnSwipe: true,
    trackMouse: false,
    trackTouch: true,
    delta: 50,
  });

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (viewingPhotoIndex === null) return;
      if (e.key === 'ArrowLeft') handlePrevPhoto();
      if (e.key === 'ArrowRight') handleNextPhoto();
      if (e.key === 'Escape') setViewingPhotoIndex(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewingPhotoIndex, handlePrevPhoto, handleNextPhoto]);

  // Memoizar contagem total de fotos
  const totalPhotos = useMemo(() => {
    if (selectedSubEvent) {
      return subEvents.find(se => se.id === selectedSubEvent)?.photo_count || 0;
    }
    return subEvents.reduce((sum, se) => sum + (se.photo_count || 0), 0);
  }, [subEvents, selectedSubEvent]);

  // Helper para gerar nome da foto
  const getPhotoName = (photo: Photo, index: number) => {
    const photoNumber = index + 1 + ((page - 1) * PHOTOS_PER_PAGE);
    return `Foto ${String(photoNumber).padStart(3, '0')}`;
  };

  useEffect(() => {
    if (id || code) {
      fetchCampaign();
    }
  }, [id, code]);

  // Buscar sub_events e fotógrafos APÓS campaign ser carregada
  useEffect(() => {
    if (campaign?.id) {
      console.log('📂 Campaign loaded, fetching sub_events for:', campaign.id);
      fetchSubEvents();
      fetchCampaignPhotographers();
    }
  }, [campaign?.id]);

  // Resetar página quando trocar de álbum
  useEffect(() => {
    setPage(1);
    setPhotos([]);
    if (id) {
      fetchPhotos(1);
    }
  }, [selectedSubEvent]);

  // Prefetch da próxima página quando próximo do final
  useEffect(() => {
    const prefetchNextPage = async () => {
      if (!id || page >= totalPages || loadingPhotos) return;
      
      const nextPage = page + 1;
      const from = (nextPage - 1) * PHOTOS_PER_PAGE;
      const to = from + PHOTOS_PER_PAGE - 1;
      
      try {
        let query = supabase
          .from('photos')
          .select('id, title, original_url, watermarked_url, thumbnail_url, price, is_available')
          .eq('campaign_id', id)
          .eq('is_available', true)
          .range(from, to)
          .order('upload_sequence', { ascending: true })
          .order('created_at', { ascending: true });

        // Prefetch silencioso (não atualiza state)
        await query;
      } catch (error) {
        // Silenciosamente ignorar erros de prefetch
      }
    };

    // Iniciar prefetch quando chegar na página atual
    const timer = setTimeout(prefetchNextPage, 500);
    return () => clearTimeout(timer);
  }, [id, page, totalPages, selectedSubEvent, loadingPhotos]);

  // Buscar fotos quando mudar de página OU mudar de álbum
  useEffect(() => {
    if (campaign?.id) {
      setPage(1); // Reset para primeira página ao mudar de álbum
      fetchPhotos(1);
    }
  }, [selectedSubEvent, campaign?.id]);

  // Buscar fotos quando mudar de página (sem resetar)
  useEffect(() => {
    if (campaign?.id && page > 1) {
      fetchPhotos(page);
    }
  }, [page]);

  // Otimização: Buscar previews em paralelo (desabilitado - sub_events não existe)
  useEffect(() => {
    // Funcionalidade desabilitada até sub_events ser implementado
    // A tabela sub_events ainda não foi criada neste projeto
  }, []);

  const fetchCampaign = async () => {
    if (!id && !code) return;

    try {
      let query = supabase
        .from('campaigns')
        .select(`
          id, title, description, event_date, location, cover_image_url, short_code,
          is_active, photographer_id, organization_id, created_at, progressive_discount_enabled,
          photographer:profiles!campaigns_photographer_id_fkey(full_name, email, avatar_url),
          organization:organizations(name, description)
        `)
        .eq('is_active', true);

      // Buscar por código curto ou ID
      if (code) {
        query = query.eq('short_code', code.toUpperCase());
      } else if (id) {
        query = query.eq('id', id);
      }

      const { data, error } = await query.single();

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

  const fetchCampaignPhotographers = async () => {
    if (!campaign?.id) return;

    try {
      const { data, error } = await supabase
        .from('campaign_photographers')
        .select(`
          photographer_id,
          profiles!campaign_photographers_photographer_id_fkey(full_name, email, avatar_url)
        `)
        .eq('campaign_id', campaign.id)
        .eq('is_active', true);

      if (error) throw error;
      
      const photographers = (data || []).map((cp: any) => ({
        full_name: cp.profiles?.full_name || 'Fotógrafo',
        email: cp.profiles?.email || '',
        avatar_url: cp.profiles?.avatar_url || null
      }));
      
      setCampaignPhotographers(photographers);
    } catch (error) {
      console.error('Error fetching photographers:', error);
    }
  };

  const fetchSubEvents = async () => {
    if (!campaign?.id) {
      console.log('📂 fetchSubEvents: campaign.id não disponível ainda');
      return;
    }

    try {
      console.log('📂 Buscando sub_events para campaign:', campaign.id);
      
      // Primeiro buscar TODOS os álbuns para debug
      const { data: allAlbums, error: allError } = await supabase
        .from('sub_events')
        .select('id, title, description, location, event_time, photo_count, is_active')
        .eq('campaign_id', campaign.id);
      
      console.log('📂 TODOS os álbuns encontrados:', allAlbums);
      
      // Agora buscar apenas os ativos com 5+ fotos
      const { data, error } = await supabase
        .from('sub_events')
        .select('id, title, description, location, event_time, photo_count')
        .eq('campaign_id', campaign.id)
        .eq('is_active', true)
        .gte('photo_count', 5)
        .order('event_time', { ascending: false });

      if (error) {
        console.error('❌ Erro ao buscar sub_events:', error);
        throw error;
      }
      
      console.log(`✅ Encontrados ${data?.length || 0} álbuns ativos com 5+ fotos:`, data);
      setSubEvents(data || []);
    } catch (error) {
      console.error('Error fetching sub-events:', error);
      setSubEvents([]);
    }
  };

  const handleDeleteAlbum = async (albumId: string, albumTitle: string) => {
    try {
      setDeletingAlbum(albumId);

      // Verificar se há fotos no álbum
      const { data: photos, error: photosError } = await supabase
        .from('photos')
        .select('id')
        .eq('sub_event_id', albumId)
        .limit(1);

      if (photosError) {
        console.error('Error checking photos:', photosError);
        throw new Error('Erro ao verificar fotos do álbum');
      }

      if (photos && photos.length > 0) {
        toast({
          title: "⚠️ Álbum contém fotos",
          description: "Remova todas as fotos do álbum antes de excluí-lo.",
          variant: "destructive",
        });
        setDeletingAlbum(null);
        return;
      }

      // Deletar o álbum
      const { error } = await supabase
        .from('sub_events')
        .delete()
        .eq('id', albumId);

      if (error) {
        console.error('Error deleting album:', error);
        throw new Error(error.message || 'Falha ao excluir álbum');
      }

      toast({
        title: "✅ Álbum excluído",
        description: `"${albumTitle}" foi excluído com sucesso.`,
      });

      // Atualizar lista de álbuns
      setSubEvents(subEvents.filter(a => a.id !== albumId));
      
      // Se estava visualizando o álbum excluído, resetar para todas as fotos
      if (selectedSubEvent === albumId) {
        setSelectedSubEvent(null);
      }
    } catch (error: any) {
      console.error('Error deleting album:', error);
      toast({
        title: "Erro ao excluir",
        description: error.message || "Não foi possível excluir o álbum. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setDeletingAlbum(null);
    }
  };

  const fetchPhotos = async (pageNum: number) => {
    if (!campaign?.id) return;

    try {
      setLoadingPhotos(true);
      
      const from = (pageNum - 1) * PHOTOS_PER_PAGE;
      const to = from + PHOTOS_PER_PAGE - 1;

      // Primeiro, contar o total de fotos (com filtro de sub_event se aplicável)
      let countQuery = supabase
        .from('photos')
        .select('id', { count: 'exact', head: true })
        .eq('campaign_id', campaign.id)
        .eq('is_available', true);

      // Filtrar por sub_event se selecionado
      if (selectedSubEvent) {
        countQuery = countQuery.eq('sub_event_id', selectedSubEvent);
      }

      const { count } = await countQuery;
      const total = count || 0;
      setTotalPages(Math.ceil(total / PHOTOS_PER_PAGE));

      // Depois buscar as fotos
      let query = supabase
        .from('photos')
        .select('id, title, original_url, watermarked_url, thumbnail_url, price, is_available, is_featured, sub_event_id')
        .eq('campaign_id', campaign.id)
        .eq('is_available', true)
        .range(from, to)
        .order('upload_sequence', { ascending: true })
        .order('created_at', { ascending: true });

      // Filtrar por sub_event se selecionado
      if (selectedSubEvent) {
        query = query.eq('sub_event_id', selectedSubEvent);
        console.log(`📂 Buscando fotos do álbum ${selectedSubEvent}`);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      console.log(`📸 ${data?.length || 0} fotos carregadas (página ${pageNum})`);
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

  const [addedToCart, setAddedToCart] = useState<string | null>(null);

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

    const photoIndex = photos.findIndex(p => p.id === photo.id);
    const photoName = getPhotoName(photo, photoIndex);
    
    addToCart({
      id: photo.id,
      title: photoName,
      price: photo.price,
      watermarked_url: photo.watermarked_url,
      thumbnail_url: photo.thumbnail_url,
      campaign_id: campaign?.id || '',
      progressive_discount_enabled: campaign?.progressive_discount_enabled ?? true,
    });

    // Feedback visual de sucesso
    setAddedToCart(photo.id);
    haptic.medium();
    
    toast({
      title: "✓ Adicionado ao carrinho!",
      description: `${photoName} foi adicionada ao seu carrinho.`,
    });

    // Limpar feedback após 1.5 segundos
    setTimeout(() => setAddedToCart(null), 1500);
  };

  const handlePaymentSuccess = async (paymentData: any) => {
    // O Edge Function process-transparent-payment já cria as purchases automaticamente
    // Aqui apenas confirmamos o sucesso e fechamos o modal
    
    toast({
      title: "✅ Compra realizada!",
      description: "Sua foto foi comprada com sucesso. Você pode baixá-la em 'Minhas Compras'.",
    });

    setShowPaymentModal(false);
    setSelectedPhoto(null);
    setPurchasing(false);
  };

  const handleToggleFeatured = async (photoId: string, currentValue: boolean) => {
    if (!user || !campaign) return;
    
    // Verificar se o usuário é o fotógrafo ou admin
    const isPhotographer = campaign.photographer_id === user.id || profile?.role === 'admin';
    if (!isPhotographer) {
      toast({
        title: "Sem permissão",
        description: "Apenas o fotógrafo pode marcar fotos como destaque",
        variant: "destructive",
      });
      return;
    }

    // Se está tentando marcar como destaque, verificar limite
    if (!currentValue) {
      // Contar quantas fotos já estão em destaque
      const { count, error: countError } = await supabase
        .from('photos')
        .select('id', { count: 'exact', head: true })
        .eq('photographer_id', user.id)
        .eq('is_featured', true)
        .eq('is_available', true);

      if (countError) {
        console.error('Error counting featured photos:', countError);
        toast({
          title: "Erro",
          description: "Não foi possível verificar o limite de fotos em destaque",
          variant: "destructive",
        });
        return;
      }

      const MAX_FEATURED = 15;
      if ((count || 0) >= MAX_FEATURED) {
        toast({
          title: "Limite atingido",
          description: `Você já tem ${MAX_FEATURED} fotos em destaque. Remova algumas para adicionar novas.`,
          variant: "destructive",
        });
        return;
      }
    }

    try {
      setTogglingFeatured(photoId);
      
      const { error } = await supabase
        .from('photos')
        .update({ is_featured: !currentValue })
        .eq('id', photoId);

      if (error) throw error;

      // Atualizar localmente
      setPhotos(prevPhotos => 
        prevPhotos.map(p => 
          p.id === photoId ? { ...p, is_featured: !currentValue } : p
        )
      );

      toast({
        title: !currentValue ? "Foto marcada como destaque! ⭐" : "Foto removida dos destaques",
        description: !currentValue 
          ? "Esta foto aparecerá na página de destaques" 
          : "Esta foto não aparecerá mais nos destaques",
      });
    } catch (error) {
      console.error('Error toggling featured:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status da foto",
        variant: "destructive",
      });
    } finally {
      setTogglingFeatured(null);
    }
  };

  // Buscar usuários para liberar foto
  const searchUsersForRelease = async (query: string) => {
    if (query.length < 2) {
      setReleaseSearchResults([]);
      return;
    }

    try {
      setSearchingUsers(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .or(`email.ilike.%${query}%,full_name.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;
      setReleaseSearchResults(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
      setReleaseSearchResults([]);
    } finally {
      setSearchingUsers(false);
    }
  };

  // Liberar foto gratuitamente para usuário
  const handleReleasePhoto = async () => {
    if (!releasePhotoId || !selectedUserForRelease || !user || !campaign) return;

    try {
      setReleasingPhoto(true);

      // Verificar se já existe compra desta foto para este usuário
      const { data: existingPurchase, error: checkError } = await supabase
        .from('purchases')
        .select('id')
        .eq('photo_id', releasePhotoId)
        .eq('buyer_id', selectedUserForRelease.id)
        .eq('status', 'completed')
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingPurchase) {
        toast({
          title: "⚠️ Foto já liberada",
          description: `${selectedUserForRelease.full_name || selectedUserForRelease.email} já possui esta foto.`,
          variant: "destructive",
        });
        return;
      }

      // Criar compra gratuita (amount = 0)
      const { error: purchaseError } = await supabase
        .from('purchases')
        .insert({
          photo_id: releasePhotoId,
          buyer_id: selectedUserForRelease.id,
          photographer_id: campaign.photographer_id,
          amount: 0,
          status: 'completed',
          stripe_payment_intent_id: `FREE_RELEASE_${Date.now()}`,
        });

      if (purchaseError) throw purchaseError;

      toast({
        title: "🎁 Foto liberada com sucesso!",
        description: `Foto liberada gratuitamente para ${selectedUserForRelease.full_name || selectedUserForRelease.email}`,
      });

      // Resetar estados
      setShowReleasePhotoDialog(false);
      setReleasePhotoId(null);
      setReleaseSearch('');
      setReleaseSearchResults([]);
      setSelectedUserForRelease(null);

    } catch (error: any) {
      console.error('Error releasing photo:', error);
      toast({
        title: "Erro ao liberar foto",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setReleasingPhoto(false);
    }
  };

  // Abrir modal de liberação
  const openReleasePhotoDialog = (photoId: string) => {
    setReleasePhotoId(photoId);
    setShowReleasePhotoDialog(true);
    setReleaseSearch('');
    setReleaseSearchResults([]);
    setSelectedUserForRelease(null);
  };

  // Verificar se o usuário é o fotógrafo ou admin
  const isPhotographerOrAdmin = campaign && (
    campaign.photographer_id === user?.id || profile?.role === 'admin'
  );

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
            {/* Botão Busca Facial com IA - TEMPORARIAMENTE DESATIVADO
               Motivo: A tabela photo_face_descriptors está vazia (0 registros).
               O sistema precisa pré-processar as fotos no upload antes de funcionar.
               Para reativar: remover este comentário e descomentar o botão abaixo.
            */}
            {/* 
            <Button
              variant="default"
              size="sm"
              onClick={() => setShowFaceRecognition(true)}
              className="gap-1 sm:gap-2 h-9 px-3 sm:px-4 text-xs sm:text-sm bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all relative group"
              title="Encontre suas fotos automaticamente usando reconhecimento facial com inteligência artificial"
            >
              <ScanFace className="h-4 w-4 animate-pulse" />
              <span className="hidden sm:inline font-semibold">Buscar com IA</span>
              <span className="sm:hidden font-semibold">IA</span>
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
              </span>
            </Button>
            */}
            
            <CartDrawer />
            <Camera className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            <span className="font-semibold text-sm sm:text-base">STA Fotos</span>
          </div>
        </div>
      </header>

      {/* Modal de Reconhecimento Facial - TEMPORARIAMENTE DESATIVADO */}
      {/* 
      <FaceRecognitionModal
        open={showFaceRecognition}
        onOpenChange={setShowFaceRecognition}
        campaignId={campaign?.id}
      />
      */}

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
            <div className="absolute bottom-3 sm:bottom-4 left-3 sm:left-4 right-3 sm:right-4 flex items-end justify-between">
              <div className="text-white flex-1">
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
              
              {/* Botão Editar - apenas para fotógrafo dono ou admin */}
              {campaign && (profile?.role === 'admin' || campaign.photographer_id === user?.id) && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowEditEventModal(true)}
                  className="gap-2 bg-white/95 hover:bg-white shadow-lg"
                >
                  <Edit className="h-4 w-4" />
                  <span className="hidden sm:inline">Editar Evento</span>
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="flex items-center gap-2 text-primary text-base sm:text-lg">
                  <Camera className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                  <span className="truncate">
                    {campaignPhotographers.length > 1 ? 'Fotógrafos do Evento' : 'Fotógrafo Responsável'}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {campaignPhotographers.length > 0 ? (
                  <div className="space-y-3">
                    {campaignPhotographers.map((photographer, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <div className="relative flex-shrink-0">
                          {photographer.avatar_url ? (
                            <img 
                              src={photographer.avatar_url} 
                              alt={photographer.full_name}
                              className="h-10 w-10 sm:h-12 sm:w-12 rounded-full object-cover border-2 border-primary/20"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          <div className={`${photographer.avatar_url ? 'hidden' : 'flex'} h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-primary/10 items-center justify-center border-2 border-primary/20`}>
                            <Camera className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm sm:text-base font-bold text-foreground truncate">
                            {photographer.full_name}
                          </p>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">
                            {photographer.email}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : campaign.photographer ? (
                  <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      {campaign.photographer.avatar_url ? (
                        <img 
                          src={campaign.photographer.avatar_url} 
                          alt={campaign.photographer.full_name}
                          className="h-10 w-10 sm:h-12 sm:w-12 rounded-full object-cover border-2 border-primary/20"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`${campaign.photographer.avatar_url ? 'hidden' : 'flex'} h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-primary/10 items-center justify-center border-2 border-primary/20`}>
                        <Camera className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base sm:text-lg font-bold text-foreground truncate">
                        {campaign.photographer.full_name}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">
                        {campaign.photographer.email}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum fotógrafo atribuído</p>
                )}
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
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                <Folder className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                Álbuns do Evento
              </h2>
              <Badge variant="secondary" className="text-xs sm:text-sm">
                {subEvents.length} {subEvents.length === 1 ? 'álbum' : 'álbuns'}
              </Badge>
            </div>
            <p className="text-muted-foreground mb-4 sm:mb-6 text-sm sm:text-base">
              📂 Clique em um álbum para ver apenas as fotos daquela pasta
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
                  className={`cursor-pointer transition-all hover:shadow-lg overflow-hidden relative ${
                    selectedSubEvent === subEvent.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedSubEvent(subEvent.id)}
                >
                  {/* Botão de excluir - apenas para fotógrafo dono */}
                  {user?.id === campaign?.photographer_id && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 z-10 h-8 w-8 opacity-90 hover:opacity-100"
                          onClick={(e) => e.stopPropagation()}
                          disabled={deletingAlbum === subEvent.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir álbum?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir o álbum "{subEvent.title}"?
                            {subEvent.photo_count > 0 && (
                              <span className="block mt-2 text-destructive font-medium">
                                ⚠️ Este álbum contém {subEvent.photo_count} {subEvent.photo_count === 1 ? 'foto' : 'fotos'}. 
                                Remova todas as fotos antes de excluir o álbum.
                              </span>
                            )}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={(e) => e.stopPropagation()}>
                            Cancelar
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAlbum(subEvent.id, subEvent.title);
                            }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={deletingAlbum === subEvent.id || subEvent.photo_count > 0}
                          >
                            {deletingAlbum === subEvent.id ? 'Excluindo...' : 'Excluir'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}

                  {/* Preview da capa ou foto */}
                  {(subEvent.cover_image_url || albumPreviews[subEvent.id]) && (
                    <div className="aspect-[4/5] relative">
                      <img 
                        src={subEvent.cover_image_url || albumPreviews[subEvent.id]} 
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
                    <Card key={photo.id} className="overflow-hidden hover:shadow-lg transition-shadow group">
                      <div className="aspect-square bg-gradient-subtle relative">
                        <WatermarkedPhoto
                          src={photo.thumbnail_url || photo.watermarked_url}
                          alt={getPhotoName(photo, index)}
                          position="full"
                          opacity={0.85}
                           imgClassName="w-full h-full object-cover"
                          loading={index < 8 ? "eager" : "lazy"}
                        />
                        
                        {/* Botão Destaque (apenas para fotógrafos) */}
                        {isPhotographerOrAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 left-2 bg-background/90 backdrop-blur-sm hover:bg-background w-9 h-9 sm:w-10 sm:h-10 active:scale-95 transition-transform z-20 shadow-lg"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleFeatured(photo.id, photo.is_featured || false);
                            }}
                            disabled={togglingFeatured === photo.id}
                          >
                            <Star 
                              className={`h-4 w-4 sm:h-5 sm:w-5 transition-all ${
                                photo.is_featured 
                                  ? 'fill-yellow-500 text-yellow-500 animate-in zoom-in-50 duration-200' 
                                  : 'text-foreground'
                              }`}
                            />
                          </Button>
                        )}

                        {/* Botão Liberar Foto Gratuitamente (apenas para fotógrafos/admin) */}
                        {isPhotographerOrAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-12 left-2 bg-green-600 hover:bg-green-700 text-white w-9 h-9 sm:w-10 sm:h-10 active:scale-95 transition-transform z-20 shadow-lg"
                            onClick={(e) => {
                              e.stopPropagation();
                              openReleasePhotoDialog(photo.id);
                            }}
                            title="Liberar foto gratuitamente"
                          >
                            <Gift className="h-4 w-4 sm:h-5 sm:w-5" />
                          </Button>
                        )}
                        
                        {/* Botão Favorito */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm hover:bg-background w-9 h-9 sm:w-10 sm:h-10 active:scale-95 transition-transform z-20 shadow-lg"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!user) {
                              toast({
                                title: "Login necessário",
                                description: "Faça login para favoritar fotos",
                                variant: "destructive",
                              });
                              navigate('/auth');
                              return;
                            }
                            toggleFavorite(photo.id);
                          }}
                        >
                          <Heart 
                            className={`h-4 w-4 sm:h-5 sm:w-5 transition-all ${
                              isFavorited(photo.id) 
                                ? 'fill-destructive text-destructive animate-in zoom-in-50 duration-200' 
                                : 'text-foreground'
                            }`}
                          />
                        </Button>

                        {/* Botão Ver Foto Maior - Sempre visível no mobile, hover no desktop */}
                        <Button 
                          size="sm" 
                          variant="secondary" 
                          className="absolute bottom-2 left-1/2 -translate-x-1/2 gap-1 h-8 sm:h-9 text-xs sm:text-sm z-20 shadow-lg sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                          onClick={() => setViewingPhotoIndex(index)}
                        >
                          <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                          Ver
                        </Button>
                        
                        
                        {/* Overlay de hover sutil */}
                        <div className="absolute inset-0 bg-black/0 sm:group-hover:bg-black/10 transition-colors pointer-events-none" />
                      </div>
                      <CardContent className="p-2 sm:p-3">
                        <div className="space-y-1 sm:space-y-2">
                          {/* Nome da foto */}
                          <p className="text-xs sm:text-sm font-medium text-foreground truncate">
                            {getPhotoName(photo, index)}
                          </p>
                          <div className="flex justify-between items-center gap-2">
                            <span className="text-base sm:text-lg font-bold text-green-600 flex-shrink-0">
                              {formatCurrency(photo.price)}
                            </span>
                            <div className="flex gap-1 sm:gap-2">
                            <Button 
                              size="sm" 
                              variant={addedToCart === photo.id ? "default" : "outline"}
                              onClick={() => handleAddToCart(photo)}
                              className={`gap-1 h-8 sm:h-9 w-8 sm:w-auto px-2 sm:px-3 transition-all ${
                                addedToCart === photo.id ? 'bg-green-600 hover:bg-green-700 scale-110' : ''
                              }`}
                              disabled={addedToCart === photo.id}
                            >
                              {addedToCart === photo.id ? (
                                <svg className="h-3 w-3 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4" />
                              )}
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

        {/* Modal de Visualização de Foto com Navegação e Swipe */}
        <Dialog open={viewingPhotoIndex !== null} onOpenChange={(open) => !open && setViewingPhotoIndex(null)}>
          <DialogContent className="max-w-[98vw] sm:max-w-5xl w-[98vw] p-0 gap-0 bg-black/95 border-0">
            {/* Header */}
            <div className="flex items-center justify-between p-3 sm:p-4 bg-black/50 text-white">
              <DialogTitle className="text-sm sm:text-base truncate flex-1 text-white">
                {viewingPhotoIndex !== null && photos[viewingPhotoIndex] 
                  ? getPhotoName(photos[viewingPhotoIndex], viewingPhotoIndex)
                  : 'Foto'
                } ({viewingPhotoIndex !== null ? viewingPhotoIndex + 1 : 0}/{photos.length})
              </DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 h-9 w-9"
                onClick={() => setViewingPhotoIndex(null)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            {/* Área da foto com swipe */}
            <div 
              {...swipeHandlers}
              className="relative flex items-center justify-center min-h-[50vh] sm:min-h-[60vh] touch-pan-y"
            >
              {/* Botão Anterior */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 z-30 h-12 w-12 sm:h-14 sm:w-14 bg-black/50 hover:bg-black/70 text-white shadow-lg rounded-full"
                onClick={handlePrevPhoto}
                disabled={viewingPhotoIndex === 0}
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>

              {/* Imagem */}
              {viewingPhotoIndex !== null && photos[viewingPhotoIndex] && (
                <AntiScreenshotProtection>
                  <div className="px-14 sm:px-20 py-4">
                    <WatermarkedPhoto
                      src={photos[viewingPhotoIndex].watermarked_url}
                      alt={getPhotoName(photos[viewingPhotoIndex], viewingPhotoIndex)}
                      position="full"
                      opacity={0.85}
                      imgClassName="w-full max-h-[55vh] sm:max-h-[70vh] object-contain rounded-lg"
                      loading="eager"
                    />
                  </div>
                </AntiScreenshotProtection>
              )}

              {/* Botão Próximo */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 z-30 h-12 w-12 sm:h-14 sm:w-14 bg-black/50 hover:bg-black/70 text-white shadow-lg rounded-full"
                onClick={handleNextPhoto}
                disabled={viewingPhotoIndex === photos.length - 1}
              >
                <ChevronRight className="h-8 w-8" />
              </Button>
              
              {/* Indicador de swipe no mobile */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 sm:hidden text-white/60 text-xs flex items-center gap-1">
                <ChevronLeft className="h-3 w-3" />
                Deslize para navegar
                <ChevronRight className="h-3 w-3" />
              </div>
            </div>

            {/* Footer com ações */}
            <div className="p-3 sm:p-4 bg-black/50 flex items-center justify-between gap-3">
              {viewingPhotoIndex !== null && photos[viewingPhotoIndex] && (
                <>
                  <span className="text-lg sm:text-xl font-bold text-white">
                    {formatCurrency(photos[viewingPhotoIndex].price)}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-10 sm:h-11 px-3 sm:px-4 gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20"
                      onClick={() => {
                        haptic.medium();
                        handleAddToCart(photos[viewingPhotoIndex!]);
                      }}
                    >
                      <ShoppingCart className="h-4 w-4" />
                      <span className="hidden sm:inline">Carrinho</span>
                    </Button>
                    <Button
                      size="sm"
                      className="h-10 sm:h-11 px-4 sm:px-6 gap-2"
                      onClick={() => {
                        haptic.medium();
                        handleBuyPhoto(photos[viewingPhotoIndex!]);
                        setViewingPhotoIndex(null);
                      }}
                    >
                      Comprar
                    </Button>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

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
              title: getPhotoName(selectedPhoto, photos.findIndex(p => p.id === selectedPhoto.id)),
              price: selectedPhoto.price,
              image_url: selectedPhoto.thumbnail_url || selectedPhoto.watermarked_url
            }}
            onPaymentSuccess={handlePaymentSuccess}
          />
        )}

        {/* Edit Event Modal */}
        {showEditEventModal && campaign && (
          <EditEventModal
            campaignId={campaign.id}
            campaignData={{
              title: campaign.title,
              description: campaign.description || undefined,
              location: campaign.location || undefined,
              event_date: campaign.event_date || undefined,
              is_active: campaign.is_active,
              cover_image_url: campaign.cover_image_url || undefined
            }}
            open={showEditEventModal}
            onClose={() => setShowEditEventModal(false)}
            onEventUpdated={() => {
              fetchCampaign();
              setShowEditEventModal(false);
            }}
          />
        )}

        {/* Modal de Liberar Foto Gratuitamente */}
        <Dialog open={showReleasePhotoDialog} onOpenChange={setShowReleasePhotoDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-green-600" />
                Liberar Foto Gratuitamente
              </DialogTitle>
              <DialogDescription>
                Busque um usuário pelo email ou nome para liberar esta foto sem custo.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Campo de busca */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por email ou nome..."
                  value={releaseSearch}
                  onChange={(e) => {
                    setReleaseSearch(e.target.value);
                    searchUsersForRelease(e.target.value);
                  }}
                  className="pl-9"
                />
                {searchingUsers && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>

              {/* Resultados da busca */}
              {releaseSearchResults.length > 0 && !selectedUserForRelease && (
                <div className="max-h-48 overflow-y-auto border rounded-md divide-y">
                  {releaseSearchResults.map((searchUser) => (
                    <button
                      key={searchUser.id}
                      className="w-full px-3 py-2 text-left hover:bg-muted transition-colors flex items-center gap-3"
                      onClick={() => {
                        setSelectedUserForRelease(searchUser);
                        setReleaseSearch('');
                        setReleaseSearchResults([]);
                      }}
                    >
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{searchUser.full_name || 'Sem nome'}</p>
                        <p className="text-xs text-muted-foreground truncate">{searchUser.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Mensagem quando não encontra resultados */}
              {releaseSearch.length >= 2 && releaseSearchResults.length === 0 && !searchingUsers && !selectedUserForRelease && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum usuário encontrado
                </p>
              )}

              {/* Usuário selecionado */}
              {selectedUserForRelease && (
                <div className="p-4 border rounded-md bg-green-50 dark:bg-green-950/30">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-green-600 flex items-center justify-center">
                      <User className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{selectedUserForRelease.full_name || 'Sem nome'}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {selectedUserForRelease.email}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedUserForRelease(null)}
                    >
                      Alterar
                    </Button>
                  </div>
                </div>
              )}

              {/* Botão de confirmação */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowReleasePhotoDialog(false);
                    setReleasePhotoId(null);
                    setSelectedUserForRelease(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={handleReleasePhoto}
                  disabled={!selectedUserForRelease || releasingPhoto}
                >
                  {releasingPhoto ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Liberando...
                    </>
                  ) : (
                    <>
                      <Gift className="h-4 w-4 mr-2" />
                      Liberar Foto
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Campaign;
