import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, DollarSign, TrendingUp, Building2, Filter, ArrowUpDown, Download } from 'lucide-react';

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

type SortField = 'total_revenue' | 'sales_count' | 'platform_revenue' | 'campaign_title';
type SortDir = 'asc' | 'desc';

export const AdminEventRevenue = () => {
  const [data, setData] = useState<EventRevenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [orgFilter, setOrgFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('total_revenue');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  useEffect(() => {
    fetchRevenue();
  }, []);

  const fetchRevenue = async () => {
    try {
      setLoading(true);

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

      let allPhotos: any[] = [];
      for (let i = 0; i < photoIds.length; i += 500) {
        const chunk = photoIds.slice(i, i + 500);
        const { data: photos } = await supabase.from('photos').select('id, campaign_id').in('id', chunk);
        allPhotos = [...allPhotos, ...(photos || [])];
      }
      const photoCampaignMap = new Map(allPhotos.map(p => [p.id, p.campaign_id]));

      const campaignIds = [...new Set(allPhotos.map(p => p.campaign_id))];
      let allCampaigns: any[] = [];
      for (let i = 0; i < campaignIds.length; i += 500) {
        const chunk = campaignIds.slice(i, i + 500);
        const { data: campaigns } = await supabase.from('campaigns').select('id, title, organization_id').in('id', chunk);
        allCampaigns = [...allCampaigns, ...(campaigns || [])];
      }
      const campaignMap = new Map(allCampaigns.map(c => [c.id, c]));

      const orgIds = [...new Set(allCampaigns.map(c => c.organization_id).filter(Boolean))];
      let orgs: any[] = [];
      if (orgIds.length > 0) {
        const { data } = await supabase.from('organizations').select('id, name').in('id', orgIds);
        orgs = data || [];
      }
      const orgMap = new Map(orgs.map(o => [o.id, o.name]));

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

      setData(Object.values(revenueMap));
    } catch (err) {
      console.error('Error fetching revenue:', err);
      toast({ title: 'Erro ao carregar receita por evento', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const organizations = useMemo(() => {
    const names = new Set(data.map(d => d.organization_name).filter(Boolean) as string[]);
    return [...names].sort();
  }, [data]);

  const filtered = useMemo(() => {
    let result = data;

    if (orgFilter !== 'all') {
      if (orgFilter === 'none') {
        result = result.filter(d => !d.organization_name);
      } else {
        result = result.filter(d => d.organization_name === orgFilter);
      }
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(d =>
        d.campaign_title.toLowerCase().includes(term) ||
        (d.organization_name || '').toLowerCase().includes(term)
      );
    }

    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'campaign_title') {
        cmp = a.campaign_title.localeCompare(b.campaign_title);
      } else {
        cmp = (a[sortField] as number) - (b[sortField] as number);
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [data, orgFilter, searchTerm, sortField, sortDir]);

  const totals = useMemo(() => filtered.reduce(
    (acc, d) => ({
      revenue: acc.revenue + d.total_revenue,
      platform: acc.platform + d.platform_revenue,
      photographer: acc.photographer + d.photographer_revenue,
      organization: acc.organization + d.organization_revenue,
      sales: acc.sales + d.sales_count,
    }),
    { revenue: 0, platform: 0, photographer: 0, organization: 0, sales: 0 }
  ), [filtered]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => (
    <ArrowUpDown className={`inline h-3 w-3 ml-1 cursor-pointer ${sortField === field ? 'text-primary' : 'text-muted-foreground/50'}`} />
  );

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">Receita Total</p>
                <p className="text-lg font-bold">{formatCurrency(totals.revenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">Lucro Plataforma</p>
                <p className="text-lg font-bold">{formatCurrency(totals.platform)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">Repasse Fotógrafos</p>
                <p className="text-lg font-bold">{formatCurrency(totals.photographer)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Building2 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">Repasse Organizações</p>
                <p className="text-lg font-bold">{formatCurrency(totals.organization)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-muted-foreground" />
              <span>Receita por Evento</span>
            </div>
            <Badge variant="secondary" className="text-sm">
              {filtered.length} eventos — {totals.sales} vendas
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filter Row */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar evento..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={orgFilter} onValueChange={setOrgFilter}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="Organização" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas organizações</SelectItem>
                <SelectItem value="none">Sem organização</SelectItem>
                {organizations.map(org => (
                  <SelectItem key={org} value={org}>{org}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">Nenhum evento encontrado.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('campaign_title')}>
                      Evento <SortIcon field="campaign_title" />
                    </TableHead>
                    <TableHead>Organização</TableHead>
                    <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort('sales_count')}>
                      Vendas <SortIcon field="sales_count" />
                    </TableHead>
                    <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort('total_revenue')}>
                      Receita Bruta <SortIcon field="total_revenue" />
                    </TableHead>
                    <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort('platform_revenue')}>
                      Plataforma <SortIcon field="platform_revenue" />
                    </TableHead>
                    <TableHead className="text-right">Fotógrafo</TableHead>
                    <TableHead className="text-right">Organização</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(row => (
                    <TableRow key={row.campaign_id} className="hover:bg-muted/20">
                      <TableCell className="font-medium max-w-[250px] truncate">{row.campaign_title}</TableCell>
                      <TableCell>
                        {row.organization_name ? (
                          <Badge variant="outline" className="text-xs font-normal">{row.organization_name}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{row.sales_count}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{formatCurrency(row.total_revenue)}</TableCell>
                      <TableCell className="text-right text-green-600 dark:text-green-400 tabular-nums">{formatCurrency(row.platform_revenue)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(row.photographer_revenue)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(row.organization_revenue)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold border-t-2 bg-muted/40">
                    <TableCell>TOTAL</TableCell>
                    <TableCell />
                    <TableCell className="text-right tabular-nums">{totals.sales}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(totals.revenue)}</TableCell>
                    <TableCell className="text-right text-green-600 dark:text-green-400 tabular-nums">{formatCurrency(totals.platform)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(totals.photographer)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(totals.organization)}</TableCell>
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
