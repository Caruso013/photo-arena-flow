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
        .from('coupons' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCoupons((data || []) as Coupon[]);
    } catch (error: any) {
      console.error('Erro ao carregar cupons:', error);
      toast({
        title: 'Erro ao carregar cupons',
        description: error.message,
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
        .from('coupons' as any)
        .insert({
          ...couponData,
          code: couponData.code.toUpperCase().trim(),
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Cupom criado!',
        description: `Código: ${data.code}`,
      });

      await fetchCoupons();
      return data;
    } catch (error: any) {
      console.error('Erro ao criar cupom:', error);
      toast({
        title: 'Erro ao criar cupom',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const updateCoupon = async (id: string, updates: Partial<Coupon>) => {
    try {
      const { error } = await supabase
        .from('coupons' as any)
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
    } catch (error: any) {
      console.error('Erro ao atualizar cupom:', error);
      toast({
        title: 'Erro ao atualizar cupom',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const deleteCoupon = async (id: string) => {
    try {
      const { error } = await supabase
        .from('coupons' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Cupom excluído!',
      });

      await fetchCoupons();
    } catch (error: any) {
      console.error('Erro ao excluir cupom:', error);
      toast({
        title: 'Erro ao excluir cupom',
        description: error.message,
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
      const { data, error } = await (supabase.rpc as any)('validate_coupon', {
        p_code: code,
        p_user_id: userId,
        p_purchase_amount: purchaseAmount,
      });

      if (error) throw error;

      // RPC retorna array com 1 resultado
      const result = data[0] as CouponValidationResult;

      if (!result.valid) {
        toast({
          title: 'Cupom inválido',
          description: result.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Cupom aplicado!',
          description: `Desconto: R$ ${result.discount_amount.toFixed(2)}`,
        });
      }

      return result;
    } catch (error: any) {
      console.error('Erro ao validar cupom:', error);
      toast({
        title: 'Erro ao validar cupom',
        description: error.message,
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
        .from('coupon_stats' as any)
        .select('*')
        .order('total_discount_given', { ascending: false });

      if (error) throw error;
      return (data || []) as CouponStats[];
    } catch (error: any) {
      console.error('Erro ao carregar estatísticas:', error);
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
