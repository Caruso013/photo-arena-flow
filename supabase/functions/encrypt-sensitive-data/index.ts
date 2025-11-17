/**
 * Edge Function: Encrypt Sensitive Data (PIX keys, bank info)
 * 
 * Este Edge Function DEVE ser usado para criptografar dados sensíveis
 * antes de armazenar no banco de dados.
 * 
 * Endpoint: POST /functions/v1/encrypt-sensitive-data
 * 
 * Body:
 * {
 *   "action": "encrypt" | "decrypt",
 *   "value": "string to encrypt/decrypt",
 *   "type": "pix" | "account"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "result": "encrypted/decrypted value"
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Converte ArrayBuffer para Base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Converte Base64 para ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Deriva chave de criptografia a partir da master key
async function deriveKey(masterKey: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(masterKey),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Criptografa dados sensíveis
async function encryptData(plaintext: string, masterKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);

  // Gerar salt e IV únicos
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const key = await deriveKey(masterKey, salt);

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  // Combinar: salt (16) + iv (12) + dados criptografados
  const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(encrypted), salt.length + iv.length);

  return arrayBufferToBase64(combined.buffer);
}

// Descriptografa dados sensíveis
async function decryptData(ciphertext: string, masterKey: string): Promise<string> {
  const combined = new Uint8Array(base64ToArrayBuffer(ciphertext));

  // Separar: salt (16) + iv (12) + dados
  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const data = combined.slice(28);

  const key = await deriveKey(masterKey, salt);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verificar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verificar usuário autenticado
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Pegar master key das variáveis de ambiente
    const masterKey = Deno.env.get('ENCRYPTION_MASTER_KEY');
    if (!masterKey) {
      throw new Error('Encryption key not configured');
    }

    // Parse request body
    const { action, value, type } = await req.json();

    if (!action || !value) {
      throw new Error('Missing required fields: action, value');
    }

    let result: string;

    if (action === 'encrypt') {
      result = await encryptData(value, masterKey);
      
      console.log(`🔒 Encrypted ${type || 'data'} for user ${user.id}`);
    } else if (action === 'decrypt') {
      result = await decryptData(value, masterKey);
      
      console.log(`🔓 Decrypted ${type || 'data'} for user ${user.id}`);
    } else {
      throw new Error('Invalid action. Use "encrypt" or "decrypt"');
    }

    return new Response(
      JSON.stringify({
        success: true,
        result,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in encrypt-sensitive-data:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
