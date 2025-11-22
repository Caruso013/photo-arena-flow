import React, { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, DollarSign, Camera, Trophy, Target, Users, Award, FileText, Download } from 'lucide-react';
import { PayoutRequestsManager } from './PayoutRequestsManager';
import { PhotographerEarnings } from './PhotographerEarnings';
import { useToast } from '@/hooks/use-toast';
import { usePhotographerGoals } from '@/hooks/usePhotographerGoals';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  const { toast } = useToast();
  const { currentGoal, progress } = usePhotographerGoals();

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
  const [generatingReport, setGeneratingReport] = useState(false);

  useEffect(() => {
    fetchFinancialData();
  }, [user, userRole]);

  const fetchFinancialData = async () => {
    try {
      setLoading(true);

      // Se for fotógrafo, buscar apenas seus revenue_shares
      if (userRole === 'photographer' && user) {
        // Buscar revenue_shares do fotógrafo
        const { data: revenueSharesData, error: revenueError } = await supabase
          .from('revenue_shares')
          .select('photographer_amount, created_at')
          .eq('photographer_id', user.id);

        if (revenueError) throw revenueError;

        // Calcular receita do fotógrafo
        const photographerRevenue = revenueSharesData?.reduce(
          (sum, share) => sum + Number(share.photographer_amount || 0),
          0
        ) || 0;

        // Buscar TODOS os fotógrafos para calcular rank correto
        const { data: allPhotographersData } = await supabase
          .from('revenue_shares')
          .select('photographer_id, photographer_amount');

        // Agregar receita por fotógrafo
        const photographerRevenueMap = new Map<string, number>();
        allPhotographersData?.forEach(share => {
          const current = photographerRevenueMap.get(share.photographer_id) || 0;
          photographerRevenueMap.set(share.photographer_id, current + Number(share.photographer_amount || 0));
        });

        // Ordenar e calcular rank
        const sortedPhotographers = Array.from(photographerRevenueMap.entries())
          .map(([id, revenue]) => ({ id, revenue }))
          .sort((a, b) => b.revenue - a.revenue);

        const photographerRank = sortedPhotographers.findIndex(p => p.id === user.id) + 1;

        // Buscar compras do fotógrafo para stats
        const { data: salesData, error: salesError } = await supabase
          .from('purchases')
          .select(`
            photographer_id,
            amount,
            photo:photos(title, price),
            photographer:profiles!photographer_id(full_name),
            created_at
          `)
          .eq('status', 'completed')
          .eq('photographer_id', user.id);

        if (salesError) throw salesError;

        const stats: PhotographerStats = {
          photographer_id: user.id,
          photographer_name: salesData?.[0]?.photographer?.full_name || 'Você',
          total_sales: salesData?.length || 0,
          total_photos: salesData?.length || 0,
          total_revenue: photographerRevenue,
          avg_photo_price: salesData?.length ? photographerRevenue / salesData.length : 0,
          rank: photographerRank
        };

        setUserStats(stats);
        setTotalRevenue(photographerRevenue);
        setPhotographerStats([stats]);
      } else {
        // Para admin, buscar todos os fotógrafos
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

  const generateFinancialReport = async () => {
    try {
      setGeneratingReport(true);

      // Criar PDF
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      
      // Data atual
      const currentDate = new Date();
      const formattedDate = currentDate.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
      const formattedTime = currentDate.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });

      // ===== HEADER COM LOGO =====
      // Fundo preto no topo
      doc.setFillColor(13, 13, 13); // #0d0d0d
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      // Logo STA (texto dourado)
      doc.setTextColor(230, 184, 0); // #e6b800 dourado
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('STA FOTOS', pageWidth / 2, 20, { align: 'center' });
      
      // Subtítulo
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(255, 255, 255);
      doc.text('Relatório Financeiro - Contador', pageWidth / 2, 28, { align: 'center' });
      
      // ===== INFORMAÇÕES DO RELATÓRIO =====
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('RELATÓRIO FINANCEIRO', 14, 50);
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Data de Emissão: ${formattedDate} às ${formattedTime}`, 14, 58);
      doc.text(`Período: Todas as transações`, 14, 64);
      
      // Linha separadora
      doc.setDrawColor(230, 184, 0); // Dourado
      doc.setLineWidth(0.5);
      doc.line(14, 68, pageWidth - 14, 68);
      
      // ===== RESUMO FINANCEIRO =====
      let yPosition = 78;
      
      doc.setFillColor(250, 250, 250); // Fundo cinza claro
      doc.rect(14, yPosition - 5, pageWidth - 28, 35, 'F');
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('RESUMO EXECUTIVO', 18, yPosition);
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      yPosition += 8;
      
      const totalPhotos = photographerStats.reduce((sum, p) => sum + p.total_photos, 0);
      const totalSales = photographerStats.reduce((sum, p) => sum + p.total_sales, 0);
      const avgSaleValue = totalRevenue / Math.max(totalSales, 1);
      
      doc.text(`Receita Total:`, 18, yPosition);
      doc.setFont('helvetica', 'bold');
      doc.text(`${formatCurrency(totalRevenue)}`, 70, yPosition);
      
      doc.setFont('helvetica', 'normal');
      yPosition += 6;
      doc.text(`Total de Fotógrafos:`, 18, yPosition);
      doc.setFont('helvetica', 'bold');
      doc.text(`${photographerStats.length}`, 70, yPosition);
      
      doc.setFont('helvetica', 'normal');
      yPosition += 6;
      doc.text(`Total de Fotos Vendidas:`, 18, yPosition);
      doc.setFont('helvetica', 'bold');
      doc.text(`${totalPhotos}`, 70, yPosition);
      
      doc.setFont('helvetica', 'normal');
      yPosition += 6;
      doc.text(`Ticket Médio:`, 18, yPosition);
      doc.setFont('helvetica', 'bold');
      doc.text(`${formatCurrency(avgSaleValue)}`, 70, yPosition);
      
      // ===== TABELA DE FOTÓGRAFOS =====
      yPosition += 15;
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('VENDAS POR FOTÓGRAFO', 14, yPosition);
      
      // Preparar dados da tabela
      const tableData = photographerStats.map((p, index) => [
        `${index + 1}`,
        p.photographer_name,
        `${p.total_sales}`,
        `${p.total_photos}`,
        formatCurrency(p.total_revenue),
        formatCurrency(p.avg_photo_price)
      ]);
      
      autoTable(doc, {
        startY: yPosition + 5,
        head: [['#', 'Fotógrafo', 'Vendas', 'Fotos', 'Receita Total', 'Ticket Médio']],
        body: tableData,
        theme: 'striped',
        headStyles: {
          fillColor: [13, 13, 13], // Preto STA
          textColor: [230, 184, 0], // Dourado
          fontStyle: 'bold',
          fontSize: 9
        },
        bodyStyles: {
          fontSize: 8
        },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 60 },
          2: { cellWidth: 20, halign: 'center' },
          3: { cellWidth: 20, halign: 'center' },
          4: { cellWidth: 35, halign: 'right' },
          5: { cellWidth: 35, halign: 'right' }
        },
        margin: { left: 14, right: 14 },
        didDrawPage: (data) => {
          // Footer em cada página
          const pageCount = doc.getNumberOfPages();
          doc.setFontSize(8);
          doc.setTextColor(128, 128, 128);
          doc.text(
            `Página ${data.pageNumber} de ${pageCount}`,
            pageWidth / 2,
            pageHeight - 10,
            { align: 'center' }
          );
          
          // Rodapé com info
          doc.text(
            'STA Fotos - Relatório Confidencial',
            14,
            pageHeight - 10
          );
          doc.text(
            formattedDate,
            pageWidth - 14,
            pageHeight - 10,
            { align: 'right' }
          );
        }
      });
      
      // ===== OBSERVAÇÕES FINAIS =====
      const finalY = (doc as any).lastAutoTable.finalY + 15;
      
      if (finalY < pageHeight - 40) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('OBSERVAÇÕES:', 14, finalY);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text('• Este relatório contém informações confidenciais para fins contábeis.', 14, finalY + 6);
        doc.text('• Todos os valores estão em Reais (R$).', 14, finalY + 11);
        doc.text('• As vendas incluem apenas transações com status "completed".', 14, finalY + 16);
      }
      
      // Salvar PDF
      const fileName = `relatorio-financeiro-sta-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

      toast({
        title: "Relatório PDF gerado com sucesso!",
        description: `${fileName} - Total: ${formatCurrency(totalRevenue)}`,
      });

    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Erro ao gerar relatório",
        description: "Não foi possível gerar o relatório em PDF. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setGeneratingReport(false);
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
      <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-lg transition-all hover:-translate-y-1 border-2 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <div className="p-2 bg-primary/10 rounded-lg">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-primary">
              {formatCurrency(totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Total de vendas realizadas
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fotógrafos Ativos</CardTitle>
            <div className="p-2 bg-accent/10 rounded-lg">
              <Users className="h-5 w-5 text-accent-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">{photographerStats.length}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Com vendas este período
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fotos Vendidas</CardTitle>
            <div className="p-2 bg-secondary/10 rounded-lg">
              <Camera className="h-5 w-5 text-secondary-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">
              {photographerStats.reduce((sum, p) => sum + p.total_photos, 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Total de transações
            </p>
          </CardContent>
        </Card>

        {userRole === 'photographer' && userStats && (
          <Card className="hover:shadow-lg transition-all hover:-translate-y-1 border-2 border-primary/30 bg-primary/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sua Posição</CardTitle>
              <div className="p-2 bg-primary/10 rounded-lg">
                <Target className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold">#{userStats.rank}</div>
              <p className="text-xs text-muted-foreground mt-2">
                {formatCurrency(userStats.total_revenue)} em vendas
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Botão Gerar Relatório - Apenas para Admin */}
      {userRole === 'admin' && (
        <Card className="border-dashed border-2">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Relatório Financeiro PDF - Contador</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Gere um relatório profissional em PDF com logo STA, vendas por fotógrafo, datas e valores totais
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    📄 Formato PDF Profissional
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    📊 Receita: {formatCurrency(totalRevenue)}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    👥 {photographerStats.length} Fotógrafos
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    📸 {photographerStats.reduce((sum, p) => sum + p.total_photos, 0)} Fotos
                  </Badge>
                </div>
              </div>
              <Button 
                onClick={generateFinancialReport}
                disabled={generatingReport}
                className="bg-primary hover:bg-primary/90 gap-2 min-w-[180px]"
                size="lg"
              >
                {generatingReport ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Gerando PDF...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Gerar PDF
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="ranking" className="space-y-6">
        <TabsList className={userRole === 'photographer' ? 'grid w-full max-w-2xl grid-cols-2' : 'grid w-full max-w-md grid-cols-2'}>
          {userRole === 'admin' && (
            <TabsTrigger value="ranking" className="gap-2">
              <Trophy className="h-4 w-4" />
              Ranking
            </TabsTrigger>
          )}
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

        {userRole === 'admin' && (
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
                      (userRole as string) === 'photographer' && photographer.photographer_id === user?.id
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
        )}

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

        {userRole === 'photographer' && (
          <TabsContent value="personal" className="space-y-6 animate-fade-in">
            {!userStats ? (
              <Card className="shadow-md">
                <CardHeader className="text-center">
                  <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <Camera className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">Comece sua Jornada</CardTitle>
                  <CardDescription className="text-base">
                    Você ainda não possui vendas registradas. Faça upload de suas fotos e comece a vender!
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-3xl font-bold text-muted-foreground">0</div>
                      <div className="text-sm text-muted-foreground">Vendas</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-3xl font-bold text-muted-foreground">R$ 0,00</div>
                      <div className="text-sm text-muted-foreground">Receita Total</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-3xl font-bold text-muted-foreground">-</div>
                      <div className="text-sm text-muted-foreground">Posição</div>
                    </div>
                  </div>
                  <div className="text-center text-sm text-muted-foreground mt-6">
                    💡 Dica: Quanto mais fotos você vender, melhor será sua posição no ranking!
                  </div>
                </CardContent>
              </Card>
            ) : (
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
                  {currentGoal ? (
                    <>
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm">Meta de Fotos Vendidas</span>
                          <span className="text-sm font-semibold">
                            {progress.photosRealized}/{currentGoal.photos_target || 0}
                          </span>
                        </div>
                        <Progress 
                          value={currentGoal.photos_target ? (progress.photosRealized / currentGoal.photos_target) * 100 : 0} 
                          className="h-2"
                        />
                      </div>
                      
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm">Meta de Receita</span>
                          <span className="text-sm font-semibold">
                            {formatCurrency(progress.salesRealized)}/{formatCurrency(currentGoal.sales_target || 0)}
                          </span>
                        </div>
                        <Progress 
                          value={currentGoal.sales_target ? (progress.salesRealized / currentGoal.sales_target) * 100 : 0}
                          className="h-2"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm">Meta de Eventos</span>
                          <span className="text-sm font-semibold">
                            {progress.eventsRealized}/{currentGoal.events_target || 0}
                          </span>
                        </div>
                        <Progress 
                          value={currentGoal.events_target ? (progress.eventsRealized / currentGoal.events_target) * 100 : 0}
                          className="h-2"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-6">
                      <Target className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">
                        Você ainda não definiu metas para este mês
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Defina suas metas na seção "Metas e Objetivos"
                      </p>
                    </div>
                  )}
                  
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
          )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default FinancialDashboard;