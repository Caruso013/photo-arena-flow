import React, { useMemo, useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Camera, ShoppingCart, Download, FileImage, ArrowRight, CalendarDays, Heart, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PhotographerApplicationForm } from './PhotographerApplicationForm';
import { formatEventDate } from "@/lib/dateUtils";

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
  signedUrl?: string;
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

  const uniqueEventsCount = useMemo(
    () => new Set(purchasedPhotos.map((purchase) => purchase.photo.campaign?.title).filter(Boolean)).size,
    [purchasedPhotos],
  );

  const latestPurchaseLabel = useMemo(() => {
    if (purchasedPhotos.length === 0) return '-';
    return new Date(purchasedPhotos[0].created_at).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
    });
  }, [purchasedPhotos]);

  useEffect(() => {
    fetchCampaigns();
    if (user) {
      fetchPurchasedPhotos();
    }
  }, [user]);

  // Função para gerar URL assinada para imagens privadas
  const getSignedUrl = async (url: string): Promise<string> => {
    if (!url) return '';
    
    try {
      const marker = '/storage/v1/object/';
      const idx = url.indexOf(marker);
      if (idx === -1) return url;
      
      let rest = url.slice(idx + marker.length);
      if (rest.startsWith('public/')) return url; // já é pública
      
      const firstSlash = rest.indexOf('/');
      if (firstSlash === -1) return url;
      
      const bucket = rest.slice(0, firstSlash);
      const path = rest.slice(firstSlash + 1);
      
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 3600);
      
      if (error) {
        console.error('Erro ao gerar URL assinada:', error);
        return url;
      }
      
      return data?.signedUrl || url;
    } catch {
      return url;
    }
  };

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
        .order('created_at', { ascending: false })
        .limit(8);

      if (error) throw error;
      
      // Gerar URLs assinadas para fotos originais (bucket privado)
      const photosWithSignedUrls = await Promise.all(
        (data || []).map(async (purchase) => {
          const signedUrl = await getSignedUrl(
            purchase.photo?.thumbnail_url || purchase.photo?.original_url || ''
          );
          return { ...purchase, signedUrl };
        })
      );
      
      setPurchasedPhotos(photosWithSignedUrls);
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
    <div className="space-y-6 pb-28 md:pb-0">
      <div className="rounded-3xl border border-emerald-200/60 bg-gradient-to-r from-emerald-50 via-white to-sky-50 p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
              <Sparkles className="h-3.5 w-3.5" />
              Dashboard do cliente
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Olá, {profile?.full_name || 'cliente'}
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground sm:text-base">
                Encontre novos eventos, acompanhe suas últimas compras e volte rápido para o que importa.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:flex lg:flex-row">
            <Button asChild variant="outline" className="w-full gap-2 rounded-xl border-emerald-200 bg-white/80">
              <Link to="/events">
                <CalendarDays className="h-4 w-4" />
                Ver eventos
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full gap-2 rounded-xl border-emerald-200 bg-white/80">
              <Link to="/dashboard/favorites">
                <Heart className="h-4 w-4" />
                Favoritos
              </Link>
            </Button>
            <Button asChild className="w-full gap-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700">
              <Link to="/dashboard/purchases">
                <ShoppingCart className="h-4 w-4" />
                Minhas compras
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-emerald-200/70 bg-gradient-to-br from-emerald-50 to-white shadow-sm">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <FileImage className="h-4 w-4 text-emerald-600" />
              Fotos compradas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700 sm:text-3xl">{purchasedPhotos.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">Prévia das últimas compras</p>
          </CardContent>
        </Card>

        <Card className="border-sky-200/70 bg-gradient-to-br from-sky-50 to-white shadow-sm">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Camera className="h-4 w-4 text-sky-600" />
              Eventos comprados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-sky-700 sm:text-3xl">{uniqueEventsCount}</div>
            <p className="mt-1 text-xs text-muted-foreground">Eventos diferentes no seu histórico recente</p>
          </CardContent>
        </Card>

        <Card className="border-amber-200/70 bg-gradient-to-br from-amber-50 to-white shadow-sm">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <CalendarDays className="h-4 w-4 text-amber-600" />
              Eventos em destaque
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700 sm:text-3xl">{campaigns.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">Sugestões rápidas para continuar navegando</p>
          </CardContent>
        </Card>

        <Card className="border-violet-200/70 bg-gradient-to-br from-violet-50 to-white shadow-sm">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <ShoppingCart className="h-4 w-4 text-violet-600" />
              Última compra
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-violet-700 sm:text-3xl">{latestPurchaseLabel}</div>
            <p className="mt-1 text-xs text-muted-foreground">Data da compra mais recente</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground sm:left-4 sm:h-5 sm:w-5" />
            <Input
              placeholder="Buscar eventos por nome ou cidade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-11 pl-10 text-sm sm:h-12 sm:pl-12 sm:text-base"
            />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="events" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 rounded-2xl border bg-card p-1">
          <TabsTrigger value="events" className="gap-2 rounded-xl data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <Camera className="h-4 w-4" />
            Eventos
          </TabsTrigger>
          <TabsTrigger value="purchases" className="gap-2 rounded-xl data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <ShoppingCart className="h-4 w-4" />
            Compras
          </TabsTrigger>
          <TabsTrigger value="photographer" className="gap-2 rounded-xl data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <Sparkles className="h-4 w-4" />
            Fotógrafo
          </TabsTrigger>
        </TabsList>

          <TabsContent value="events" className="space-y-6 animate-fade-in">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold sm:text-2xl md:text-3xl">Eventos em destaque</h2>
                <p className="text-sm text-muted-foreground sm:text-base">Uma seleção rápida para continuar navegando sem sair do dashboard.</p>
              </div>
              {searchTerm && (
                <Badge variant="secondary" className="text-xs sm:text-sm">
                  {filteredCampaigns.length} resultado(s)
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredCampaigns.map((campaign) => (
                <Card key={campaign.id} className="group overflow-hidden rounded-2xl border shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                  <div className="relative aspect-[4/5] bg-gradient-subtle">
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
                  <CardContent className="p-4">
                    <CardTitle className="mb-2 line-clamp-2 text-base sm:text-lg">{campaign.title}</CardTitle>
                    <CardDescription className="mb-3 line-clamp-2 text-xs sm:text-sm">
                      {campaign.description}
                    </CardDescription>
                    <div className="mb-4 flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:text-sm">
                      <span className="truncate max-w-full">{campaign.location}</span>
                      <span className="flex-shrink-0">{formatEventDate(campaign.event_date, { day: '2-digit', month: '2-digit' })}</span>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <span className="truncate text-xs sm:text-sm">Por: {campaign.photographer?.full_name}</span>
                      <Link to={campaign.short_code ? `/E/${campaign.short_code}` : `/campaign/${campaign.id}`} className="w-full sm:w-auto">
                        <Button size="sm" className="h-9 w-full gap-1 rounded-xl sm:w-auto">
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
              <Card className="rounded-2xl border-dashed p-6 text-center sm:p-12">
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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold sm:text-2xl">Últimas compras</h2>
                <p className="text-sm text-muted-foreground sm:text-base">
                  Mostrando uma prévia das suas {purchasedPhotos.length} compra(s) mais recentes.
                </p>
              </div>
              <Button asChild variant="outline" className="w-full rounded-xl sm:w-auto">
                <Link to="/dashboard/purchases">
                  Ver histórico completo
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            {purchasedPhotos.length === 0 ? (
              <Card className="rounded-2xl border-dashed">
                <CardContent className="py-8 sm:py-12 text-center">
                  <ShoppingCart className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg sm:text-xl font-medium mb-2">Nenhuma compra realizada</h3>
                  <p className="text-sm sm:text-base text-muted-foreground">
                    Explore os eventos e adquira suas fotos
                  </p>
                </CardContent>
              </Card>
            ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-4 sm:gap-4">
                {purchasedPhotos.map((purchase) => (
                  <Card key={purchase.id} className="group overflow-hidden rounded-2xl border border-emerald-200/70 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
                    <div className="relative">
                      <div className="aspect-square relative bg-muted overflow-hidden">
                        {/* ✅ FOTO COMPRADA: mostra com URL assinada (bucket privado) */}
                        <img
                          src={purchase.signedUrl || purchase.photo.thumbnail_url || purchase.photo.watermarked_url}
                          alt="Foto comprada - sem marca d'água"
                          className="w-full h-full object-contain group-hover:scale-100 transition-transform"
                          loading="lazy"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            // Fallback para thumbnail público se a URL assinada falhar
                            if (purchase.photo.watermarked_url && target.src !== purchase.photo.watermarked_url) {
                              target.src = purchase.photo.watermarked_url;
                            }
                          }}
                        />
                        <Badge className="absolute left-1 top-1 bg-emerald-600 text-xs px-1.5 py-0.5 sm:left-2 sm:top-2 sm:px-2 sm:py-1">
                          <span className="hidden sm:inline">Comprada</span>
                          <span className="sm:hidden">✓</span>
                        </Badge>
                      </div>
                    </div>
                    <CardContent className="p-3 sm:p-4">
                      <p className="text-xs sm:text-sm font-medium mb-1 line-clamp-1" title={purchase.photo.title || `Foto ${purchase.photo.id.slice(0, 8)}`}>
                        {purchase.photo.title || `Foto ${purchase.photo.id.slice(0, 8)}`}
                      </p>
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-1" title={purchase.photo.campaign?.title}>
                        {purchase.photo.campaign?.title}
                      </p>
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <span className="text-xs sm:text-sm font-bold text-emerald-700 truncate">
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
            <Card className="shadow-sm">
              <CardHeader className="border-b bg-gradient-to-r from-violet-50 to-transparent p-4 sm:p-6">
                <CardTitle className="text-xl sm:text-2xl">Quero fotografar pela plataforma</CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  Envie seu cadastro para começar a participar dos eventos como fotógrafo parceiro.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <PhotographerApplicationForm />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  );
};

export default UserDashboard;