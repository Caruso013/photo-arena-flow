import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SalesData {
  date: string;
  sales: number;
  revenue: number;
  photos: number;
}

export const useSalesData = (days: number = 30, photographerId?: string) => {
  const { user, profile } = useAuth();
  const [data, setData] = useState<SalesData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSalesData();
  }, [days, photographerId, user, profile]);

  // Helper para paginação (evitar limite de 1000 registros do Supabase)
  const fetchAllFromTable = async (buildQuery: (from: number, to: number) => any) => {
    const PAGE_SIZE = 1000;
    let all: any[] = [];
    let from = 0;
    while (true) {
      const { data, error } = await buildQuery(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      all = [...all, ...(data || [])];
      if (!data || data.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }
    return all;
  };

  const fetchSalesData = async () => {
    try {
      setLoading(true);

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const purchases = await fetchAllFromTable((from, to) => {
        let query = supabase
          .from('purchases')
          .select('created_at, amount, photo_id')
          .eq('status', 'completed')
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: true })
          .range(from, to);

        if (photographerId) {
          query = query.eq('photographer_id', photographerId);
        } else if (profile?.role === 'photographer') {
          query = query.eq('photographer_id', user?.id);
        }

        return query;
      });

      // Agrupar por dia
      const salesByDay = new Map<string, { sales: number; revenue: number; photos: Set<string> }>();

      purchases?.forEach((purchase) => {
        const date = new Date(purchase.created_at).toISOString().split('T')[0];
        
        if (!salesByDay.has(date)) {
          salesByDay.set(date, { sales: 0, revenue: 0, photos: new Set() });
        }

        const dayData = salesByDay.get(date)!;
        dayData.sales += 1;
        dayData.revenue += Number(purchase.amount);
        dayData.photos.add(purchase.photo_id);
      });

      // Converter para array e preencher dias sem vendas
      const result: SalesData[] = [];
      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (days - i - 1));
        const dateStr = date.toISOString().split('T')[0];

        const dayData = salesByDay.get(dateStr);
        result.push({
          date: dateStr,
          sales: dayData?.sales || 0,
          revenue: dayData?.revenue || 0,
          photos: dayData?.photos.size || 0,
        });
      }

      setData(result);
    } catch (error) {
      console.error('Error fetching sales data:', error);
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, refetch: fetchSalesData };
};
