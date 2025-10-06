import React, { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, DollarSign, Camera, Trophy, Target, Users, Award } from 'lucide-react';
import { PayoutRequestsManager } from './PayoutRequestsManager';
import { PhotographerEarnings } from './PhotographerEarnings';

interface PhotographerStats {
  photographer_id: string;
  photographer_name: string;
  total_sales: number;
  total_photos: number;
  total_revenue: number;
  avg_photo_price: number;
  rank: number;
}

interface RevenueData {
  month: string;
  platform: number;
  photographers: number;
  organizations: number;
}

interface FinancialDashboardProps {
  userRole: 'admin' | 'photographer';
  view?: 'overview' | 'payouts' | 'earnings';
}

const FinancialDashboard = ({ userRole, view = 'overview' }: FinancialDashboardProps) => {
  const { user } = useAuth();

  // Se view é payouts ou earnings, mostrar componentes específicos
  if (view === 'payouts' && userRole === 'admin') {
    return <PayoutRequestsManager />;
  }

  if (view === 'earnings' && userRole === 'photographer') {
    return <PhotographerEarnings />;
  }
  const [photographerStats, setPhotographerStats] = useState<PhotographerStats[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [userStats, setUserStats] = useState<PhotographerStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFinancialData();
  }, [user, userRole]);

  const fetchFinancialData = async () => {
    try {
      setLoading(true);

      // Fetch photographer performance stats
      const { data: salesData, error: salesError } = await supabase
        .from('purchases')
        .select(`
          photographer_id,
          amount,
          photo:photos(title, price),
          photographer:profiles!photographer_id(full_name),
          created_at
        `)
        .eq('status', 'completed');

      if (salesError) throw salesError;

      // Process photographer stats
      const photographerMap = new Map<string, PhotographerStats>();
      let totalRevenueSum = 0;

      salesData?.forEach(sale => {
        const photographerId = sale.photographer_id;
        const photographerName = sale.photographer?.full_name || 'Fotógrafo Desconhecido';
        const amount = Number(sale.amount || 0);
        
        totalRevenueSum += amount;

        if (!photographerMap.has(photographerId)) {
          photographerMap.set(photographerId, {
            photographer_id: photographerId,
            photographer_name: photographerName,
            total_sales: 0,
            total_photos: 0,
            total_revenue: 0,
            avg_photo_price: 0,
            rank: 0
          });
        }

        const stats = photographerMap.get(photographerId)!;
        stats.total_sales += 1;
        stats.total_photos += 1;
        stats.total_revenue += amount;
      });

      // Calculate averages and sort by revenue
      const sortedStats = Array.from(photographerMap.values())
        .map(stats => ({
          ...stats,
          avg_photo_price: stats.total_sales > 0 ? stats.total_revenue / stats.total_sales : 0
        }))
        .sort((a, b) => b.total_revenue - a.total_revenue)
        .map((stats, index) => ({ ...stats, rank: index + 1 }));

      setPhotographerStats(sortedStats);
      setTotalRevenue(totalRevenueSum);

      // Find current user stats if photographer
      if (userRole === 'photographer' && user) {
        const currentUserStats = sortedStats.find(s => s.photographer_id === user.id);
        setUserStats(currentUserStats || null);
      }

      // Buscar dados reais de revenue_shares agrupados por mês
      const { data: revenueSharesData, error: revenueError } = await supabase
        .from('revenue_shares')
        .select('platform_amount, photographer_amount, organization_amount, created_at')
        .gte('created_at', new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: true });

      if (revenueError) throw revenueError;

      // Agrupar por mês
      const monthlyMap = new Map<string, { platform: number; photographers: number; organizations: number }>();
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

      revenueSharesData?.forEach(share => {
        const date = new Date(share.created_at);
        const monthKey = `${monthNames[date.getMonth()]}`;
        
        if (!monthlyMap.has(monthKey)) {
          monthlyMap.set(monthKey, { platform: 0, photographers: 0, organizations: 0 });
        }
        
        const monthly = monthlyMap.get(monthKey)!;
        monthly.platform += Number(share.platform_amount || 0);
        monthly.photographers += Number(share.photographer_amount || 0);
        monthly.organizations += Number(share.organization_amount || 0);
      });

      const monthlyData: RevenueData[] = Array.from(monthlyMap.entries()).map(([month, data]) => ({
        month,
        platform: data.platform,
        photographers: data.photographers,
        organizations: data.organizations
      }));
      
      setRevenueData(monthlyData);

    } catch (error) {
      console.error('Error fetching financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold"><Trophy className="h-3 w-3 mr-1" />1º Lugar</Badge>;
    if (rank === 2) return <Badge className="bg-gray-400 hover:bg-gray-500 text-white font-semibold"><Award className="h-3 w-3 mr-1" />2º Lugar</Badge>;
    if (rank === 3) return <Badge className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"><Award className="h-3 w-3 mr-1" />3º Lugar</Badge>;
    if (rank <= 10) return <Badge variant="secondary" className="font-medium">Top 10</Badge>;
    return <Badge variant="outline" className="font-medium">#{rank}</Badge>;
  };

  const chartConfig = {
    platform: { label: "Plataforma", color: "hsl(var(--primary))" },
    photographers: { label: "Fotógrafos", color: "hsl(var(--secondary))" },
    organizations: { label: "Organizações", color: "hsl(var(--accent))" }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-muted rounded w-1/3"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-20 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-all hover:-translate-y-1 border-2 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <div className="p-2 bg-primary/10 rounded-lg">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              {formatCurrency(totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
              <TrendingUp className="h-3 w-3 text-green-600" />
              +12.5% vs mês anterior
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fotógrafos Ativos</CardTitle>
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{photographerStats.length}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Com vendas este período
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fotos Vendidas</CardTitle>
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Camera className="h-5 w-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {photographerStats.reduce((sum, p) => sum + p.total_photos, 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Total de transações
            </p>
          </CardContent>
        </Card>

        {userRole === 'photographer' && userStats && (
          <Card className="hover:shadow-lg transition-all hover:-translate-y-1 border-2 border-yellow-500/30 bg-gradient-to-br from-yellow-50/50 to-transparent dark:from-yellow-950/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sua Posição</CardTitle>
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <Target className="h-5 w-5 text-yellow-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">#{userStats.rank}</div>
              <p className="text-xs text-muted-foreground mt-2">
                {formatCurrency(userStats.total_revenue)} em vendas
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <Tabs defaultValue="ranking" className="space-y-6">
        <TabsList className={userRole === 'photographer' ? 'grid w-full max-w-2xl grid-cols-3' : 'grid w-full max-w-md grid-cols-2'}>
          <TabsTrigger value="ranking" className="gap-2">
            <Trophy className="h-4 w-4" />
            Ranking
          </TabsTrigger>
          <TabsTrigger value="revenue" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Receita
          </TabsTrigger>
          {userRole === 'photographer' && (
            <TabsTrigger value="personal" className="gap-2">
              <Target className="h-4 w-4" />
              Meu Desempenho
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="ranking" className="space-y-4 animate-fade-in">
          <Card className="shadow-md">
            <CardHeader className="bg-gradient-to-r from-yellow-50 to-transparent dark:from-yellow-950/20">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <div className="p-2 bg-yellow-500/10 rounded-lg">
                  <Trophy className="h-6 w-6 text-yellow-600" />
                </div>
                Ranking de Fotógrafos
              </CardTitle>
              <CardDescription className="text-base">
                Os melhores fotógrafos da plataforma por volume de vendas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {photographerStats.slice(0, 10).map((photographer, index) => (
                  <div
                    key={photographer.photographer_id}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      userRole === 'photographer' && photographer.photographer_id === user?.id
                        ? 'bg-primary/5 border-primary/20'
                        : 'bg-card'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-2xl font-bold text-muted-foreground">
                        #{photographer.rank}
                      </div>
                      <div>
                        <div className="font-semibold">{photographer.photographer_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {photographer.total_sales} foto(s) vendida(s)
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="font-semibold">
                        {formatCurrency(photographer.total_revenue)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Média: {formatCurrency(photographer.avg_photo_price)}
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      {getRankBadge(photographer.rank)}
                      {photographer.rank <= 3 && (
                        <Progress 
                          value={100 - (photographer.rank - 1) * 20} 
                          className="w-20 h-2"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4 animate-fade-in">
          <Card className="shadow-md">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-transparent dark:from-blue-950/20">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                </div>
                Receita por Período
              </CardTitle>
              <CardDescription className="text-base">
                Análise temporal da distribuição de receita entre todos os participantes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="platform" stackId="a" fill="var(--color-platform)" />
                    <Bar dataKey="photographers" stackId="a" fill="var(--color-photographers)" />
                    <Bar dataKey="organizations" stackId="a" fill="var(--color-organizations)" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {userRole === 'photographer' && userStats && (
          <TabsContent value="personal" className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="shadow-md border-2 border-primary/20">
                <CardHeader className="bg-gradient-to-br from-primary/5 to-transparent">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Award className="h-5 w-5 text-primary" />
                    Seu Desempenho
                  </CardTitle>
                  <CardDescription>Estatísticas detalhadas das suas vendas</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Posição no Ranking:</span>
                    <div className="flex items-center gap-2">
                      {getRankBadge(userStats.rank)}
                    </div>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Total de Vendas:</span>
                    <span className="font-semibold">{userStats.total_sales}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Receita Total:</span>
                    <span className="font-semibold">
                      {formatCurrency(userStats.total_revenue)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Preço Médio por Foto:</span>
                    <span className="font-semibold">
                      {formatCurrency(userStats.avg_photo_price)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-md border-2 border-green-500/20">
                <CardHeader className="bg-gradient-to-br from-green-50 to-transparent dark:from-green-950/20">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Target className="h-5 w-5 text-green-600" />
                    Metas e Objetivos
                  </CardTitle>
                  <CardDescription>Acompanhe seu progresso e conquistas</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Meta de Vendas Mensais</span>
                      <span className="text-sm">
                        {userStats.total_sales}/50
                      </span>
                    </div>
                    <Progress value={(userStats.total_sales / 50) * 100} />
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Meta de Receita</span>
                      <span className="text-sm">
                        {formatCurrency(userStats.total_revenue)}/R$ 5.000
                      </span>
                    </div>
                    <Progress value={(userStats.total_revenue / 5000) * 100} />
                  </div>
                  
                  <div className="pt-4 border-t">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">
                        {userStats.rank <= 3 ? '🏆' : userStats.rank <= 10 ? '🥇' : '📈'}
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        {userStats.rank === 1 && "Parabéns! Você é o fotógrafo #1!"}
                        {userStats.rank > 1 && userStats.rank <= 3 && "Excelente! Você está no pódio!"}
                        {userStats.rank > 3 && userStats.rank <= 10 && "Muito bem! Você está no Top 10!"}
                        {userStats.rank > 10 && "Continue se esforçando para subir no ranking!"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default FinancialDashboard;