import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PhotographerBalance {
  // Valores principais
  totalEarned: number;        // Soma total de photographer_amount (histórico)
  availableAmount: number;    // Disponível para saque (>12h - payouts em processo)
  pendingAmount: number;      // Em período de segurança (<12h)
  blockedAmount: number;      // Bloqueado em payouts (pending/approved)
  withdrawnAmount: number;    // Já sacado (completed)
  
  // Métricas
  totalPhotosSold: number;
  monthlySales: number;
  totalSales: number;
  conversionRate: number;
  totalPhotos: number;
  
  // Estado
  loading: boolean;
  refetch: () => Promise<void>;
}

const SECURITY_PERIOD_HOURS = 12;
const SECURITY_PERIOD_MS = SECURITY_PERIOD_HOURS * 60 * 60 * 1000;

export const usePhotographerBalance = (photographerId?: string): PhotographerBalance => {
  const { user } = useAuth();
  const effectiveId = photographerId || user?.id;
  
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState({
    totalEarned: 0,
    availableAmount: 0,
    pendingAmount: 0,
    blockedAmount: 0,
    withdrawnAmount: 0,
    totalPhotosSold: 0,
    monthlySales: 0,
    totalSales: 0,
    conversionRate: 0,
    totalPhotos: 0,
  });

  const fetchBalance = useCallback(async () => {
    if (!effectiveId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // 1. Buscar revenue_shares com status da purchase
      const { data: revenueData, error: revenueError } = await supabase
        .from('revenue_shares')
        .select('photographer_amount, purchase:purchases!inner(status, created_at)')
        .eq('photographer_id', effectiveId);

      if (revenueError) throw revenueError;

      const now = Date.now();
      let totalEarned = 0;
      let availableBeforePayouts = 0;
      let pendingAmount = 0;
      let totalPhotosSold = 0;

      // Calcular valores separando por período de segurança
      revenueData?.forEach((row: any) => {
        const amount = Number(row.photographer_amount || 0);
        const purchase = row.purchase;
        
        if (purchase?.status === 'completed') {
          totalEarned += amount;
          totalPhotosSold++;
          
          const purchaseDate = new Date(purchase.created_at).getTime();
          const hoursSinceSale = (now - purchaseDate) / SECURITY_PERIOD_MS;
          
          if (hoursSinceSale >= 1) {
            // Passou do período de segurança
            availableBeforePayouts += amount;
          } else {
            // Ainda no período de segurança
            pendingAmount += amount;
          }
        }
      });

      // 2. Buscar payout_requests
      const { data: payoutRequests, error: payoutError } = await supabase
        .from('payout_requests')
        .select('amount, status')
        .eq('photographer_id', effectiveId)
        .in('status', ['pending', 'approved', 'completed']);

      if (payoutError) throw payoutError;

      // Separar por status
      let blockedAmount = 0;  // pending + approved
      let withdrawnAmount = 0; // completed

      payoutRequests?.forEach((req) => {
        const amount = Number(req.amount || 0);
        if (req.status === 'completed') {
          withdrawnAmount += amount;
        } else {
          blockedAmount += amount;
        }
      });

      // Calcular saldo disponível final
      const availableAmount = Math.max(0, availableBeforePayouts - blockedAmount - withdrawnAmount);

      // 3. Buscar métricas adicionais
      const { count: totalPhotos } = await supabase
        .from('photos')
        .select('*', { count: 'exact', head: true })
        .eq('photographer_id', effectiveId);

      // Vendas do mês
      const firstDayOfMonth = new Date();
      firstDayOfMonth.setDate(1);
      firstDayOfMonth.setHours(0, 0, 0, 0);

      const { data: salesData } = await supabase
        .from('purchases')
        .select('created_at')
        .eq('photographer_id', effectiveId)
        .eq('status', 'completed');

      const totalSales = salesData?.length || 0;
      const monthlySales = salesData?.filter(sale => 
        new Date(sale.created_at) >= firstDayOfMonth
      ).length || 0;

      // Taxa de conversão
      const conversionRate = totalPhotos && totalPhotos > 0 
        ? ((totalSales / totalPhotos) * 100) 
        : 0;

      setBalance({
        totalEarned,
        availableAmount,
        pendingAmount,
        blockedAmount,
        withdrawnAmount,
        totalPhotosSold,
        monthlySales,
        totalSales,
        conversionRate,
        totalPhotos: totalPhotos || 0,
      });

    } catch (error) {
      console.error('Erro ao buscar saldo do fotógrafo:', error);
    } finally {
      setLoading(false);
    }
  }, [effectiveId]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return {
    ...balance,
    loading,
    refetch: fetchBalance,
  };
};
