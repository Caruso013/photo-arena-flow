import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Coupon {
  id: string;
  code: string;
  type: 'fixed' | 'percentage';
  value: number;
  description: string | null;
  start_date: string;
  end_date: string | null;
  max_uses: number | null;
  current_uses: number;
  min_purchase_amount: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CouponValidationResult {
  valid: boolean;
  coupon_id: string | null;
  discount_amount: number;
  message: string;
  code?: string;
}

export interface CouponStats {
  id: string;
  code: string;
  type: string;
  value: number;
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
  start_date: string;
  end_date: string | null;
  total_uses: number;
  total_discount_given: number;
  total_original_value: number;
  total_final_value: number;
  unique_users: number;
}

export function useCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCoupons((data || []) as Coupon[]);
    } catch (error: unknown) {
      const e = error as { message?: string };
      console.error('Erro ao carregar cupons:', e);
      toast({
        title: 'Erro ao carregar cupons',
        description: e.message ?? 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const createCoupon = async (couponData: Omit<Coupon, 'id' | 'created_at' | 'updated_at' | 'current_uses'>) => {
    try {
      const { data, error } = await supabase
        .from('coupons')
        .insert({
          ...couponData,
          code: couponData.code.toUpperCase().trim(),
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Cupom criado!',
        description: `Código: ${data?.code}`,
      });

      await fetchCoupons();
      return data;
    } catch (error: unknown) {
      const e = error as { message?: string };
      console.error('Erro ao criar cupom:', e);
      toast({
        title: 'Erro ao criar cupom',
        description: e.message ?? 'Erro desconhecido',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const updateCoupon = async (id: string, updates: Partial<Coupon>) => {
    try {
      const { error } = await supabase
        .from('coupons')
        .update({
          ...updates,
          code: updates.code ? updates.code.toUpperCase().trim() : undefined,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Cupom atualizado!',
      });

      await fetchCoupons();
    } catch (error: unknown) {
      const e = error as { message?: string };
      console.error('Erro ao atualizar cupom:', e);
      toast({
        title: 'Erro ao atualizar cupom',
        description: e.message ?? 'Erro desconhecido',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const deleteCoupon = async (id: string) => {
    try {
      const { error } = await supabase
        .from('coupons')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Cupom excluído!',
      });

      await fetchCoupons();
    } catch (error: unknown) {
      const e = error as { message?: string };
      console.error('Erro ao excluir cupom:', e);
      toast({
        title: 'Erro ao excluir cupom',
        description: e.message ?? 'Erro desconhecido',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const toggleCouponStatus = async (id: string, isActive: boolean) => {
    await updateCoupon(id, { is_active: isActive });
  };

  const validateCoupon = async (
    code: string,
    userId: string,
    purchaseAmount: number
  ): Promise<CouponValidationResult> => {
    try {
      const { data, error } = await supabase.rpc('validate_coupon', {
        p_code: code,
        p_user_id: userId,
        p_purchase_amount: purchaseAmount,
      });

      if (error) throw error;

      const result = Array.isArray(data)
        ? (data[0] as CouponValidationResult | undefined)
        : (data as CouponValidationResult | undefined);

      if (!result || !result.valid) {
        toast({
          title: 'Cupom inválido',
          description: result?.message ?? 'Cupom inválido',
          variant: 'destructive',
        });
        return result ?? { valid: false, coupon_id: null, discount_amount: 0, message: 'Cupom inválido' };
      } else {
        toast({
          title: 'Cupom aplicado!',
          description: `Desconto: R$ ${result.discount_amount.toFixed(2)}`,
        });
      }

      return result;
    } catch (error: unknown) {
      const e = error as { message?: string };
      console.error('Erro ao validar cupom:', e);
      toast({
        title: 'Erro ao validar cupom',
        description: e.message ?? 'Erro desconhecido',
        variant: 'destructive',
      });
      return {
        valid: false,
        coupon_id: null,
        discount_amount: 0,
        message: 'Erro ao validar cupom',
      };
    }
  };

  const getCouponStats = async (): Promise<CouponStats[]> => {
    try {
      const { data, error } = await supabase
        .from('coupon_stats')
        .select('*')
        .order('total_discount_given', { ascending: false });

      if (error) throw error;
      return (data as unknown as CouponStats[]) || [];
    } catch (error: unknown) {
      const e = error as { message?: string };
      console.error('Erro ao carregar estatísticas:', e);
      return [];
    }
  };

  return {
    coupons,
    loading,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    toggleCouponStatus,
    validateCoupon,
    getCouponStats,
    refreshCoupons: fetchCoupons,
  };
}
