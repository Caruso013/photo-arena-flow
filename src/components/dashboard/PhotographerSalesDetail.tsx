import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

interface SaleRecord {
  id: string;
  amount: number;
  progressive_discount_amount: number | null;
  created_at: string;
  photo_title: string;
  photo_watermarked_url: string | null;
  campaign_title: string;
  buyer_name: string;
}

interface PhotographerSalesDetailProps {
  photographerId: string;
  photographerName: string;
  open: boolean;
  onClose: () => void;
}

const PAGE_SIZE = 50;

const PhotographerSalesDetail = ({ photographerId, photographerName, open, onClose }: PhotographerSalesDetailProps) => {
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (open) {
      setSales([]);
      setPage(0);
      setHasMore(true);
      fetchSales(0);
    }
  }, [open, photographerId]);

  const fetchSales = async (pageNum: number) => {
    try {
      setLoading(true);

      const from = pageNum * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data: purchases, error } = await supabase
        .from('purchases')
        .select('id, amount, progressive_discount_amount, created_at, photo_id, buyer_id')
        .eq('photographer_id', photographerId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      if (!purchases || purchases.length === 0) {
        setHasMore(false);
        return;
      }

      setHasMore(purchases.length === PAGE_SIZE);

      // Resolve photo + campaign titles
      const photoIds = [...new Set(purchases.map(p => p.photo_id))];
      const buyerIds = [...new Set(purchases.map(p => p.buyer_id))];

      const [photosRes, profilesRes] = await Promise.all([
        supabase.from('photos').select('id, title, campaign_id, watermarked_url').in('id', photoIds),
        supabase.from('profiles').select('id, full_name').in('id', buyerIds),
      ]);

      const photoMap = new Map<string, { id: string; title: string | null; campaign_id: string; watermarked_url: string }>(
        photosRes.data?.map(p => [p.id, p]) || []
      );
      const profileMap = new Map<string, { id: string; full_name: string | null }>(
        profilesRes.data?.map(p => [p.id, p]) || []
      );

      // Get campaign titles
      const campaignIds = [...new Set(photosRes.data?.map(p => p.campaign_id).filter(Boolean) || [])];
      let campaignData: { id: string; title: string }[] = [];
      if (campaignIds.length > 0) {
        const res = await supabase.from('campaigns').select('id, title').in('id', campaignIds);
        campaignData = (res.data as { id: string; title: string }[]) || [];
      }
      const campaignMap = new Map<string, { id: string; title: string }>(campaignData.map(c => [c.id, c]));

      const records: SaleRecord[] = purchases.map(p => {
        const photo = photoMap.get(p.photo_id);
        return {
          id: p.id,
          amount: p.amount,
          progressive_discount_amount: p.progressive_discount_amount,
          created_at: p.created_at,
          photo_title: photo?.title || '—',
          photo_watermarked_url: photo?.watermarked_url || null,
          campaign_title: photo ? (campaignMap.get(photo.campaign_id)?.title || '—') : '—',
          buyer_name: profileMap.get(p.buyer_id)?.full_name || 'Desconhecido',
        };
      });

      setSales(prev => pageNum === 0 ? records : [...prev, ...records]);
    } catch (error) {
      console.error('Error fetching sales:', error);
      toast.error('Erro ao carregar vendas');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchSales(nextPage);
  };

  const exportToExcel = () => {
    const data = sales.map(s => ({
      'Evento': s.campaign_title,
      'Foto': s.photo_title,
      'Comprador': s.buyer_name,
      'Valor': s.amount,
      'Desconto': s.progressive_discount_amount || 0,
      'Data': format(new Date(s.created_at), 'dd/MM/yyyy HH:mm'),
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Vendas');
    XLSX.writeFile(wb, `vendas-${photographerName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Exportado com sucesso!');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Vendas de {photographerName}</DialogTitle>
          <DialogDescription>
            Lista completa de fotos vendidas por este fotógrafo
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-end">
          <Button onClick={exportToExcel} variant="outline" size="sm" className="gap-2" disabled={sales.length === 0}>
            <Download className="h-4 w-4" />
            Exportar Excel
          </Button>
        </div>

        <ScrollArea className="h-[55vh]">
          {loading && sales.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : sales.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Nenhuma venda encontrada
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Foto</TableHead>
                  <TableHead>Evento</TableHead>
                  <TableHead>Comprador</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {sale.photo_watermarked_url ? (
                          <img
                            src={sale.photo_watermarked_url}
                            alt={sale.photo_title}
                            className="w-20 h-20 rounded object-cover border border-border flex-shrink-0"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded bg-muted flex items-center justify-center flex-shrink-0">
                            <span className="text-xs text-muted-foreground">—</span>
                          </div>
                        )}
                        <span className="truncate max-w-[120px] text-sm">{sale.photo_title}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">{sale.campaign_title}</TableCell>
                    <TableCell>{sale.buyer_name}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-medium">{formatCurrency(sale.amount)}</span>
                        {sale.progressive_discount_amount && sale.progressive_discount_amount > 0 && (
                          <Badge variant="outline" className="text-xs text-amber-600">
                            -{formatCurrency(sale.progressive_discount_amount)}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-sm">
                      {format(new Date(sale.created_at), 'dd/MM/yyyy HH:mm')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {hasMore && sales.length > 0 && (
            <div className="flex justify-center py-4">
              <Button onClick={loadMore} variant="outline" size="sm" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Carregar mais
              </Button>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default PhotographerSalesDetail;
