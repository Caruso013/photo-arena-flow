import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatCurrency } from '@/lib/utils';
import { DollarSign, Camera, Calendar, Lock, Unlock, TrendingUp, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface PhotoEarning {
  photo_id: string;
  photo_title: string;
  campaign_title: string;
  campaign_id: string;
  sale_date: string;
  photo_price: number;
  photographer_amount: number;
  can_withdraw: boolean;
  hours_until_withdraw: number;
}

interface CampaignEarnings {
  campaign_id: string;
  campaign_title: string;
  total_photos_sold: number;
  total_earned: number;
  photos: PhotoEarning[];
}

export const PhotographerEarnings = () => {
  const { user } = useAuth();
  const [earnings, setEarnings] = useState<CampaignEarnings[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalAvailable, setTotalAvailable] = useState(0);
  const [totalPending, setTotalPending] = useState(0);
  const [totalPhotosSold, setTotalPhotosSold] = useState(0);
  const [requestingPayout, setRequestingPayout] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<any>(null);

  useEffect(() => {
    if (user) {
      fetchEarnings();
      checkPendingRequest();
    }
  }, [user]);

  const checkPendingRequest = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('payout_requests')
        .select('*')
        .eq('photographer_id', user.id)
        .in('status', ['pending', 'approved'])
        .maybeSingle();
      
      if (error) throw error;
      setPendingRequest(data);
    } catch (error) {
      console.error('Erro ao verificar solicitação pendente:', error);
    }
  };

  const fetchEarnings = async () => {
    try {
      setLoading(true);

      // Buscar revenue_shares com informações de foto e campanha
      const { data: revenueData, error } = await supabase
        .from('revenue_shares')
        .select(`
          *,
          purchases!revenue_shares_purchase_id_fkey(
            created_at,
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

      // Processar dados por campanha
      const campaignMap = new Map<string, CampaignEarnings>();
      let availableSum = 0;
      let pendingSum = 0;
      let photoCount = 0;

      revenueData?.forEach((revenue) => {
        photoCount++;
        const purchase = (revenue as any).purchases;
        const photo = purchase?.photos;
        const campaign = photo?.campaigns;
        
        if (!campaign) return;

        const saleDate = new Date(purchase.created_at);
        const hoursSinceSale = (Date.now() - saleDate.getTime()) / (1000 * 60 * 60);
        const canWithdraw = hoursSinceSale >= 12;
        const hoursUntilWithdraw = canWithdraw ? 0 : Math.ceil(12 - hoursSinceSale);

        const photographerAmount = Number(revenue.photographer_amount || 0);

        if (canWithdraw) {
          availableSum += photographerAmount;
        } else {
          pendingSum += photographerAmount;
        }

        const photoEarning: PhotoEarning = {
          photo_id: photo.id,
          photo_title: photo.title || 'Sem título',
          campaign_title: campaign.title,
          campaign_id: campaign.id,
          sale_date: purchase.created_at,
          photo_price: Number(photo.price || 0),
          photographer_amount: photographerAmount,
          can_withdraw: canWithdraw,
          hours_until_withdraw: hoursUntilWithdraw,
        };

        if (!campaignMap.has(campaign.id)) {
          campaignMap.set(campaign.id, {
            campaign_id: campaign.id,
            campaign_title: campaign.title,
            total_photos_sold: 0,
            total_earned: 0,
            photos: [],
          });
        }

        const campaignEarnings = campaignMap.get(campaign.id)!;
        campaignEarnings.total_photos_sold += 1;
        campaignEarnings.total_earned += photographerAmount;
        campaignEarnings.photos.push(photoEarning);
      });

      setEarnings(Array.from(campaignMap.values()));
      setTotalAvailable(availableSum);
      setTotalPending(pendingSum);
      setTotalPhotosSold(photoCount);
    } catch (error) {
      console.error('Erro ao buscar ganhos:', error);
      toast.error('Erro ao carregar ganhos');
    } finally {
      setLoading(false);
    }
  };

  const requestPayout = async () => {
    // 1. Verificar se já existe solicitação pendente/aprovada
    if (pendingRequest) {
      toast.error(
        `Você já possui uma solicitação ${pendingRequest.status === 'pending' ? 'pendente' : 'aprovada'} no valor de ${formatCurrency(pendingRequest.amount)}. Aguarde o processamento.`
      );
      return;
    }

    // 2. Verificar saldo disponível
    if (totalAvailable <= 0) {
      toast.error('Não há valor disponível para saque');
      return;
    }

    // 3. Criar solicitação com loading
    setRequestingPayout(true);
    try {
      const { error } = await supabase
        .from('payout_requests')
        .insert({
          photographer_id: user?.id,
          amount: totalAvailable,
          status: 'pending',
        });

      if (error) {
        // Se erro for de constraint unique, mostrar mensagem amigável
        if (error.code === '23505') {
          toast.error('Você já possui uma solicitação pendente. Aguarde o processamento.');
        } else {
          throw error;
        }
        return;
      }

      // 4. Atualizar estado local imediatamente
      setTotalAvailable(0);
      toast.success('Solicitação de repasse enviada com sucesso!');
      
      // 5. Recarregar dados
      await fetchEarnings();
      await checkPendingRequest();
    } catch (error) {
      console.error('Erro ao solicitar repasse:', error);
      toast.error('Erro ao solicitar repasse. Tente novamente.');
    } finally {
      setRequestingPayout(false);
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
      {/* Alerta de Solicitação em Andamento */}
      {pendingRequest && (
        <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertTitle>Solicitação em Andamento</AlertTitle>
          <AlertDescription>
            Você possui uma solicitação de repasse {pendingRequest.status === 'pending' ? 'pendente' : 'aprovada'} 
            {' '}no valor de <strong>{formatCurrency(pendingRequest.amount)}</strong>.
            {pendingRequest.status === 'pending' 
              ? ' Aguardando análise do administrador.' 
              : ' Seu pagamento será processado em breve.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Alerta de Saldo Pendente */}
      {totalPending > 0 && (
        <Card className="border-2 border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-yellow-500/20">
                <Lock className="h-5 w-5 text-yellow-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-1">Vendas Pendentes</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  {totalPhotosSold} foto{totalPhotosSold !== 1 ? 's' : ''} vendida{totalPhotosSold !== 1 ? 's' : ''} com valor pendente de {formatCurrency(totalPending)}
                </p>
                <p className="text-xs text-muted-foreground">
                  💡 Após 12 horas da venda, o valor fica disponível para saque. Isso garante segurança contra fraudes e estornos.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-2 border-green-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Unlock className="h-4 w-4 text-green-600" />
              Disponível para Saque
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalAvailable)}
            </div>
            <Button
              onClick={requestPayout}
              disabled={totalAvailable <= 0 || requestingPayout || !!pendingRequest}
              className="w-full mt-4 gap-2"
            >
              {requestingPayout ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Processando...
                </>
              ) : (
                <>
                  <DollarSign className="h-4 w-4" />
                  Solicitar Repasse
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-2 border-yellow-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Lock className="h-4 w-4 text-yellow-600" />
              Pendente (menos de 12h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {formatCurrency(totalPending)}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Disponível após período de segurança
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Total Acumulado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(totalAvailable + totalPending)}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Todas as vendas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Ganhos por Campanha */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Ganhos por Evento
          </CardTitle>
          <CardDescription>
            Detalhamento de vendas e comissões por campanha
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
                        {campaign.total_photos_sold} foto(s) vendida(s)
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-primary">
                        {formatCurrency(campaign.total_earned)}
                      </div>
                      <p className="text-xs text-muted-foreground">Total recebido</p>
                    </div>
                  </div>

                  {/* Detalhes das Fotos */}
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
                          Detalhamento de todas as vendas deste evento
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-3 mt-4">
                        {campaign.photos.map((photo) => (
                          <div
                            key={`${photo.photo_id}-${photo.sale_date}`}
                            className="border rounded p-3 space-y-2"
                          >
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <div className="font-medium">{photo.photo_title}</div>
                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(photo.sale_date).toLocaleString('pt-BR')}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Preço da foto: {formatCurrency(photo.photo_price)}
                                </div>
                              </div>
                              <div className="text-right space-y-1">
                                <div className="font-semibold text-green-600">
                                  {formatCurrency(photo.photographer_amount)}
                                </div>
                                {photo.can_withdraw ? (
                                  <Badge className="bg-green-600">
                                    <Unlock className="h-3 w-3 mr-1" />
                                    Disponível
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                                    <Lock className="h-3 w-3 mr-1" />
                                    {photo.hours_until_withdraw}h restantes
                                  </Badge>
                                )}
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
