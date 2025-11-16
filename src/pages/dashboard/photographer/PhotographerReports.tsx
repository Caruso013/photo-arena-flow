import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, TrendingUp, Users, DollarSign } from 'lucide-react';

const PhotographerReports = () => {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Relatórios</h1>
        <p className="text-muted-foreground mt-2">
          Análise detalhada do seu desempenho
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <BarChart className="h-5 w-5" />
              Vendas por Período
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Em breve: Gráficos de vendas por dia, semana e mês
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <TrendingUp className="h-5 w-5" />
              Performance de Eventos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Em breve: Análise de eventos mais lucrativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Users className="h-5 w-5" />
              Engajamento de Clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Em breve: Estatísticas de visualizações e compras
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <DollarSign className="h-5 w-5" />
              Análise Financeira
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Em breve: Relatórios detalhados de receitas
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PhotographerReports;
