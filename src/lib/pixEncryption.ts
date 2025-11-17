/**
 * Client-side utility para criptografia de dados sensíveis
 * Usa Edge Function para criptografia server-side segura
 */

import { supabase } from '@/integrations/supabase/client';
import { maskSensitiveData } from './encryption';

/**
 * Criptografa dados sensíveis usando Edge Function
 * @param value - Valor a ser criptografado
 * @param type - Tipo de dado (pix, account, etc)
 * @returns Valor criptografado em Base64
 */
export async function encryptSensitive(
  value: string,
  type: 'pix' | 'account' = 'pix'
): Promise<string> {
  if (!value) {
    throw new Error('Value is required');
  }

  try {
    const { data, error } = await supabase.functions.invoke('encrypt-sensitive-data', {
      body: {
        action: 'encrypt',
        value,
        type,
      },
    });

    if (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }

    if (!data?.success || !data?.result) {
      throw new Error('Invalid encryption response');
    }

    return data.result;
  } catch (error) {
    console.error('Error encrypting sensitive data:', error);
    throw error;
  }
}

/**
 * Descriptografa dados sensíveis usando Edge Function
 * @param encryptedValue - Valor criptografado em Base64
 * @param type - Tipo de dado (pix, account, etc)
 * @returns Valor descriptografado
 */
export async function decryptSensitive(
  encryptedValue: string,
  type: 'pix' | 'account' = 'pix'
): Promise<string> {
  if (!encryptedValue) {
    throw new Error('Encrypted value is required');
  }

  try {
    const { data, error } = await supabase.functions.invoke('encrypt-sensitive-data', {
      body: {
        action: 'decrypt',
        value: encryptedValue,
        type,
      },
    });

    if (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }

    if (!data?.success || !data?.result) {
      throw new Error('Invalid decryption response');
    }

    return data.result;
  } catch (error) {
    console.error('Error decrypting sensitive data:', error);
    throw error;
  }
}

/**
 * Salva chave PIX criptografada no banco de dados
 * @param pixKey - Chave PIX em texto plano
 * @param recipientName - Nome do beneficiário
 * @param photographerId - ID do fotógrafo (requerido)
 * @param amount - Valor da solicitação de saque
 * @param institution - Instituição financeira
 * @returns ID do registro criado
 */
export async function saveEncryptedPixKey(
  pixKey: string,
  recipientName: string,
  photographerId: string,
  amount: number,
  institution?: string
): Promise<string> {
  try {
    // Criptografar chave PIX
    const encryptedPixKey = await encryptSensitive(pixKey, 'pix');

    // Salvar no banco de dados
    const { data, error } = await supabase
      .from('payout_requests')
      .insert({
        pix_key: encryptedPixKey,
        recipient_name: recipientName,
        photographer_id: photographerId,
        amount: amount,
        institution: institution || null,
        status: 'pending',
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error saving PIX key:', error);
      throw new Error('Failed to save PIX key');
    }

    console.log('✅ PIX key saved securely (encrypted)');
    return data.id;
  } catch (error) {
    console.error('Error in saveEncryptedPixKey:', error);
    throw error;
  }
}

/**
 * Busca e descriptografa chave PIX do banco de dados
 * @param payoutRequestId - ID da solicitação de saque
 * @param maskOnly - Se true, retorna apenas versão mascarada (mais seguro)
 * @returns Chave PIX descriptografada ou mascarada
 */
export async function getPixKey(
  payoutRequestId: string,
  maskOnly: boolean = true
): Promise<string> {
  try {
    // Buscar registro do banco
    const { data, error } = await supabase
      .from('payout_requests')
      .select('pix_key')
      .eq('id', payoutRequestId)
      .single();

    if (error) {
      console.error('Error fetching PIX key:', error);
      throw new Error('Failed to fetch PIX key');
    }

    if (!data?.pix_key) {
      throw new Error('PIX key not found');
    }

    // Se apenas mascarar, descriptografar e mascarar
    if (maskOnly) {
      const decrypted = await decryptSensitive(data.pix_key, 'pix');
      return maskSensitiveData(decrypted, 'pix');
    }

    // Descriptografar completamente (apenas para admin)
    return await decryptSensitive(data.pix_key, 'pix');
  } catch (error) {
    console.error('Error in getPixKey:', error);
    throw error;
  }
}

/**
 * Atualiza chave PIX criptografada
 * @param payoutRequestId - ID da solicitação de saque
 * @param newPixKey - Nova chave PIX em texto plano
 * @returns true se atualizado com sucesso
 */
export async function updateEncryptedPixKey(
  payoutRequestId: string,
  newPixKey: string
): Promise<boolean> {
  try {
    // Criptografar nova chave
    const encryptedPixKey = await encryptSensitive(newPixKey, 'pix');

    // Atualizar no banco
    const { error } = await supabase
      .from('payout_requests')
      .update({ pix_key: encryptedPixKey })
      .eq('id', payoutRequestId);

    if (error) {
      console.error('Error updating PIX key:', error);
      throw new Error('Failed to update PIX key');
    }

    console.log('✅ PIX key updated securely');
    return true;
  } catch (error) {
    console.error('Error in updateEncryptedPixKey:', error);
    throw error;
  }
}

/**
 * Exemplo de uso:
 * 
 * // Salvar chave PIX criptografada
 * await saveEncryptedPixKey(
 *   '12345678900', 
 *   'João Silva', 
 *   'photographer-id-uuid',
 *   100.50,
 *   'Banco do Brasil'
 * );
 * 
 * // Buscar chave PIX mascarada (seguro)
 * const masked = await getPixKey(id, true); // "***8900"
 * 
 * // Buscar chave PIX completa (apenas admin)
 * const full = await getPixKey(id, false); // "12345678900"
 */
