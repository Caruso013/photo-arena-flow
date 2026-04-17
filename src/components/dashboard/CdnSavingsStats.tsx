/**
 * Componente Admin: Estatísticas de Economia com Imagens Otimizadas
 * Mostra o impacto da transformação nativa de imagens no tráfego do Storage
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingDown, Zap, DollarSign, Image as ImageIcon } from 'lucide-react';
import { estimateBandwidthSavings } from '@/lib/vercelImageCdn';

const PRO_LIMITS = {
  egressGb: 250,
  cachedEgressGb: 250,
};

const SAFETY_FACTOR = 0.7;
const DAYS_IN_MONTH = 30;
const WEEKS_IN_MONTH = 4.3;

export const CdnSavingsStats = () => {
  // Estimativas baseadas no uso médio
  // Ajustar conforme analytics reais
  const dailyImageViews = 5000; // 5k visualizações/dia
  const avgImageSizeKb = 50; // 50KB médio por thumbnail
  
  const savings = estimateBandwidthSavings(dailyImageViews, avgImageSizeKb);
  const safeMonthlyEgress = PRO_LIMITS.egressGb * SAFETY_FACTOR;
  const safeMonthlyCachedEgress = PRO_LIMITS.cachedEgressGb * SAFETY_FACTOR;
  const safeDailyEgress = safeMonthlyEgress / DAYS_IN_MONTH;
  const safeDailyCachedEgress = safeMonthlyCachedEgress / DAYS_IN_MONTH;
  const safeWeeklyEgress = safeMonthlyEgress / WEEKS_IN_MONTH;
  const safeWeeklyCachedEgress = safeMonthlyCachedEgress / WEEKS_IN_MONTH;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="md:col-span-2 lg:col-span-4 border-primary/30">
        <CardHeader>
          <CardTitle className="text-base">Metas Mensais do Supabase Pro</CardTitle>
          <CardDescription>
            Limite do plano: 250 GB egress e 250 GB cached egress por mês. Meta segura em 70% para evitar estouro no fim do ciclo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Meta mensal egress</p>
              <p className="text-lg font-semibold">{safeMonthlyEgress.toFixed(0)} GB</p>
              <p className="text-xs text-muted-foreground">de 250 GB</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Meta mensal cached</p>
              <p className="text-lg font-semibold">{safeMonthlyCachedEgress.toFixed(0)} GB</p>
              <p className="text-xs text-muted-foreground">de 250 GB</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Média diária segura</p>
              <p className="text-lg font-semibold">{safeDailyEgress.toFixed(2)} GB</p>
              <p className="text-xs text-muted-foreground">egress</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Média diária segura</p>
              <p className="text-lg font-semibold">{safeDailyCachedEgress.toFixed(2)} GB</p>
              <p className="text-xs text-muted-foreground">cached egress</p>
            </div>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <p className="text-xs text-muted-foreground">
              Ritmo semanal recomendado: ate {safeWeeklyEgress.toFixed(1)} GB de egress e ate {safeWeeklyCachedEgress.toFixed(1)} GB de cached egress.
            </p>
            <p className="text-xs text-muted-foreground">
              Gatilhos operacionais: alerta amarelo em 70% da meta, alerta vermelho em 90% da meta.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Sem CDN
          </CardTitle>
          <ImageIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            {savings.withoutCdn} GB/mês
          </div>
          <p className="text-xs text-muted-foreground">
            Cached Egress sem otimização
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Com Imagens Otimizadas
          </CardTitle>
          <Zap className="h-4 w-4 text-yellow-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {savings.withCdn} GB/mês
          </div>
          <p className="text-xs text-muted-foreground">
            Com transformação e cache local
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Economia Total
          </CardTitle>
          <TrendingDown className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {savings.savings} GB/mês
          </div>
          <Badge variant="outline" className="mt-1">
            {savings.savingsPercent}% redução
          </Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Economia $$$
          </CardTitle>
          <DollarSign className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            ~${(savings.savings * 0.12).toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground">
            Por mês (Supabase Pro)
          </p>
        </CardContent>
      </Card>

      {/* Card de Informações */}
      <Card className="md:col-span-2 lg:col-span-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-600" />
            Como Funciona a Otimização de Imagens
          </CardTitle>
          <CardDescription>
            Otimização automática de imagens com cache local e transformação no Storage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <h4 className="font-semibold mb-2 text-sm">✅ Benefícios</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Cache do navegador e service worker</li>
                <li>• Compressão WebP/AVIF</li>
                <li>• Resize automático</li>
                <li>• Menos bytes por requisição</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2 text-sm">📊 Impacto</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Redução de tráfego em listas e previews</li>
                <li>• Páginas mais rápidas em galerias</li>
                <li>• Menos custo de Storage</li>
                <li>• Melhor experiência UX</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2 text-sm">🔧 Configuração</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Transformações de imagem ativas</li>
                <li>• Domínio Supabase autorizado</li>
                <li>• Cache TTL: 1 ano</li>
                <li>• Formatos: WebP + AVIF</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
