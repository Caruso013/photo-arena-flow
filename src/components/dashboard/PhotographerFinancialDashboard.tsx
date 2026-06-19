import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { downloadMultiplePhotos, downloadOriginalPhoto } from '@/lib/photoDownload';
import { usePhotographerBalance } from '@/hooks/usePhotographerBalance';
import { useSalesData } from '@/hooks/useSalesData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  HelpCircle,
  Eye,
  EyeOff,
  Download,
  Mail,
  Phone,
  Wallet,
  Clock,
  Search,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

type PayoutStatus = 'pending' | 'approved' | 'completed' | 'rejected';

interface PayoutHistoryItem {
  id: string;
  amount: number;
  status: PayoutStatus;
  requested_at: string;
}

interface LatestSaleItem {
  id: string;
  buyer_id: string;
  photo_id: string;
  amount: number;
  created_at: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string | null;
  photo_title: string;
  photo_url: string | null;
  photo_download_url: string | null;
  media_count: number;
  photos: Array<{
    photo_id: string;
    title: string;
    preview_url: string | null;
    download_url: string | null;
  }>;
}

interface GroupedSaleItem extends LatestSaleItem {
  purchase_ids: string[];
}

const PERIOD_OPTIONS = [
  { label: '30 dias', value: 30 },
  { label: '90 dias', value: 90 },
  { label: '180 dias', value: 180 },
];

const DONUT_COLORS = ['#D4AF37', '#F4D03F'];

const getInitials = (name: string) => {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return 'CL';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const statusLabel: Record<PayoutStatus, string> = {
  pending: 'Pendente',
  approved: 'Aprovado',
  completed: 'Concluído',
  rejected: 'Recusado',
};

const statusClass: Record<PayoutStatus, string> = {
  pending: 'bg-amber-100 text-amber-800 border-amber-300',
  approved: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  completed: 'bg-amber-100 text-amber-800 border-amber-300',
  rejected: 'bg-rose-100 text-rose-700 border-rose-200',
};

const PhotographerFinancialDashboard = () => {
  const { user } = useAuth();
  const balance = usePhotographerBalance();
  const [selectedPeriod, setSelectedPeriod] = useState(30);
  const salesData = useSalesData(selectedPeriod);
  const [showBalance, setShowBalance] = useState(true);
  const [salesSearch, setSalesSearch] = useState('');

  const [payouts, setPayouts] = useState<PayoutHistoryItem[]>([]);
  const [sales, setSales] = useState<LatestSaleItem[]>([]);
  const [loadingLists, setLoadingLists] = useState(true);
  const [payoutYear, setPayoutYear] = useState('all');
  const [salesYear, setSalesYear] = useState('all');
  const [selectedSale, setSelectedSale] = useState<GroupedSaleItem | null>(null);

  const totalRevenuePeriod = useMemo(
    () => salesData.data.reduce((sum, item) => sum + item.revenue, 0),
    [salesData.data],
  );

  useEffect(() => {
    const fetchFinancialLists = async () => {
      if (!user?.id) {
        setPayouts([]);
        setSales([]);
        return;
      }

      try {
        setLoadingLists(true);

        const [payoutRes, purchaseRes] = await Promise.all([
          supabase
            .from('payout_requests')
            .select('id, amount, status, requested_at')
            .eq('photographer_id', user.id)
            .order('requested_at', { ascending: false })
            .limit(50),
          supabase
            .from('purchases')
            .select('id, amount, created_at, buyer_id, photo_id')
            .eq('photographer_id', user.id)
            .eq('status', 'completed')
            .order('created_at', { ascending: false })
            .limit(100),
        ]);

        if (payoutRes.error) throw payoutRes.error;
        if (purchaseRes.error) throw purchaseRes.error;

        const purchases = purchaseRes.data || [];
        const buyerIds = [...new Set(purchases.map((p) => p.buyer_id).filter(Boolean))];
        const photoIds = [...new Set(purchases.map((p) => p.photo_id).filter(Boolean))];

        const [profilesRes, photosRes] = await Promise.all([
          buyerIds.length
            ? supabase.from('profiles').select('id, full_name, email').in('id', buyerIds)
            : Promise.resolve({ data: [] as any[], error: null }),
          photoIds.length
            ? supabase
                .from('photos')
                .select('id, title, original_url, thumbnail_url, watermarked_url')
                .in('id', photoIds)
            : Promise.resolve({ data: [] as any[], error: null }),
        ]);

        if (profilesRes.error) throw profilesRes.error;
        if (photosRes.error) throw photosRes.error;

        const profileMap = new Map(
          (profilesRes.data || []).map((p: any) => [
            p.id,
            {
              full_name: p.full_name || 'Cliente',
              email: p.email || 'Não informado',
            },
          ]),
        );

        const photoMap = new Map(
          (photosRes.data || []).map((photo: any) => [
            photo.id,
            {
              title: photo.title || 'Foto comprada',
              previewUrl: photo.thumbnail_url || photo.watermarked_url || photo.original_url || null,
              downloadUrl: photo.original_url || photo.watermarked_url || null,
            },
          ]),
        );

        setPayouts((payoutRes.data || []) as PayoutHistoryItem[]);
        setSales(
          purchases.map((purchase) => ({
            id: String(purchase.id),
            buyer_id: String(purchase.buyer_id || ''),
            photo_id: String(purchase.photo_id || ''),
            amount: Number(purchase.amount || 0),
            created_at: purchase.created_at,
            buyer_name: profileMap.get(purchase.buyer_id)?.full_name || 'Cliente',
            buyer_email: profileMap.get(purchase.buyer_id)?.email || 'Não informado',
            buyer_phone: null,
            photo_title: photoMap.get(purchase.photo_id)?.title || 'Foto comprada',
            photo_url: photoMap.get(purchase.photo_id)?.previewUrl || null,
            photo_download_url: photoMap.get(purchase.photo_id)?.downloadUrl || null,
            media_count: 1,
            photos: [
              {
                photo_id: String(purchase.photo_id || ''),
                title: photoMap.get(purchase.photo_id)?.title || 'Foto comprada',
                preview_url: photoMap.get(purchase.photo_id)?.previewUrl || null,
                download_url: photoMap.get(purchase.photo_id)?.downloadUrl || null,
              },
            ],
          })),
        );
      } catch (error) {
        console.error('Erro ao carregar dados financeiros:', error);
        toast.error('Erro ao carregar dados do financeiro');
      } finally {
        setLoadingLists(false);
      }
    };

    fetchFinancialLists();
  }, [user?.id]);

  const payoutYears = useMemo(() => {
    const years = Array.from(
      new Set(payouts.map((p) => new Date(p.requested_at).getFullYear()).filter(Boolean)),
    ).sort((a, b) => b - a);
    return years;
  }, [payouts]);

  const salesYears = useMemo(() => {
    const years = Array.from(
      new Set(sales.map((s) => new Date(s.created_at).getFullYear()).filter(Boolean)),
    ).sort((a, b) => b - a);
    return years;
  }, [sales]);

  const filteredPayouts = useMemo(() => {
    return payouts.filter((payout) => {
      const year = new Date(payout.requested_at).getFullYear().toString();
      return payoutYear === 'all' || payoutYear === year;
    });
  }, [payouts, payoutYear]);

  const groupedSales = useMemo(() => {
    const salesInYear = sales.filter((sale) => {
      const year = new Date(sale.created_at).getFullYear().toString();
      return salesYear === 'all' || salesYear === year;
    });

    const groups = new Map<string, GroupedSaleItem>();

    salesInYear.forEach((sale) => {
      const minuteBucket = sale.created_at.slice(0, 16);
      const key = `${sale.buyer_id || sale.buyer_email || sale.buyer_name}|${minuteBucket}`;

      if (!groups.has(key)) {
        groups.set(key, {
          ...sale,
          purchase_ids: [sale.id],
        });
        return;
      }

      const existing = groups.get(key)!;
      existing.amount += sale.amount;
      existing.media_count += sale.media_count;
      existing.purchase_ids.push(sale.id);

      if (!existing.photo_url && sale.photo_url) {
        existing.photo_url = sale.photo_url;
      }
      if (!existing.photo_download_url && sale.photo_download_url) {
        existing.photo_download_url = sale.photo_download_url;
      }

      sale.photos.forEach((photo) => {
        if (!photo.photo_id) return;
        if (!existing.photos.some((p) => p.photo_id === photo.photo_id)) {
          existing.photos.push(photo);
        }
      });
    });

    return Array.from(groups.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [sales, salesYear]);

  const filteredSales = useMemo(() => {
    const query = salesSearch.trim().toLowerCase();
    if (!query) return groupedSales;

    return groupedSales.filter((sale) => {
      const ids = sale.purchase_ids.join(' ').toLowerCase();
      return ids.includes(query) || sale.buyer_name.toLowerCase().includes(query);
    });
  }, [groupedSales, salesSearch]);

  const photosRevenue = totalRevenuePeriod;

  const donutData = [{ name: 'Fotos', value: photosRevenue }];

  const exportSales = () => {
    if (filteredSales.length === 0) {
      toast.error('Nenhuma venda para exportar');
      return;
    }

    const rows = filteredSales.map((sale) => ({
      IDs: sale.purchase_ids.map((id) => `#${id}`).join(' | '),
      Comprador: sale.buyer_name,
      VendasAgrupadas: sale.purchase_ids.length,
      Valor: sale.amount,
      Midias: sale.media_count,
      Data: new Date(sale.created_at).toLocaleString('pt-BR'),
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Vendas');
    XLSX.writeFile(wb, `vendas-fotografo-${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Vendas exportadas com sucesso');
  };

  const handleDownloadSalePhoto = async (sale: GroupedSaleItem) => {
    const downloadablePhotos = sale.photos
      .map((photo) => ({
        photo_id: photo.photo_id,
        photo_url: photo.download_url || photo.preview_url || '',
      }))
      .filter((photo) => Boolean(photo.photo_id && photo.photo_url));

    if (!downloadablePhotos.length) {
      toast.error('Foto indisponível para download');
      return;
    }

    try {
      if (downloadablePhotos.length === 1) {
        const safeName = (sale.photo_title || 'foto')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');

        await downloadOriginalPhoto(
          downloadablePhotos[0].photo_url,
          `${safeName || 'foto'}-${downloadablePhotos[0].photo_id}.jpg`,
        );
      } else {
        await downloadMultiplePhotos(downloadablePhotos, sale.buyer_name || 'cliente');
      }
    } catch (error) {
      console.error('Erro ao baixar foto da venda:', error);
      toast.error('Não foi possível baixar a foto');
    }
  };

  if (balance.loading && salesData.loading && loadingLists) {
    return (
      <div className="space-y-4 pb-28 md:pb-0">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-80 rounded-3xl" />
        <Skeleton className="h-96 rounded-3xl" />
        <Skeleton className="h-96 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-28 md:pb-0">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold text-foreground">Financeiro</h1>
        <HelpCircle className="h-5 w-5 text-muted-foreground" />
      </div>

      <Card className="rounded-3xl border">
        <CardContent className="p-4 sm:p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">Carteira</h2>
              <HelpCircle className="h-5 w-5 text-muted-foreground" />
            </div>
            <Select value="BRL">
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Real (R$)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BRL">Real (R$)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <p className="text-muted-foreground text-base">Saldo disponível</p>
            <div className="mt-1 flex items-center gap-3">
              <p className="text-4xl sm:text-5xl font-bold text-[#B8860B] leading-tight">
                {showBalance ? formatCurrency(balance.availableAmount) : 'R$ •••••'}
              </p>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10"
                onClick={() => setShowBalance((prev) => !prev)}
              >
                {showBalance ? <Eye className="h-6 w-6" /> : <EyeOff className="h-6 w-6" />}
              </Button>
            </div>
          </div>

          <div className="h-px bg-border" />

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="rounded-xl border p-3">
                <Wallet className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-muted-foreground text-base">Ganhos no mês</p>
                <p className="text-3xl font-semibold">{formatCurrency(photosRevenue)}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="rounded-xl border p-3">
                <Clock className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-muted-foreground text-base">A receber</p>
                <p className="text-3xl font-semibold">{formatCurrency(balance.pendingAmount)}</p>
              </div>
            </div>
          </div>

          <Button asChild className="w-full h-12 text-lg rounded-xl bg-[#D4AF37] text-black hover:bg-[#C19B2D]">
            <Link to="/dashboard/photographer/payout">Efetuar saque</Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-3xl border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Faturamento por mídia</CardTitle>
            <Select value={String(selectedPeriod)} onValueChange={(v) => setSelectedPeriod(Number(v))}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={String(option.value)}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={donutData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={70} outerRadius={110}>
                  {donutData.map((entry, index) => (
                    <Cell key={`cell-${entry.name}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 text-base text-muted-foreground -mt-2">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#D4AF37]" />
              <span>Fotos: {formatCurrency(photosRevenue)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Últimos saques</h2>
        <Button asChild variant="link" className="text-[#B8860B] text-base p-0 h-auto">
          <Link to="/dashboard/photographer/payout">Ver tudo</Link>
        </Button>
      </div>

      <Card className="rounded-3xl border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Saques</CardTitle>
            <Select value={payoutYear} onValueChange={setPayoutYear}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {payoutYears.map((year) => (
                  <SelectItem key={year} value={String(year)}>{String(year)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loadingLists ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, idx) => (
                <Skeleton key={idx} className="h-20 rounded-xl" />
              ))}
            </div>
          ) : filteredPayouts.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground text-xl">Nenhum saque encontrado</div>
          ) : (
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {filteredPayouts.map((payout) => (
                <div key={payout.id} className="grid grid-cols-[1.3fr_0.9fr_0.8fr] items-center gap-3 border-b py-4">
                  <p className="text-sm text-muted-foreground">
                    {new Date(payout.requested_at).toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  <Badge variant="outline" className={`w-fit text-base ${statusClass[payout.status] || ''}`}>
                    {statusLabel[payout.status] || 'Pendente'}
                  </Badge>
                  <p className="text-right text-lg font-semibold">{formatCurrency(payout.amount)}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <h2 className="text-2xl font-semibold">Últimas vendas</h2>

      <Card className="rounded-3xl border">
        <CardContent className="p-5 sm:p-6 space-y-4">
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">Ano</p>
            <Select value={salesYear} onValueChange={setSalesYear}>
              <SelectTrigger className="h-11 text-base">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {salesYears.map((year) => (
                  <SelectItem key={year} value={String(year)}>{String(year)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              className="h-11 pl-11 text-base"
              placeholder="Busque pelo ID da compra..."
              value={salesSearch}
              onChange={(e) => setSalesSearch(e.target.value)}
            />
          </div>

          <Button variant="outline" className="w-full h-11 text-base" onClick={exportSales}>
            Exportar Vendas
          </Button>

          {loadingLists ? (
            <div className="space-y-3 pt-2">
              {[...Array(4)].map((_, idx) => (
                <Skeleton key={idx} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : filteredSales.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground text-xl">Nenhuma venda encontrada</div>
          ) : (
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {filteredSales.map((sale) => (
                <button
                  key={`${sale.id}-${sale.purchase_ids.length}`}
                  type="button"
                  className="border-b py-4 w-full text-left hover:bg-muted/20 rounded-lg px-1"
                  onClick={() => setSelectedSale(sale)}
                >
                  <p className="text-sm text-muted-foreground">
                    {sale.purchase_ids.length > 1
                      ? `${sale.purchase_ids.length} vendas no mesmo horário`
                      : `#${sale.id}`}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                        {getInitials(sale.buyer_name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-lg font-medium truncate">{sale.buyer_name}</p>
                        <p className="text-sm mt-1 text-muted-foreground">
                          {new Date(sale.created_at).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-semibold text-[#B8860B]">{formatCurrency(sale.amount)}</p>
                      <p className="text-sm text-muted-foreground mt-1">Mídias: {sale.media_count}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedSale} onOpenChange={(open) => !open && setSelectedSale(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da venda</DialogTitle>
            <DialogDescription>Informações da compra selecionada</DialogDescription>
          </DialogHeader>

          {selectedSale && (
            <div className="space-y-4">
              <div className="rounded-xl border overflow-hidden bg-muted/30">
                {selectedSale.photos.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2 p-2 max-h-64 overflow-y-auto">
                    {selectedSale.photos.map((photo, index) => (
                      <div key={`${photo.photo_id}-${index}`} className="rounded-lg overflow-hidden border bg-background">
                        {photo.preview_url ? (
                          <img
                            src={photo.preview_url}
                            alt={photo.title}
                            className="w-full h-28 object-cover"
                          />
                        ) : (
                          <div className="w-full h-28 flex items-center justify-center text-muted-foreground text-xs">
                            Sem preview
                          </div>
                        )}
                        <div className="px-2 py-1">
                          <p className="text-xs truncate text-muted-foreground">{photo.title}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="w-full h-56 flex items-center justify-center text-muted-foreground text-sm">
                    Foto não disponível
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Cliente</p>
                <p className="font-semibold text-lg">{selectedSale.buyer_name}</p>
              </div>

              <Button
                type="button"
                className="w-full"
                onClick={() => handleDownloadSalePhoto(selectedSale)}
              >
                <Download className="h-4 w-4 mr-2" />
                {selectedSale.photos.length > 1 ? 'Baixar fotos' : 'Baixar foto'}
              </Button>

              <div className="space-y-3 rounded-xl border p-3 bg-muted/20">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedSale.buyer_email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedSale.buyer_phone || 'Telefone não disponível no cadastro da compra'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground">Valor</p>
                  <p className="font-semibold text-[#B8860B]">{formatCurrency(selectedSale.amount)}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground">Vendas agrupadas</p>
                  <p className="font-semibold">
                    {selectedSale.purchase_ids.length}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PhotographerFinancialDashboard;