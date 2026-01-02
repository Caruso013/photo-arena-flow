import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Camera, Calendar } from 'lucide-react';

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
  onPeriodChange?: (days: number) => void;
  showPeriodFilter?: boolean;
  selectedPeriod?: number;
}

export const SalesChart = ({ 
  data, 
  title = 'Vendas Diárias',
  description = 'Evolução de vendas',
  type = 'area',
  onPeriodChange,
  showPeriodFilter = true,
  selectedPeriod = 30
}: SalesChartProps) => {
  const [period, setPeriod] = useState(selectedPeriod.toString());

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

  // Calcular métricas atuais
  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
  const totalSales = data.reduce((sum, d) => sum + d.sales, 0);
  const avgTicket = totalSales > 0 ? totalRevenue / totalSales : 0;

  // Calcular métricas do período anterior para comparação
  const halfLength = Math.floor(data.length / 2);
  const recentData = data.slice(halfLength);
  const previousData = data.slice(0, halfLength);

  const recentRevenue = recentData.reduce((sum, d) => sum + d.revenue, 0);
  const previousRevenue = previousData.reduce((sum, d) => sum + d.revenue, 0);
  const revenueChange = previousRevenue > 0 ? ((recentRevenue - previousRevenue) / previousRevenue) * 100 : 0;

  const recentSales = recentData.reduce((sum, d) => sum + d.sales, 0);
  const previousSales = previousData.reduce((sum, d) => sum + d.sales, 0);
  const salesChange = previousSales > 0 ? ((recentSales - previousSales) / previousSales) * 100 : 0;

  const handlePeriodChange = (value: string) => {
    setPeriod(value);
    onPeriodChange?.(Number(value));
  };

  const getPeriodLabel = () => {
    switch (period) {
      case '7': return 'últimos 7 dias';
      case '15': return 'últimos 15 dias';
      case '30': return 'últimos 30 dias';
      case '90': return 'últimos 3 meses';
      default: return 'período selecionado';
    }
  };

  const TrendIndicator = ({ value, suffix = '' }: { value: number; suffix?: string }) => {
    if (value === 0) return null;
    const isPositive = value > 0;
    return (
      <div className={`flex items-center gap-1 text-xs ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
        {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        <span>{isPositive ? '+' : ''}{value.toFixed(1)}%{suffix}</span>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header com Filtro de Período */}
      {showPeriodFilter && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Mostrando {getPeriodLabel()}</span>
          </div>
          <Select value={period} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="15">Últimos 15 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 3 meses</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Métricas Rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">Receita Total</span>
              </div>
              <TrendIndicator value={revenueChange} suffix=" vs anterior" />
            </div>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {getPeriodLabel()}
            </p>
          </CardContent>
        </Card>

        <Card className="border-accent/20 bg-gradient-to-br from-accent/5 to-transparent">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-accent" />
                <span className="text-sm text-muted-foreground">Total de Vendas</span>
              </div>
              <TrendIndicator value={salesChange} suffix=" vs anterior" />
            </div>
            <div className="text-2xl font-bold text-accent">
              {totalSales}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              fotos vendidas
            </p>
          </CardContent>
        </Card>

        <Card className="border-secondary/20 bg-gradient-to-br from-secondary/5 to-transparent">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-secondary" />
              <span className="text-sm text-muted-foreground">Ticket Médio</span>
            </div>
            <div className="text-2xl font-bold text-secondary">
              {formatCurrency(avgTicket)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              por venda
            </p>
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
          <CardDescription>{description} - {getPeriodLabel()}</CardDescription>
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
