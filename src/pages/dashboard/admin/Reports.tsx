import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, Download, Calendar, TrendingUp, FileSpreadsheet, DollarSign, Users, Building2 } from 'lucide-react';
import AdminLayout from '@/components/dashboard/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/lib/utils';
import * as XLSX from 'xlsx';

const AdminReports = () => {
  const { profile } = useAuth();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<{
    totalRevenue: number;
    platformRevenue: number;
    photographersRevenue: number;
    organizationsRevenue: number;
    totalSales: number;
  } | null>(null);

  const generateSalesReport = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('purchases')
        .select(`
          *,
          photo:photos(title, campaign:campaigns(title)),
          buyer:profiles!purchases_buyer_id_fkey(full_name, email),
          photographer:profiles!purchases_photographer_id_fkey(full_name, email)
        `)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (startDate) {
        query = query.gte('created_at', `${startDate}T00:00:00`);
      }
      if (endDate) {
        query = query.lte('created_at', `${endDate}T23:59:59`);
      }

      const { data: purchases, error } = await query;

      if (error) throw error;

      const ws = XLSX.utils.json_to_sheet(
        (purchases || []).map(p => ({
          'ID': p.id,
          'Data': new Date(p.created_at).toLocaleDateString('pt-BR'),
          'Comprador': p.buyer?.full_name || 'N/A',
          'Email Comprador': p.buyer?.email || 'N/A',
          'Fotógrafo': p.photographer?.full_name || 'N/A',
          'Evento': p.photo?.campaign?.title || 'N/A',
          'Valor': `R$ ${p.amount.toFixed(2)}`,
          'Status': p.status,
        }))
      );

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Vendas');
      
      const dateRange = startDate && endDate ? `${startDate}_${endDate}` : new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `relatorio-vendas-${dateRange}.xlsx`);

      toast({
        title: "Relatório gerado!",
        description: `${purchases?.length || 0} vendas exportadas.`,
      });
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar o relatório.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateEventsReport = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('campaigns')
        .select(`
          *,
          organization:organizations(name),
          photos(count)
        `)
        .order('created_at', { ascending: false });

      if (startDate) {
        query = query.gte('event_date', startDate);
      }
      if (endDate) {
        query = query.lte('event_date', endDate);
      }

      const { data: campaigns, error } = await query;

      if (error) throw error;

      const ws = XLSX.utils.json_to_sheet(
        (campaigns || []).map(c => ({
          'ID': c.id,
          'Título': c.title,
          'Local': c.location || 'N/A',
          'Data': c.event_date ? new Date(c.event_date).toLocaleDateString('pt-BR') : 'N/A',
          'Organização': c.organization?.name || 'N/A',
          'Status': c.is_active ? 'Ativo' : 'Inativo',
          'Criado em': new Date(c.created_at).toLocaleDateString('pt-BR'),
        }))
      );

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Eventos');
      
      const dateRange = startDate && endDate ? `${startDate}_${endDate}` : new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `relatorio-eventos-${dateRange}.xlsx`);

      toast({
        title: "Relatório gerado!",
        description: `${campaigns?.length || 0} eventos exportados.`,
      });
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar o relatório.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateFinancialReport = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('revenue_shares')
        .select('*')
        .order('created_at', { ascending: false });

      if (startDate) {
        query = query.gte('created_at', `${startDate}T00:00:00`);
      }
      if (endDate) {
        query = query.lte('created_at', `${endDate}T23:59:59`);
      }

      const { data: revenueShares, error } = await query;

      if (error) throw error;

      // Calcular totais
      let totalPlatform = 0;
      let totalPhotographers = 0;
      let totalOrganizations = 0;

      revenueShares?.forEach(rs => {
        totalPlatform += Number(rs.platform_amount || 0);
        totalPhotographers += Number(rs.photographer_amount || 0);
        totalOrganizations += Number(rs.organization_amount || 0);
      });

      const totalRevenue = totalPlatform + totalPhotographers + totalOrganizations;

      setSummary({
        totalRevenue,
        platformRevenue: totalPlatform,
        photographersRevenue: totalPhotographers,
        organizationsRevenue: totalOrganizations,
        totalSales: revenueShares?.length || 0,
      });

      // Buscar dados relacionados separadamente
      const enrichedData = await Promise.all(
        (revenueShares || []).map(async (rs) => {
          const [purchaseData, photographerData, orgData] = await Promise.all([
            supabase.from('purchases').select('created_at, amount').eq('id', rs.purchase_id).single(),
            supabase.from('profiles').select('full_name, email').eq('id', rs.photographer_id).single(),
            rs.organization_id 
              ? supabase.from('organizations').select('name').eq('id', rs.organization_id).single()
              : Promise.resolve({ data: null })
          ]);

          return {
            id: rs.id,
            purchase: purchaseData.data,
            photographer: photographerData.data,
            organization: orgData.data,
            platform_amount: rs.platform_amount,
            photographer_amount: rs.photographer_amount,
            organization_amount: rs.organization_amount
          };
        })
      );

      const ws = XLSX.utils.json_to_sheet(
        enrichedData.map(rs => ({
          'ID': rs.id,
          'Data': rs.purchase?.created_at ? new Date(rs.purchase.created_at).toLocaleDateString('pt-BR') : 'N/A',
          'Fotógrafo Nome': rs.photographer?.full_name || 'N/A',
          'Organização': rs.organization?.name || 'N/A',
          'Valor Total': `R$ ${(rs.purchase?.amount || 0).toFixed(2)}`,
          'Valor Plataforma': `R$ ${rs.platform_amount.toFixed(2)}`,
          'Valor Fotógrafo': `R$ ${rs.photographer_amount.toFixed(2)}`,
          'Valor Organização': `R$ ${rs.organization_amount.toFixed(2)}`,
        }))
      );

      // Adicionar linha de totais
      XLSX.utils.sheet_add_aoa(ws, [
        [],
        ['RESUMO FINANCEIRO'],
        ['Total Receita:', `R$ ${totalRevenue.toFixed(2)}`],
        ['Lucro Plataforma:', `R$ ${totalPlatform.toFixed(2)}`],
        ['Repassado Fotógrafos:', `R$ ${totalPhotographers.toFixed(2)}`],
        ['Repassado Organizações:', `R$ ${totalOrganizations.toFixed(2)}`],
      ], { origin: -1 });

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Financeiro');
      
      const dateRange = startDate && endDate ? `${startDate}_${endDate}` : new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `relatorio-financeiro-${dateRange}.xlsx`);

      toast({
        title: "Relatório gerado!",
        description: `${revenueShares?.length || 0} transações exportadas.`,
      });
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar o relatório.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('revenue_shares')
        .select('platform_amount, photographer_amount, organization_amount');

      if (startDate) {
        query = query.gte('created_at', `${startDate}T00:00:00`);
      }
      if (endDate) {
        query = query.lte('created_at', `${endDate}T23:59:59`);
      }

      const { data: revenueShares, error } = await query;

      if (error) throw error;

      let totalPlatform = 0;
      let totalPhotographers = 0;
      let totalOrganizations = 0;

      revenueShares?.forEach(rs => {
        totalPlatform += Number(rs.platform_amount || 0);
        totalPhotographers += Number(rs.photographer_amount || 0);
        totalOrganizations += Number(rs.organization_amount || 0);
      });

      const totalRevenue = totalPlatform + totalPhotographers + totalOrganizations;

      setSummary({
        totalRevenue,
        platformRevenue: totalPlatform,
        photographersRevenue: totalPhotographers,
        organizationsRevenue: totalOrganizations,
        totalSales: revenueShares?.length || 0,
      });

      toast({
        title: "Resumo atualizado!",
        description: `Período: ${startDate || 'início'} até ${endDate || 'hoje'}`,
      });
    } catch (error) {
      console.error('Error fetching summary:', error);
      toast({
        title: "Erro",
        description: "Não foi possível buscar o resumo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (profile?.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-2">Acesso Negado</h2>
        <p className="text-muted-foreground">Apenas administradores podem acessar esta página</p>
      </div>
    );
  }

  const reports = [
    {
      title: 'Relatório de Vendas',
      description: 'Resumo completo de todas as vendas realizadas',
      icon: TrendingUp,
      color: 'text-green-500',
      action: generateSalesReport
    },
    {
      title: 'Relatório de Eventos',
      description: 'Estatísticas de eventos e participação',
      icon: Calendar,
      color: 'text-blue-500',
      action: generateEventsReport
    },
    {
      title: 'Relatório Financeiro',
      description: 'Análise financeira detalhada da plataforma',
      icon: FileText,
      color: 'text-purple-500',
      action: generateFinancialReport
    }
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
          <p className="text-muted-foreground">Gere e exporte relatórios da plataforma com filtros de período</p>
        </div>

        {/* Filtros de Data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Período do Relatório
            </CardTitle>
            <CardDescription>
              Selecione o período para filtrar os dados dos relatórios
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="startDate">Data Início</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-44"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">Data Fim</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-44"
                />
              </div>
              <Button onClick={fetchSummary} disabled={loading} variant="secondary">
                Atualizar Resumo
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Resumo Financeiro */}
        {summary && (
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="border-2 border-green-500/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-500" />
                  Receita Total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalRevenue)}</div>
                <p className="text-xs text-muted-foreground">{summary.totalSales} vendas</p>
              </CardContent>
            </Card>

            <Card className="border-2 border-primary/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Lucro Plataforma
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{formatCurrency(summary.platformRevenue)}</div>
                <p className="text-xs text-muted-foreground">
                  {summary.totalRevenue > 0 ? ((summary.platformRevenue / summary.totalRevenue) * 100).toFixed(1) : 0}% do total
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-blue-500/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-500" />
                  Fotógrafos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{formatCurrency(summary.photographersRevenue)}</div>
                <p className="text-xs text-muted-foreground">
                  {summary.totalRevenue > 0 ? ((summary.photographersRevenue / summary.totalRevenue) * 100).toFixed(1) : 0}% do total
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-purple-500/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-purple-500" />
                  Organizações
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">{formatCurrency(summary.organizationsRevenue)}</div>
                <p className="text-xs text-muted-foreground">
                  {summary.totalRevenue > 0 ? ((summary.organizationsRevenue / summary.totalRevenue) * 100).toFixed(1) : 0}% do total
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Botões de Relatório */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {reports.map((report) => (
            <Card key={report.title}>
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <report.icon className={`h-5 w-5 ${report.color}`} />
                  <CardTitle className="text-lg">{report.title}</CardTitle>
                </div>
                <CardDescription>{report.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="outline" 
                  className="w-full gap-2"
                  onClick={report.action}
                  disabled={loading}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  {loading ? 'Gerando...' : 'Exportar XLSX'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Info */}
        <Card>
          <CardHeader>
            <CardTitle>Informações</CardTitle>
            <CardDescription>
              Os relatórios são gerados considerando o período selecionado. Se nenhuma data for informada, todos os registros serão incluídos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>• <strong>Relatório de Vendas:</strong> Lista todas as compras concluídas com dados do comprador e fotógrafo.</p>
              <p>• <strong>Relatório de Eventos:</strong> Lista todos os eventos cadastrados no período.</p>
              <p>• <strong>Relatório Financeiro:</strong> Detalhamento da divisão de receitas (plataforma, fotógrafos, organizações).</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminReports;
