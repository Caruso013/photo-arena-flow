import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Camera,
  Search,
  MapPin,
  Calendar,
  Image as ImageIcon,
  Settings,
  Link2,
  ChevronLeft,
  ChevronRight,
  QrCode,
  DollarSign,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { copyShareLink, generateShareLink } from '@/lib/shareUtils';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { QRCodeSVG } from 'qrcode.react';
import { getTransformedImageUrl } from '@/lib/supabaseImageTransform';
import { useIsMobile } from '@/hooks/use-mobile';

interface Campaign {
  id: string;
  title: string;
  short_code?: string;
  event_date?: string;
  location?: string;
  cover_image_url?: string;
  is_active: boolean;
  photographer_id?: string | null;
  photo_count: number;
  revenue_total: number;
}

const PhotographerEventsTab = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const pageSize = isMobile ? 4 : 6;

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [qrTarget, setQrTarget] = useState<Campaign | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user?.id) {
      fetchCampaigns();
    }
  }, [user?.id]);

  useEffect(() => {
    if (!qrTarget || !qrRef.current) return;

    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = document.createElement('img');

    img.onload = () => {
      canvas.width = 512;
      canvas.height = 512;

      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }

      const link = document.createElement('a');
      link.download = `qrcode-evento-${qrTarget.title.replace(/\s+/g, '-').toLowerCase()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      setQrTarget(null);
    };

    img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`;
  }, [qrTarget]);

  const fetchCampaigns = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { data: owned } = await supabase
        .from('campaigns')
        .select('id, title, short_code, event_date, location, cover_image_url, is_active, photographer_id, photos(count)')
        .eq('photographer_id', user.id)
        .order('event_date', { ascending: false, nullsFirst: false });

      const { data: assigned } = await supabase
        .from('campaign_photographers')
        .select('campaign_id')
        .eq('photographer_id', user.id)
        .eq('is_active', true);

      const ownedIds = new Set((owned || []).map((c: any) => c.id));
      const assignedIds = (assigned || []).map((a: any) => a.campaign_id).filter((id: string) => !ownedIds.has(id));

      let assignedCampaigns: any[] = [];
      if (assignedIds.length > 0) {
        const { data } = await supabase
          .from('campaigns')
          .select('id, title, short_code, event_date, location, cover_image_url, is_active, photographer_id, photos(count)')
          .in('id', assignedIds)
          .order('event_date', { ascending: false, nullsFirst: false });
        assignedCampaigns = data || [];
      }

      const campaignsBase = [...(owned || []), ...assignedCampaigns]
        .sort((a: any, b: any) => new Date(b.event_date || '1970-01-01').getTime() - new Date(a.event_date || '1970-01-01').getTime())
        .map((c: any) => ({
          ...c,
          photo_count: c.photos?.[0]?.count || 0,
          revenue_total: 0,
        }));

      const revenueMap: Record<string, number> = {};

      if (!isMobile) {
        const { data: completedPurchases } = await supabase
          .from('purchases')
          .select('amount, photos!inner(campaign_id)')
          .eq('photographer_id', user.id)
          .eq('status', 'completed');

        (completedPurchases || []).forEach((purchase: any) => {
          const campaignId = purchase.photos?.campaign_id;
          if (!campaignId) return;
          revenueMap[campaignId] = (revenueMap[campaignId] || 0) + Number(purchase.amount || 0);
        });
      }

      const campaignsWithRevenue = campaignsBase.map((campaign: any) => ({
        ...campaign,
        revenue_total: revenueMap[campaign.id] || 0,
      }));

      setCampaigns(campaignsWithRevenue);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return campaigns;
    const term = search.toLowerCase();
    return campaigns.filter((c) => c.title.toLowerCase().includes(term) || c.location?.toLowerCase().includes(term));
  }, [campaigns, search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const formatDate = (date?: string) => {
    if (!date) return 'Sem data';
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const isEventPast = (date?: string) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="grid gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou local..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filtered.length} evento{filtered.length !== 1 ? 's' : ''}
          {search && ` para "${search}"`}
        </p>
      </div>

      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Camera className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground font-medium">{search ? 'Nenhum evento encontrado' : 'Nenhum evento ainda'}</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              {search ? 'Tente outra busca' : 'Crie seu primeiro evento para começar'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {paginated.map((campaign) => {
            const past = isEventPast(campaign.event_date);
            return (
              <Card
                key={campaign.id}
                className="overflow-hidden hover:shadow-md hover:border-primary/20 transition-all duration-200 group cursor-pointer"
                onClick={() => navigate(`/dashboard/photographer/album-reports?campaign=${campaign.id}`)}
              >
                <CardContent className="p-0">
                  <div className="flex items-stretch">
                      <div className="w-20 sm:w-28 flex-shrink-0 relative overflow-hidden bg-muted">
                      {campaign.cover_image_url ? (
                        <img
                          src={getTransformedImageUrl(campaign.cover_image_url, 'thumbnail')}
                          alt={campaign.title}
                          className="h-full w-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                          <Camera className="h-6 w-6 text-muted-foreground/50" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 p-3 sm:p-4 flex flex-col justify-between min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-sm sm:text-base text-foreground truncate">{campaign.title}</h4>
                            {past ? (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                                Encerrado
                              </Badge>
                            ) : (
                              <Badge className="text-[10px] px-1.5 py-0 h-5 bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                                Ativo
                              </Badge>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(campaign.event_date)}
                            </span>
                            {campaign.location && (
                              <span className="flex items-center gap-1 truncate">
                                <MapPin className="h-3 w-3" />
                                {campaign.location}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <ImageIcon className="h-3 w-3" />
                              {campaign.photo_count}
                            </span>
                            {!isMobile && (
                              <span className="flex items-center gap-1 font-medium text-foreground">
                                <DollarSign className="h-3 w-3" />
                                Vendido {formatCurrency(campaign.revenue_total || 0)}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1 flex-shrink-0 justify-end md:flex-nowrap">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Copiar link"
                            onClick={async (e) => {
                              e.stopPropagation();
                              const copied = await copyShareLink(campaign);
                              toast({
                                title: copied ? '🔗 Link copiado!' : 'Erro ao copiar link',
                                variant: copied ? 'default' : 'destructive',
                              });
                            }}
                          >
                            <Link2 className="h-3.5 w-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Baixar QR Code"
                            onClick={(e) => {
                              e.stopPropagation();
                              setQrTarget(campaign);
                            }}
                          >
                            <QrCode className="h-3.5 w-3.5" />
                          </Button>

                          <Button asChild size="sm" className="h-8 gap-1 text-xs">
                            <Link to={`/dashboard/photographer/album-reports?campaign=${campaign.id}`} onClick={(e) => e.stopPropagation()}>
                              <Settings className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Relatório</span>
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
              .map((p, idx, arr) => (
                <React.Fragment key={p}>
                  {idx > 0 && arr[idx - 1] !== p - 1 && <span className="text-xs text-muted-foreground px-1">...</span>}
                  <Button
                    variant={p === currentPage ? 'default' : 'outline'}
                    size="icon"
                    className="h-8 w-8 text-xs"
                    onClick={() => setCurrentPage(p)}
                  >
                    {p}
                  </Button>
                </React.Fragment>
              ))}
          </div>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {qrTarget && (
        <div className="absolute -left-[9999px] top-0">
          <div ref={qrRef} className="bg-white p-4">
            <QRCodeSVG value={generateShareLink(qrTarget)} size={256} includeMargin bgColor="#ffffff" fgColor="#000000" />
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotographerEventsTab;
