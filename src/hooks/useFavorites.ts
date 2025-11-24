import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useFavorites = () => {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchFavorites();
      subscribeToFavorites();
    } else {
      setFavorites(new Set());
      setLoading(false);
    }
  }, [user]);

  const fetchFavorites = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('photo_id')
        .eq('user_id', user.id);

      if (error) throw error;
      
      setFavorites(new Set(data.map(f => f.photo_id)));
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToFavorites = () => {
    if (!user) return;

    const channel = supabase
      .channel('favorites-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'favorites',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setFavorites(prev => new Set(prev).add((payload.new as any).photo_id));
          } else if (payload.eventType === 'DELETE') {
            setFavorites(prev => {
              const newSet = new Set(prev);
              newSet.delete((payload.old as any).photo_id);
              return newSet;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const toggleFavorite = async (photoId: string) => {
    if (!user) {
      toast.error('Faça login para favoritar fotos', {
        action: {
          label: 'Fazer Login',
          onClick: () => window.location.href = '/#/auth'
        }
      });
      return false;
    }

    const isFavorited = favorites.has(photoId);
    let retryCount = 0;
    const maxRetries = 2;

    // Update UI otimisticamente
    setFavorites(prev => {
      const newSet = new Set(prev);
      if (isFavorited) {
        newSet.delete(photoId);
      } else {
        newSet.add(photoId);
      }
      return newSet;
    });

    const attemptToggle = async (): Promise<boolean> => {
      try {
        if (isFavorited) {
          const { error } = await supabase
            .from('favorites')
            .delete()
            .eq('user_id', user.id)
            .eq('photo_id', photoId);

          if (error) throw error;
          
          toast.success('Removido dos favoritos');
          return false;
        } else {
          const { error } = await supabase
            .from('favorites')
            .insert({ user_id: user.id, photo_id: photoId });

          if (error) throw error;
          
          toast.success('Adicionado aos favoritos');
          return true;
        }
      } catch (error: any) {
        // Retry em caso de erro de rede
        if (retryCount < maxRetries && (error?.message?.includes('fetch') || error?.message?.includes('network'))) {
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          return attemptToggle();
        }
        throw error;
      }
    };

    try {
      return await attemptToggle();
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      
      // Reverter UI em caso de erro
      setFavorites(prev => {
        const newSet = new Set(prev);
        if (isFavorited) {
          newSet.add(photoId);
        } else {
          newSet.delete(photoId);
        }
        return newSet;
      });
      
      const errorMsg = error?.message || 'Erro ao atualizar favoritos';
      toast.error(errorMsg);
      
      // Se erro for de autenticação, sugerir login
      if (error?.code === 'PGRST116' || error?.message?.includes('JWT')) {
        toast.error('Sessão expirada. Faça login novamente.', {
          action: {
            label: 'Fazer Login',
            onClick: () => window.location.href = '/#/auth'
          }
        });
      }
      
      return isFavorited;
    }
  };

  const isFavorited = (photoId: string) => favorites.has(photoId);

  return {
    favorites: Array.from(favorites),
    loading,
    toggleFavorite,
    isFavorited,
  };
};
