import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const usePlatformPercentage = () => {
  const [percentage, setPercentage] = useState(9);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPercentage = async () => {
      try {
        const { data, error } = await supabase.rpc('get_total_platform_percentage');

        if (error) throw error;
        
        // Função RPC retorna diretamente o número
        if (data) {
          setPercentage(Number(data));
        }
      } catch (error) {
        console.error('Error fetching platform percentage:', error);
        // Fallback para 9% em caso de erro
        setPercentage(9);
      } finally {
        setLoading(false);
      }
    };

    fetchPercentage();
  }, []);

  return { percentage, loading };
};
