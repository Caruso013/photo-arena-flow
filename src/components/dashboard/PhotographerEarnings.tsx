import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatCurrency } from '@/lib/utils';
import { Camera, Calendar, TrendingUp, AlertCircle, User, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface BuyerPurchase {
  buyer_id: string;
  buyer_name: string;
  buyer_email: string;
  photos_count: number;
  total_amount: number;
  purchase_date: string;
}

interface CampaignEarnings {
  campaign_id: string;
  campaign_title: string;
  total_photos_sold: number;
  total_earned: number;
  buyers: BuyerPurchase[];
}

export const PhotographerEarnings = () => {
  const { user } = useAuth();
  const [earnings, setEarnings] = useState<CampaignEarnings[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalEarned, setTotalEarned] = useState(0);
  const [totalPhotosSold, setTotalPhotosSold] = useState(0);

  useEffect(() => {
    if (user) {
      fetchEarnings();
    }
  }, [user]);

  const fetchEarnings = async () => {
    try {
      setLoading(true);

      // Buscar revenue_shares com informações de foto, campanha e comprador
      const { data: revenueData, error } = await supabase
        .from('revenue_shares')
        .select(`
          *,
          purchases!revenue_shares_purchase_id_fkey(
            created_at,
            buyer_id,
            photos!purchases_photo_id_fkey(
              id,
              title,
              price,
              campaigns!photos_campaign_id_fkey(
                id,
                title
              )
            )
          )
        `)
        .eq('photographer_id', user?.id);

      if (error) {
        console.error('Erro ao buscar ganhos:', error);
        throw error;
      }

      // Buscar nomes dos compradores
      const buyerIds = [...new Set(revenueData?.map((r: any) => r.purchases?.buyer_id).filter(Boolean))];
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', buyerIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Processar dados por campanha e comprador
      const campaignMap = new Map<string, CampaignEarnings>();
      let totalSum = 0;
      let photoCount = 0;

      // Agrupar por campanha e comprador
      const campaignBuyerMap = new Map<string, Map<string, BuyerPurchase>>();

      revenueData?.forEach((revenue: any) => {
        photoCount++;
        const purchase = revenue.purchases;
        const photo = purchase?.photos;
        const campaign = photo?.campaigns;
        
        if (!campaign) return;

        const photographerAmount = Number(revenue.photographer_amount || 0);
        totalSum += photographerAmount;

        const buyerId = purchase.buyer_id;
        const buyerProfile = profileMap.get(buyerId);
        const buyerName = buyerProfile?.full_name || 'Cliente';
        const buyerEmail = buyerProfile?.email || '';

        // Inicializar mapa da campanha se não existir
        if (!campaignBuyerMap.has(campaign.id)) {
          campaignBuyerMap.set(campaign.id, new Map());
        }

        const buyersMap = campaignBuyerMap.get(campaign.id)!;

        // Agrupar por comprador dentro da campanha
        if (!buyersMap.has(buyerId)) {
          buyersMap.set(buyerId, {
            buyer_id: buyerId,
            buyer_name: buyerName,
            buyer_email: buyerEmail,
            photos_count: 0,
            total_amount: 0,
            purchase_date: purchase.created_at,
          });
        }

        const buyerData = buyersMap.get(buyerId)!;
        buyerData.photos_count += 1;
        buyerData.total_amount += photographerAmount;

        // Atualizar data se for mais recente
        if (new Date(purchase.created_at) > new Date(buyerData.purchase_date)) {
          buyerData.purchase_date = purchase.created_at;
        }

        // Atualizar mapa da campanha
        if (!campaignMap.has(campaign.id)) {
          campaignMap.set(campaign.id, {
            campaign_id: campaign.id,
            campaign_title: campaign.title,
            total_photos_sold: 0,
            total_earned: 0,
            buyers: [],
          });
        }

        const campaignEarnings = campaignMap.get(campaign.id)!;
        campaignEarnings.total_photos_sold += 1;
        campaignEarnings.total_earned += photographerAmount;
      });

      // Converter buyers map para array em cada campanha
      campaignMap.forEach((campaign, campaignId) => {
        const buyersMap = campaignBuyerMap.get(campaignId);
        if (buyersMap) {
          campaign.buyers = Array.from(buyersMap.values()).sort(
            (a, b) => new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime()
          );
        }
      });

      setEarnings(Array.from(campaignMap.values()).sort((a, b) => b.total_earned - a.total_earned));
      setTotalEarned(totalSum);
      setTotalPhotosSold(photoCount);
    } catch (error) {
      console.error('Erro ao buscar ganhos:', error);
      toast.error('Erro ao carregar ganhos');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 bg-muted rounded w-1/3 animate-pulse"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded animate-pulse"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alerta Informativo */}
      <Alert className="border-2 border-primary/30 bg-primary/5">
        <AlertCircle className="h-5 w-5 text-primary" />
        <AlertTitle className="text-base font-semibold">📊 Métricas por Álbum</AlertTitle>
        <AlertDescription className="text-sm">
          Acompanhe suas vendas organizadas por evento/álbum. Veja quem comprou e quantas fotos cada cliente adquiriu.
        </AlertDescription>
      </Alert>

      {/* Cards de Resumo - Apenas métricas gerais */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-2 border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Total Vendido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(totalEarned)}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Sua receita total de todas as vendas
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-blue-600" />
              Fotos Vendidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {totalPhotosSold}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Total de fotos vendidas em todos os eventos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Ganhos por Campanha/Álbum */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Vendas por Evento/Álbum
          </CardTitle>
          <CardDescription>
            Detalhamento de vendas por evento com informações dos compradores
          </CardDescription>
        </CardHeader>
        <CardContent>
          {earnings.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhuma venda registrada ainda
            </p>
          ) : (
            <div className="space-y-4">
              {earnings.map((campaign) => (
                <div key={campaign.campaign_id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{campaign.campaign_title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {campaign.total_photos_sold} foto(s) vendida(s) • {campaign.buyers.length} comprador(es)
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-primary">
                        {formatCurrency(campaign.total_earned)}
                      </div>
                      <p className="text-xs text-muted-foreground">Sua receita</p>
                    </div>
                  </div>

                  {/* Detalhes por Comprador */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full">
                        Ver Detalhes das Vendas
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>{campaign.campaign_title}</DialogTitle>
                        <DialogDescription>
                          {campaign.total_photos_sold} fotos vendidas • {campaign.buyers.length} compradores
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-3 mt-4">
                        {campaign.buyers.map((buyer) => (
                          <div
                            key={buyer.buyer_id}
                            className="border rounded-lg p-4 space-y-2 bg-muted/30"
                          >
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-primary" />
                                  <span className="font-medium">{buyer.buyer_name}</span>
                                </div>
                                {buyer.buyer_email && (
                                  <div className="text-xs text-muted-foreground">
                                    {buyer.buyer_email}
                                  </div>
                                )}
                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(buyer.purchase_date).toLocaleString('pt-BR')}
                                </div>
                              </div>
                              <div className="text-right space-y-1">
                                <div className="font-semibold text-green-600">
                                  {formatCurrency(buyer.total_amount)}
                                </div>
                                <Badge variant="secondary" className="gap-1">
                                  <ImageIcon className="h-3 w-3" />
                                  {buyer.photos_count} foto{buyer.photos_count > 1 ? 's' : ''}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
