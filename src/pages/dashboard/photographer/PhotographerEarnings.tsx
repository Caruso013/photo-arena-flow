import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, Calendar, Download } from 'lucide-react';
import { SkeletonCard } from '@/components/ui/skeleton-card';
import { Button } from '@/components/ui/button';

interface EarningsData {
  total_earnings: number;
  pending_earnings: number;
  completed_earnings: number;
  total_photos_sold: number;
  average_photo_price: number;
}

const PhotographerEarnings = () => {
  const { user } = useAuth();
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchEarnings();
    }
  }, [user?.id]);

  const fetchEarnings = async () => {
    if (!user?.id) return;
    
    try {
      // Buscar todas as compras de fotos do fotógrafo
      const { data: purchases, error } = await supabase
        .from('purchases')
        .select(`
          *,
          photos!inner(photographer_id, price)
        `)
        .eq('photos.photographer_id', user.id);

      if (error) throw error;

      // Calcular estatísticas
      const completed = purchases?.filter(p => p.status === 'completed') || [];
      const pending = purchases?.filter(p => p.status === 'pending') || [];

      const completedEarnings = completed.reduce((sum, p) => sum + Number(p.amount), 0);
      const pendingEarnings = pending.reduce((sum, p) => sum + Number(p.amount), 0);
      const totalEarnings = completedEarnings + pendingEarnings;
      const totalPhotosSold = purchases?.length || 0;
      const avgPrice = totalPhotosSold > 0 ? totalEarnings / totalPhotosSold : 0;

      setEarnings({
        total_earnings: totalEarnings,
        pending_earnings: pendingEarnings,
        completed_earnings: completedEarnings,
        total_photos_sold: totalPhotosSold,
        average_photo_price: avgPrice,
      });
    } catch (error) {
      console.error('Error fetching earnings:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Financeiro</h1>
          <p className="text-muted-foreground mt-2">
            Acompanhe seus ganhos e vendas
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">
              Total de Ganhos
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              R$ {earnings?.total_earnings.toFixed(2) || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Incluindo pendentes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">
              Ganhos Confirmados
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              R$ {earnings?.completed_earnings.toFixed(2) || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Pagamentos aprovados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">
              Fotos Vendidas
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {earnings?.total_photos_sold || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total de vendas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">
              Preço Médio
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              R$ {earnings?.average_photo_price.toFixed(2) || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Por foto vendida
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">Resumo de Pagamentos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Ganhos Pendentes</p>
              <p className="text-lg font-semibold text-yellow-600 dark:text-yellow-400">
                R$ {earnings?.pending_earnings.toFixed(2) || '0.00'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">
                Aguardando confirmação de pagamento
              </p>
            </div>
          </div>

          <div className="flex justify-between items-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
            <div>
              <p className="text-sm text-green-900 dark:text-green-100">Disponível para Saque</p>
              <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                R$ {earnings?.completed_earnings.toFixed(2) || '0.00'}
              </p>
            </div>
            <Button variant="default" disabled={!earnings || earnings.completed_earnings === 0}>
              <Download className="h-4 w-4 mr-2" />
              Solicitar Saque
            </Button>
          </div>

          <p className="text-xs text-muted-foreground mt-4">
            💡 Os ganhos serão disponibilizados após a confirmação do pagamento pelo cliente.
            O saque pode ser solicitado quando atingir o valor mínimo de R$ 50,00.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PhotographerEarnings;
