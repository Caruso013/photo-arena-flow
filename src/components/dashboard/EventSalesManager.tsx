import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Search, Download } from 'lucide-react';

interface SaleRecord {
  id: string;
  amount: number;
  created_at: string;
  photo_id: string;
  buyer_id: string;
  photographer_id: string;
  progressive_discount_amount: number | null;
  photo_title: string | null;
  campaign_title: string;
  campaign_id: string;
  buyer_name: string;
  photographer_name: string;
}

const PAGE_SIZE = 50;

export const EventSalesManager = () => {
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<{ id: string; title: string }[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  useEffect(() => {
    setPage(0);
    setSales([]);
    fetchSales(0);
  }, [selectedCampaign, startDate, endDate]);

  const fetchCampaigns = async () => {
    const { data } = await supabase
      .from('campaigns')
      .select('id, title')
      .order('event_date', { ascending: false });
    setCampaigns(data || []);
  };

  const fetchSales = useCallback(async (pageNum: number) => {
    try {
      setLoading(true);

      // 1. Fetch purchases
      let query = supabase
        .from('purchases')
        .select('id, amount, created_at, photo_id, buyer_id, photographer_id, progressive_discount_amount')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

      if (startDate) query = query.gte('created_at', startDate);
      if (endDate) query = query.lte('created_at', endDate + 'T23:59:59');

      const { data: purchases, error } = await query;
      if (error) throw error;
      if (!purchases || purchases.length === 0) {
        if (pageNum === 0) setSales([]);
        setHasMore(false);
        return;
      }

      setHasMore(purchases.length === PAGE_SIZE);

      // 2. Get unique photo_ids and fetch photos + campaigns
      const photoIds = [...new Set(purchases.map(p => p.photo_id))];
      const { data: photos } = await supabase
        .from('photos')
        .select('id, title, campaign_id')
        .in('id', photoIds);

      const campaignIds = [...new Set((photos || []).map(p => p.campaign_id))];
      const { data: campaignsData } = await supabase
        .from('campaigns')
        .select('id, title')
        .in('id', campaignIds);

      // 3. Get unique user ids for buyers and photographers
      const userIds = [...new Set([
        ...purchases.map(p => p.buyer_id),
        ...purchases.map(p => p.photographer_id),
      ])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      // Build lookup maps
      const photoMap = new Map((photos || []).map(p => [p.id, p]));
      const campaignMap = new Map((campaignsData || []).map(c => [c.id, c]));
      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      // 4. Assemble records
      let records: SaleRecord[] = purchases.map(p => {
        const photo = photoMap.get(p.photo_id);
        const campaign = photo ? campaignMap.get(photo.campaign_id) : null;
        return {
          id: p.id,
          amount: p.amount,
          created_at: p.created_at,
          photo_id: p.photo_id,
          buyer_id: p.buyer_id,
          photographer_id: p.photographer_id,
          progressive_discount_amount: p.progressive_discount_amount,
          photo_title: photo?.title || '—',
          campaign_title: campaign?.title || '—',
          campaign_id: photo?.campaign_id || '',
          buyer_name: profileMap.get(p.buyer_id)?.full_name || 'Desconhecido',
          photographer_name: profileMap.get(p.photographer_id)?.full_name || 'Desconhecido',
        };
      });

      // Filter by campaign client-side (since we can't join in the initial query)
      if (selectedCampaign !== 'all') {
        records = records.filter(r => r.campaign_id === selectedCampaign);
      }

      if (pageNum === 0) {
        setSales(records);
      } else {
        setSales(prev => [...prev, ...records]);
      }
    } catch (err) {
      console.error('Error fetching sales:', err);
      toast({ title: 'Erro ao carregar vendas', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [selectedCampaign, startDate, endDate]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchSales(next);
  };

  const totalRevenue = sales.reduce((sum, s) => sum + s.amount, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between flex-wrap gap-4">
          <span>Vendas por Evento</span>
          <Badge variant="secondary" className="text-base">
            {sales.length} vendas — {formatCurrency(totalRevenue)}
          </Badge>
        </CardTitle>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mt-4">
          <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
            <SelectTrigger className="w-[260px]">
              <SelectValue placeholder="Filtrar por evento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os eventos</SelectItem>
              {campaigns.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="w-[160px]"
            placeholder="Data início"
          />
          <Input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="w-[160px]"
            placeholder="Data fim"
          />
        </div>
      </CardHeader>

      <CardContent>
        {loading && sales.length === 0 ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : sales.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">Nenhuma venda encontrada.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Evento</TableHead>
                    <TableHead>Foto</TableHead>
                    <TableHead>Comprador</TableHead>
                    <TableHead>Fotógrafo</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map(sale => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-medium max-w-[200px] truncate">{sale.campaign_title}</TableCell>
                      <TableCell className="max-w-[150px] truncate">{sale.photo_title}</TableCell>
                      <TableCell>{sale.buyer_name}</TableCell>
                      <TableCell>{sale.photographer_name}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {formatCurrency(sale.amount)}
                        {(sale.progressive_discount_amount ?? 0) > 0 && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            -{formatCurrency(sale.progressive_discount_amount!)}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {new Date(sale.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {hasMore && (
              <div className="flex justify-center mt-4">
                <Button variant="outline" onClick={loadMore} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Carregar mais
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
