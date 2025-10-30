import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const usePlatformPercentage = () => {
  const [percentage, setPercentage] = useState(9);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPercentage = async () => {
      try {
        const { data, error } = await supabase
          .from('system_config' as any)
          .select('value')
          .eq('key', 'platform_percentage')
          .single() as any;

        if (error) throw error;
        
        if (data && data.value && typeof data.value === 'object' && 'value' in data.value) {
          setPercentage(Number(data.value.value));
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
