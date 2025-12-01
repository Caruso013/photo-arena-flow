/**
 * Componente Admin: Estatísticas de Economia com CDN
 * Mostra o impacto do Vercel CDN no Cached Egress
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingDown, Zap, DollarSign, Image as ImageIcon } from 'lucide-react';
import { estimateBandwidthSavings } from '@/lib/vercelImageCdn';

export const CdnSavingsStats = () => {
  // Estimativas baseadas no uso médio
  // Ajustar conforme analytics reais
  const dailyImageViews = 5000; // 5k visualizações/dia
  const avgImageSizeKb = 50; // 50KB médio por thumbnail
  
  const savings = estimateBandwidthSavings(dailyImageViews, avgImageSizeKb);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
            Com CDN Vercel
          </CardTitle>
          <Zap className="h-4 w-4 text-yellow-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {savings.withCdn} GB/mês
          </div>
          <p className="text-xs text-muted-foreground">
            Com 90% cache hit rate
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
            Como Funciona o CDN da Vercel
          </CardTitle>
          <CardDescription>
            Otimização automática de imagens com cache global
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <h4 className="font-semibold mb-2 text-sm">✅ Benefícios</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Cache global (edge)</li>
                <li>• Compressão WebP/AVIF</li>
                <li>• Resize automático</li>
                <li>• ~90% cache hit rate</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2 text-sm">📊 Impacto</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Redução de 80-90% no Egress</li>
                <li>• Páginas 3x mais rápidas</li>
                <li>• Menos custo Supabase</li>
                <li>• Melhor experiência UX</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2 text-sm">🔧 Configuração</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• vercel.json configurado</li>
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
