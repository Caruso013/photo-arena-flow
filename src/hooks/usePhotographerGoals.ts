/**
 * Hook para gerenciar metas do fotógrafo
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';

export interface PhotographerGoal {
  id: string;
  photographer_id: string;
  month: string;
  sales_target: number;
  photos_target: number;
  events_target: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GoalProgress {
  salesRealized: number;
  photosRealized: number;
  eventsRealized: number;
}

export function usePhotographerGoals() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<PhotographerGoal[]>([]);
  const [currentGoal, setCurrentGoal] = useState<PhotographerGoal | null>(null);
  const [progress, setProgress] = useState<GoalProgress>({
    salesRealized: 0,
    photosRealized: 0,
    eventsRealized: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchProgress = useCallback(async (month: string) => {
    if (!user) return;

    try {
      const startOfMonth = new Date(month);
      const endOfMonth = new Date(startOfMonth);
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);

      const { data: salesData } = await supabase
        .from('purchases')
        .select('amount')
        .eq('photographer_id', user.id)
        .eq('status', 'completed')
        .gte('created_at', startOfMonth.toISOString())
        .lt('created_at', endOfMonth.toISOString());

      const salesRealized = salesData?.reduce((sum, s) => sum + Number(s.amount), 0) || 0;
      const photosRealized = salesData?.length || 0;

      const { data: photosData } = await supabase
        .from('photos')
        .select('campaign_id')
        .eq('photographer_id', user.id)
        .gte('created_at', startOfMonth.toISOString())
        .lt('created_at', endOfMonth.toISOString());

      const uniqueCampaigns = new Set(photosData?.map(p => p.campaign_id) || []);
      const eventsRealized = uniqueCampaigns.size;

      setProgress({ salesRealized, photosRealized, eventsRealized });
    } catch (error) {
      console.error('Error fetching progress:', error);
    }
  }, [user]);

  // Buscar metas do fotógrafo
  const fetchGoals = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('photographer_goals')
        .select('*')
        .eq('photographer_id', user.id)
        .order('month', { ascending: false });

      if (error) throw error;

      setGoals(data || []);

      // Meta do mês atual
      const currentMonth = new Date().toISOString().slice(0, 7) + '-01';
      const current = data?.find(g => g.month === currentMonth);
      setCurrentGoal(current || null);

      // Calcular progresso do mês atual
      if (current) await fetchProgress(currentMonth);
    } catch (error) {
      console.error('Error fetching goals:', error);
      toast({
        title: 'Erro ao carregar metas',
        description: 'Não foi possível carregar suas metas.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [user, fetchProgress]);

  // Criar ou atualizar meta
  const saveGoal = useCallback(async (goalData: Omit<PhotographerGoal, 'id' | 'photographer_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('photographer_goals')
        .upsert({
          photographer_id: user.id,
          ...goalData
        }, {
          onConflict: 'photographer_id,month'
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Meta salva!',
        description: 'Sua meta foi salva com sucesso.'
      });

      await fetchGoals();
      return data;
    } catch (error: unknown) {
      const e = error as { message?: string };
      console.error('Error saving goal:', e);
      toast({
        title: 'Erro ao salvar meta',
        description: e.message || 'Não foi possível salvar a meta.',
        variant: 'destructive'
      });
      return null;
    }
  }, [user, fetchGoals]);

  // Deletar meta
  const deleteGoal = useCallback(async (goalId: string) => {
    try {
      const { error } = await supabase
        .from('photographer_goals')
        .delete()
        .eq('id', goalId);

      if (error) throw error;

      toast({
        title: 'Meta excluída',
        description: 'A meta foi excluída com sucesso.'
      });

      await fetchGoals();
    } catch (error: unknown) {
      const e = error as { message?: string };
      console.error('Error deleting goal:', e);
      toast({
        title: 'Erro ao excluir meta',
        description: e.message || 'Não foi possível excluir a meta.',
        variant: 'destructive'
      });
    }
  }, [fetchGoals]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  return {
    goals,
    currentGoal,
    progress,
    loading,
    saveGoal,
    deleteGoal,
    refreshGoals: fetchGoals
  };
}
