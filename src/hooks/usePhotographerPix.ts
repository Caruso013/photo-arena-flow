import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PixKeyData {
  pixKey: string;
  pixKeyType: 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria';
  recipientName: string;
  institution?: string;
}

interface PendingChangeData {
  pixKey: string;
  pixKeyType: string;
  recipientName: string;
  institution?: string;
  [key: string]: string | undefined;
}

export interface PhotographerPixStatus {
  hasPixKey: boolean;
  pixKeyMasked: string | null;
  pixKeyType: string | null;
  recipientName: string | null;
  institution: string | null;
  verifiedAt: Date | null;
  
  hasPendingChange: boolean;
  pendingChangeData: PendingChangeData | null;
  changeRequestedAt: Date | null;
  daysUntilChangeApplied: number;
  
  canUploadPhotos: boolean;
  loading: boolean;
  
  registerPixKey: (data: PixKeyData) => Promise<boolean>;
  requestPixChange: (data: PixKeyData) => Promise<boolean>;
  cancelPendingChange: () => Promise<boolean>;
  refetch: () => void;
}

function calculateBusinessDaysRemaining(requestDate: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let businessDays = 0;
  const current = new Date(requestDate);
  current.setHours(0, 0, 0, 0);
  
  while (current <= today) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      businessDays++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return Math.max(0, 3 - businessDays);
}

function maskPixKey(pixKey: string | null, type: string | null): string | null {
  if (!pixKey) return null;
  
  switch (type) {
    case 'cpf':
      return pixKey.replace(/(\d{3})\.(\d{3})\.(\d{3})-(\d{2})/, '***.$2.***-**');
    case 'cnpj':
      return pixKey.replace(/(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})-(\d{2})/, '**.$2.***/$4-**');
    case 'email':
      const [local, domain] = pixKey.split('@');
      if (local && domain) {
        const maskedLocal = local.length > 2 ? local[0] + '***' + local[local.length - 1] : '***';
        return `${maskedLocal}@${domain}`;
      }
      return '***@***';
    case 'telefone':
      return pixKey.replace(/\((\d{2})\)\s?(\d{4,5})-?(\d{4})/, '(**) *****-$3');
    case 'aleatoria':
      if (pixKey.length > 8) {
        return pixKey.substring(0, 4) + '****' + pixKey.substring(pixKey.length - 4);
      }
      return '****';
    default:
      return '***********';
  }
}

export function usePhotographerPix(): PhotographerPixStatus {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [pixData, setPixData] = useState<{
    pixKey: string | null;
    pixKeyType: string | null;
    recipientName: string | null;
    institution: string | null;
    verifiedAt: string | null;
    pendingChange: PendingChangeData | null;
    changeRequestedAt: string | null;
  } | null>(null);

  const fetchPixData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('pix_key, pix_key_type, pix_recipient_name, pix_institution, pix_verified_at, pix_pending_change, pix_change_requested_at')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      const pendingChange = data?.pix_pending_change as PendingChangeData | null;
      setPixData({
        pixKey: data?.pix_key || null,
        pixKeyType: data?.pix_key_type || null,
        recipientName: data?.pix_recipient_name || null,
        institution: data?.pix_institution || null,
        verifiedAt: data?.pix_verified_at || null,
        pendingChange: pendingChange,
        changeRequestedAt: data?.pix_change_requested_at || null,
      });
    } catch (error) {
      console.error('Error fetching PIX data:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchPixData();
  }, [fetchPixData]);

  // Apply pending change if 3 business days have passed
  useEffect(() => {
    const applyPendingChange = async () => {
      if (!pixData?.pendingChange || !pixData?.changeRequestedAt || !user?.id) return;
      
      const daysRemaining = calculateBusinessDaysRemaining(new Date(pixData.changeRequestedAt));
      
      if (daysRemaining === 0) {
        try {
          const { error } = await supabase
            .from('profiles')
            .update({
              pix_key: pixData.pendingChange.pixKey,
              pix_key_type: pixData.pendingChange.pixKeyType,
              pix_recipient_name: pixData.pendingChange.recipientName,
              pix_institution: pixData.pendingChange.institution || null,
              pix_verified_at: new Date().toISOString(),
              pix_pending_change: null,
              pix_change_requested_at: null,
            })
            .eq('id', user.id);

          if (!error) {
            toast.success('Sua chave PIX foi atualizada!');
            fetchPixData();
          }
        } catch (error) {
          console.error('Error applying pending PIX change:', error);
        }
      }
    };

    applyPendingChange();
  }, [pixData?.pendingChange, pixData?.changeRequestedAt, user?.id, fetchPixData]);

  const registerPixKey = async (data: PixKeyData): Promise<boolean> => {
    if (!user?.id) {
      toast.error('Usuário não autenticado');
      return false;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          pix_key: data.pixKey,
          pix_key_type: data.pixKeyType,
          pix_recipient_name: data.recipientName,
          pix_institution: data.institution || null,
          pix_verified_at: new Date().toISOString(),
          pix_pending_change: null,
          pix_change_requested_at: null,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Chave PIX cadastrada com sucesso!');
      await fetchPixData();
      return true;
    } catch (error) {
      console.error('Error registering PIX key:', error);
      toast.error('Erro ao cadastrar chave PIX');
      return false;
    }
  };

  const requestPixChange = async (data: PixKeyData): Promise<boolean> => {
    if (!user?.id) {
      toast.error('Usuário não autenticado');
      return false;
    }

    try {
      const pendingChange: PendingChangeData = {
        pixKey: data.pixKey,
        pixKeyType: data.pixKeyType,
        recipientName: data.recipientName,
        institution: data.institution,
      };

      const { error } = await supabase
        .from('profiles')
        .update({
          pix_pending_change: pendingChange,
          pix_change_requested_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Solicitação de alteração registrada! Será aplicada em 3 dias úteis.');
      await fetchPixData();
      return true;
    } catch (error) {
      console.error('Error requesting PIX change:', error);
      toast.error('Erro ao solicitar alteração de PIX');
      return false;
    }
  };

  const cancelPendingChange = async (): Promise<boolean> => {
    if (!user?.id) {
      toast.error('Usuário não autenticado');
      return false;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          pix_pending_change: null,
          pix_change_requested_at: null,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Solicitação de alteração cancelada');
      await fetchPixData();
      return true;
    } catch (error) {
      console.error('Error canceling PIX change:', error);
      toast.error('Erro ao cancelar alteração');
      return false;
    }
  };

  const hasPixKey = !!pixData?.pixKey && !!pixData?.verifiedAt;
  const hasPendingChange = !!pixData?.pendingChange;
  const daysUntilChangeApplied = pixData?.changeRequestedAt 
    ? calculateBusinessDaysRemaining(new Date(pixData.changeRequestedAt))
    : 0;

  return {
    hasPixKey,
    pixKeyMasked: maskPixKey(pixData?.pixKey ?? null, pixData?.pixKeyType ?? null),
    pixKeyType: pixData?.pixKeyType || null,
    recipientName: pixData?.recipientName || null,
    institution: pixData?.institution || null,
    verifiedAt: pixData?.verifiedAt ? new Date(pixData.verifiedAt) : null,
    
    hasPendingChange,
    pendingChangeData: pixData?.pendingChange || null,
    changeRequestedAt: pixData?.changeRequestedAt ? new Date(pixData.changeRequestedAt) : null,
    daysUntilChangeApplied,
    
    canUploadPhotos: hasPixKey,
    loading,
    
    registerPixKey,
    requestPixChange,
    cancelPendingChange,
    refetch: fetchPixData,
  };
}
