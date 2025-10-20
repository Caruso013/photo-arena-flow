import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, Calendar, TrendingUp, FileSpreadsheet } from 'lucide-react';
import AdminLayout from '@/components/dashboard/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import * as XLSX from 'xlsx';

const AdminReports = () => {
  const { profile } = useAuth();

  const generateSalesReport = async () => {
    try {
      const { data: purchases, error } = await supabase
        .from('purchases')
        .select(`
          *,
          photo:photos(title, campaign:campaigns(title)),
          buyer:profiles!purchases_buyer_id_fkey(full_name, email),
          photographer:profiles!purchases_photographer_id_fkey(full_name, email)
        `)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

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
      XLSX.writeFile(wb, `relatorio-vendas-${new Date().toISOString().split('T')[0]}.xlsx`);

      toast({
        title: "Relatório gerado!",
        description: "O arquivo foi baixado com sucesso.",
      });
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar o relatório.",
        variant: "destructive",
      });
    }
  };

  const generateEventsReport = async () => {
    try {
      const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          organization:organizations(name),
          photos(count)
        `)
        .order('created_at', { ascending: false });

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
      XLSX.writeFile(wb, `relatorio-eventos-${new Date().toISOString().split('T')[0]}.xlsx`);

      toast({
        title: "Relatório gerado!",
        description: "O arquivo foi baixado com sucesso.",
      });
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar o relatório.",
        variant: "destructive",
      });
    }
  };

  const generateFinancialReport = async () => {
    try {
      const { data: revenueShares, error } = await supabase
        .from('revenue_shares')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

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

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Financeiro');
      XLSX.writeFile(wb, `relatorio-financeiro-${new Date().toISOString().split('T')[0]}.xlsx`);

      toast({
        title: "Relatório gerado!",
        description: "O arquivo foi baixado com sucesso.",
      });
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar o relatório.",
        variant: "destructive",
      });
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
          <p className="text-muted-foreground">Gere e exporte relatórios da plataforma</p>
        </div>

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
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Exportar XLSX
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Relatórios Personalizados</CardTitle>
            <CardDescription>
              Em breve: Crie relatórios personalizados com filtros avançados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p>Funcionalidade em desenvolvimento</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminReports;
