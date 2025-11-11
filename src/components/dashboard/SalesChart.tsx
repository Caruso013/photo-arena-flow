import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, DollarSign, ShoppingCart, Camera } from 'lucide-react';

interface SalesData {
  date: string;
  sales: number;
  revenue: number;
  photos: number;
}

interface SalesChartProps {
  data: SalesData[];
  title?: string;
  description?: string;
  type?: 'line' | 'bar' | 'area';
}

export const SalesChart = ({ 
  data, 
  title = 'Vendas Diárias',
  description = 'Evolução de vendas nos últimos 30 dias',
  type = 'area'
}: SalesChartProps) => {
  const chartConfig = {
    revenue: {
      label: 'Receita',
      color: 'hsl(var(--primary))',
    },
    sales: {
      label: 'Vendas',
      color: 'hsl(var(--accent))',
    },
    photos: {
      label: 'Fotos',
      color: 'hsl(var(--secondary))',
    },
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
  const totalSales = data.reduce((sum, d) => sum + d.sales, 0);
  const avgTicket = totalSales > 0 ? totalRevenue / totalSales : 0;

  return (
    <div className="space-y-4">
      {/* Métricas Rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Receita Total</span>
            </div>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(totalRevenue)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-accent/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <ShoppingCart className="h-4 w-4 text-accent" />
              <span className="text-sm text-muted-foreground">Total de Vendas</span>
            </div>
            <div className="text-2xl font-bold text-accent">
              {totalSales}
            </div>
          </CardContent>
        </Card>

        <Card className="border-secondary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-secondary" />
              <span className="text-sm text-muted-foreground">Ticket Médio</span>
            </div>
            <div className="text-2xl font-bold text-secondary">
              {formatCurrency(avgTicket)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico Principal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {type === 'area' ? (
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatDate}
                    className="text-xs"
                  />
                  <YAxis 
                    tickFormatter={(value) => formatCurrency(value)}
                    className="text-xs"
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--primary))"
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                </AreaChart>
              ) : type === 'bar' ? (
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatDate}
                    className="text-xs"
                  />
                  <YAxis className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="sales" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="photos" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : (
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatDate}
                    className="text-xs"
                  />
                  <YAxis 
                    tickFormatter={(value) => formatCurrency(value)}
                    className="text-xs"
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="sales" 
                    stroke="hsl(var(--accent))"
                    strokeWidth={2}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
};
