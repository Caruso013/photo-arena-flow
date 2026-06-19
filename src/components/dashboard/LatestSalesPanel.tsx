import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Camera, Download, Mail } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { downloadMultiplePhotos, downloadOriginalPhoto } from '@/lib/photoDownload';
import { toast } from 'sonner';
import type { ActivityItem } from './RecentActivity';

interface LatestSalesPanelProps {
  sales: ActivityItem[];
  title?: string;
  emptyMessage?: string;
  maxItems?: number;
}

const getInitials = (name: string) => {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return 'CL';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

export default function LatestSalesPanel({
  sales,
  title = 'Últimas Vendas',
  emptyMessage = 'Nenhuma venda recente',
  maxItems = 5,
}: LatestSalesPanelProps) {
  const [selectedSale, setSelectedSale] = useState<ActivityItem | null>(null);
  const displayedSales = sales.slice(0, maxItems);

  const handleDownloadSalePhoto = async (sale: ActivityItem) => {
    const photos = sale.photos || [];
    const downloadablePhotos = photos
      .map((photo) => ({
        photo_id: photo.id || '',
        photo_url: photo.original_url || photo.watermarked_url || photo.thumbnail_url || '',
      }))
      .filter((photo) => Boolean(photo.photo_id && photo.photo_url));

    try {
      if (downloadablePhotos.length > 1) {
        await downloadMultiplePhotos(downloadablePhotos, sale.title || 'cliente');
        return;
      }

      const singleUrl = downloadablePhotos[0]?.photo_url || sale.photos?.[0]?.original_url || sale.photoUrl;
      const singleId = downloadablePhotos[0]?.photo_id || sale.photoId || sale.id;

      if (!singleUrl) {
        toast.error('Foto indisponível para download');
        return;
      }

      await downloadOriginalPhoto(singleUrl, `${sale.title.replace(/\s+/g, '_')}_${singleId}.jpg`);
    } catch (error) {
      console.error('Erro ao baixar foto da venda:', error);
      toast.error('Não foi possível baixar a foto');
    }
  };

  return (
    <>
      <Card className="rounded-3xl border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          {displayedSales.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              <Camera className="mx-auto mb-3 h-10 w-10 opacity-50" />
              <p>{emptyMessage}</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {displayedSales.map((sale) => (
                <button
                  key={`${sale.id}-${sale.photoCount || 1}`}
                  type="button"
                  className="w-full rounded-lg border-b px-1 py-4 text-left transition-colors hover:bg-muted/20"
                  onClick={() => setSelectedSale(sale)}
                >
                  <p className="text-sm text-muted-foreground">
                    {(sale.photoCount || 1) > 1 ? `${sale.photoCount} vendas no mesmo horário` : sale.description}
                  </p>
                  <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-medium">
                        {getInitials(sale.title)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-base font-medium sm:text-lg">{sale.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {new Date(sale.timestamp).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-end justify-between gap-3 rounded-xl bg-muted/20 px-3 py-2 sm:block sm:rounded-none sm:bg-transparent sm:px-0 sm:py-0 sm:text-right">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground sm:hidden">Valor</p>
                        <p className="text-xl font-semibold text-[#B8860B] sm:text-2xl">{formatCurrency(sale.amount || 0)}</p>
                      </div>
                      <div className="text-right sm:text-inherit">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground sm:hidden">Mídias</p>
                        <p className="mt-1 text-sm text-muted-foreground">Mídias: {sale.photoCount || 1}</p>
                      </div>
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
              <div className="overflow-hidden rounded-xl border bg-muted/30">
                {selectedSale.photos && selectedSale.photos.length > 0 ? (
                  <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto p-2">
                    {selectedSale.photos.map((photo, index) => (
                      <div key={`${photo.id || photo.title}-${index}`} className="overflow-hidden rounded-lg border bg-background">
                        {photo.thumbnail_url || photo.watermarked_url ? (
                          <img
                            src={photo.thumbnail_url || photo.watermarked_url}
                            alt={photo.title}
                            className="h-28 w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-28 w-full items-center justify-center text-xs text-muted-foreground">
                            Sem preview
                          </div>
                        )}
                        <div className="px-2 py-1">
                          <p className="truncate text-xs text-muted-foreground">{photo.title || 'Foto comprada'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-56 w-full items-center justify-center text-sm text-muted-foreground">
                    Foto não disponível
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Cliente</p>
                <p className="text-lg font-semibold">{selectedSale.title}</p>
              </div>

              <Button type="button" className="w-full" onClick={() => handleDownloadSalePhoto(selectedSale)}>
                <Download className="mr-2 h-4 w-4" />
                {(selectedSale.photos?.length || 0) > 1 ? 'Baixar fotos' : 'Baixar foto'}
              </Button>

              <div className="space-y-3 rounded-xl border bg-muted/20 p-3">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedSale.buyerEmail || 'E-mail não informado'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground">Valor</p>
                  <p className="font-semibold text-[#B8860B]">{formatCurrency(selectedSale.amount || 0)}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground">Vendas agrupadas</p>
                  <p className="font-semibold">{selectedSale.photoCount || 1}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
