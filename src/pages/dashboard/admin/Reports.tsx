import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, Calendar, TrendingUp } from 'lucide-react';
import AdminLayout from '@/components/dashboard/AdminLayout';

const AdminReports = () => {
  const { profile } = useAuth();

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
      color: 'text-green-500'
    },
    {
      title: 'Relatório de Eventos',
      description: 'Estatísticas de eventos e participação',
      icon: Calendar,
      color: 'text-blue-500'
    },
    {
      title: 'Relatório Financeiro',
      description: 'Análise financeira detalhada da plataforma',
      icon: FileText,
      color: 'text-purple-500'
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
                <Button variant="outline" className="w-full gap-2">
                  <Download className="h-4 w-4" />
                  Exportar Relatório
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
