import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, Search, DollarSign, TrendingUp, Building2 } from 'lucide-react';

interface EventRevenue {
  campaign_id: string;
  campaign_title: string;
  organization_name: string | null;
  total_revenue: number;
  platform_revenue: number;
  photographer_revenue: number;
  organization_revenue: number;
  sales_count: number;
}

export const AdminEventRevenue = () => {
  const [data, setData] = useState<EventRevenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchRevenue();
  }, []);

  const fetchRevenue = async () => {
    try {
      setLoading(true);

      // Get all revenue shares with purchase data
      let allShares: any[] = [];
      let page = 0;
      const pageSize = 1000;
      while (true) {
        const { data: batch, error } = await supabase
          .from('revenue_shares')
          .select('purchase_id, photographer_amount, platform_amount, organization_amount, organization_id')
          .range(page * pageSize, (page + 1) * pageSize - 1);
        if (error) throw error;
        if (!batch || batch.length === 0) break;
        allShares = [...allShares, ...batch];
        if (batch.length < pageSize) break;
        page++;
      }

      // Get completed purchases with photo mapping
      let allPurchases: any[] = [];
      page = 0;
      while (true) {
        const { data: batch, error } = await supabase
          .from('purchases')
          .select('id, photo_id, amount')
          .eq('status', 'completed')
          .range(page * pageSize, (page + 1) * pageSize - 1);
        if (error) throw error;
        if (!batch || batch.length === 0) break;
        allPurchases = [...allPurchases, ...batch];
        if (batch.length < pageSize) break;
        page++;
      }

      const purchaseMap = new Map(allPurchases.map(p => [p.id, p]));
      const photoIds = [...new Set(allPurchases.map(p => p.photo_id))];

      // Get photo -> campaign mapping
      let allPhotos: any[] = [];
      for (let i = 0; i < photoIds.length; i += 500) {
        const chunk = photoIds.slice(i, i + 500);
        const { data: photos } = await supabase.from('photos').select('id, campaign_id').in('id', chunk);
        allPhotos = [...allPhotos, ...(photos || [])];
      }
      const photoCampaignMap = new Map(allPhotos.map(p => [p.id, p.campaign_id]));

      // Get campaigns
      const campaignIds = [...new Set(allPhotos.map(p => p.campaign_id))];
      let allCampaigns: any[] = [];
      for (let i = 0; i < campaignIds.length; i += 500) {
        const chunk = campaignIds.slice(i, i + 500);
        const { data: campaigns } = await supabase.from('campaigns').select('id, title, organization_id').in('id', chunk);
        allCampaigns = [...allCampaigns, ...(campaigns || [])];
      }
      const campaignMap = new Map(allCampaigns.map(c => [c.id, c]));

      // Get organizations
      const orgIds = [...new Set(allCampaigns.map(c => c.organization_id).filter(Boolean))];
      let orgs: any[] = [];
      if (orgIds.length > 0) {
        const { data } = await supabase.from('organizations').select('id, name').in('id', orgIds);
        orgs = data || [];
      }
      const orgMap = new Map(orgs.map(o => [o.id, o.name]));

      // Aggregate by campaign
      const revenueMap: Record<string, EventRevenue> = {};

      for (const share of allShares) {
        const purchase = purchaseMap.get(share.purchase_id);
        if (!purchase) continue;

        const campaignId = photoCampaignMap.get(purchase.photo_id);
        if (!campaignId) continue;

        const campaign = campaignMap.get(campaignId);
        if (!campaign) continue;

        if (!revenueMap[campaignId]) {
          revenueMap[campaignId] = {
            campaign_id: campaignId,
            campaign_title: campaign.title,
            organization_name: campaign.organization_id ? orgMap.get(campaign.organization_id) || null : null,
            total_revenue: 0,
            platform_revenue: 0,
            photographer_revenue: 0,
            organization_revenue: 0,
            sales_count: 0,
          };
        }

        const entry = revenueMap[campaignId];
        entry.total_revenue += Number(purchase.amount);
        entry.platform_revenue += Number(share.platform_amount);
        entry.photographer_revenue += Number(share.photographer_amount);
        entry.organization_revenue += Number(share.organization_amount);
        entry.sales_count += 1;
      }

      const sorted = Object.values(revenueMap).sort((a, b) => b.total_revenue - a.total_revenue);
      setData(sorted);
    } catch (err) {
      console.error('Error fetching revenue:', err);
      toast({ title: 'Erro ao carregar receita por evento', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const filtered = searchTerm.trim()
    ? data.filter(d =>
        d.campaign_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.organization_name || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
    : data;

  const totals = filtered.reduce(
    (acc, d) => ({
      revenue: acc.revenue + d.total_revenue,
      platform: acc.platform + d.platform_revenue,
      photographer: acc.photographer + d.photographer_revenue,
      organization: acc.organization + d.organization_revenue,
      sales: acc.sales + d.sales_count,
    }),
    { revenue: 0, platform: 0, photographer: 0, organization: 0, sales: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Receita Total</p>
                <p className="text-xl font-bold">{formatCurrency(totals.revenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Lucro Plataforma (STA)</p>
                <p className="text-xl font-bold">{formatCurrency(totals.platform)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Repasse Fotógrafos</p>
                <p className="text-xl font-bold">{formatCurrency(totals.photographer)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Building2 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Repasse Organizações</p>
                <p className="text-xl font-bold">{formatCurrency(totals.organization)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between flex-wrap gap-4">
            <span>Receita por Evento</span>
            <Badge variant="secondary" className="text-base">
              {filtered.length} eventos — {totals.sales} vendas
            </Badge>
          </CardTitle>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar evento ou organização..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">Nenhum evento com vendas encontrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Evento</TableHead>
                    <TableHead>Organização</TableHead>
                    <TableHead className="text-right">Vendas</TableHead>
                    <TableHead className="text-right">Receita Bruta</TableHead>
                    <TableHead className="text-right">Plataforma</TableHead>
                    <TableHead className="text-right">Fotógrafo</TableHead>
                    <TableHead className="text-right">Organização</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(row => (
                    <TableRow key={row.campaign_id}>
                      <TableCell className="font-medium max-w-[250px] truncate">{row.campaign_title}</TableCell>
                      <TableCell className="text-muted-foreground">{row.organization_name || '—'}</TableCell>
                      <TableCell className="text-right">{row.sales_count}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(row.total_revenue)}</TableCell>
                      <TableCell className="text-right text-green-600 dark:text-green-400">{formatCurrency(row.platform_revenue)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.photographer_revenue)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.organization_revenue)}</TableCell>
                    </TableRow>
                  ))}
                  {/* Totals row */}
                  <TableRow className="font-bold border-t-2">
                    <TableCell>TOTAL</TableCell>
                    <TableCell />
                    <TableCell className="text-right">{totals.sales}</TableCell>
                    <TableCell className="text-right">{formatCurrency(totals.revenue)}</TableCell>
                    <TableCell className="text-right text-green-600 dark:text-green-400">{formatCurrency(totals.platform)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(totals.photographer)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(totals.organization)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
