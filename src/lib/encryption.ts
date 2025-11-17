/**
 * Encryption utilities for sensitive data (PIX keys, bank account info)
 * Uses Web Crypto API for secure client-side encryption
 * 
 * IMPORTANT: Encryption key must be stored securely on server-side
 * For production, use environment variables and backend encryption
 */

// Converte string para ArrayBuffer
function str2ab(str: string): ArrayBuffer {
  const buf = new ArrayBuffer(str.length);
  const bufView = new Uint8Array(buf);
  for (let i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

// Converte ArrayBuffer para string
function ab2str(buf: ArrayBuffer): string {
  return String.fromCharCode.apply(null, Array.from(new Uint8Array(buf)));
}

// Converte ArrayBuffer para Base64
function ab2base64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Converte Base64 para ArrayBuffer
function base642ab(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Gera uma chave de criptografia derivada de uma senha
 * IMPORTANTE: Em produção, use uma chave gerada server-side
 */
async function getEncryptionKey(password: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  // Salt fixo - em produção, use salt único por registro
  const salt = enc.encode('photo-arena-salt-2025');

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

/**
 * Criptografa uma string sensível (PIX key, account number, etc)
 * @param plaintext - Texto a ser criptografado
 * @param password - Senha mestra (deve vir de variável de ambiente)
 * @returns String criptografada em Base64
 */
export async function encryptSensitiveData(
  plaintext: string,
  password: string
): Promise<string> {
  if (!plaintext || !password) {
    throw new Error('Plaintext and password are required');
  }

  const key = await getEncryptionKey(password);
  const enc = new TextEncoder();
  const encoded = enc.encode(plaintext);

  // IV (Initialization Vector) - deve ser único para cada criptografia
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    encoded
  );

  // Combinar IV + dados criptografados
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);

  return ab2base64(combined.buffer);
}

/**
 * Descriptografa uma string sensível
 * @param ciphertext - String criptografada em Base64
 * @param password - Senha mestra (deve vir de variável de ambiente)
 * @returns String descriptografada
 */
export async function decryptSensitiveData(
  ciphertext: string,
  password: string
): Promise<string> {
  if (!ciphertext || !password) {
    throw new Error('Ciphertext and password are required');
  }

  const key = await getEncryptionKey(password);
  const combined = new Uint8Array(base642ab(ciphertext));

  // Separar IV dos dados criptografados
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    data
  );

  const dec = new TextDecoder();
  return dec.decode(decrypted);
}

/**
 * Máscara um valor sensível para exibição
 * Exemplo: "12345678900" -> "***.***.900-**"
 * @param value - Valor sensível
 * @param type - Tipo de dado (cpf, email, phone, pix)
 * @returns String mascarada
 */
export function maskSensitiveData(
  value: string | null | undefined,
  type: 'cpf' | 'email' | 'phone' | 'pix' = 'pix'
): string {
  if (!value) return '***';

  switch (type) {
    case 'cpf':
      // 123.456.789-00 -> ***.456.***-00
      return value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '***.$2.***-$4');
    
    case 'email':
      // user@example.com -> u***@example.com
      const [localPart, domain] = value.split('@');
      return localPart ? `${localPart[0]}***@${domain || '***'}` : '***';
    
    case 'phone':
      // (11) 98765-4321 -> (11) ***-4321
      return value.replace(/(\(\d{2}\)\s?)(\d{4,5})(-\d{4})/, '$1***$3');
    
    case 'pix':
    default:
      // Exibir apenas últimos 4 caracteres
      if (value.length <= 4) return '***';
      return `***${value.slice(-4)}`;
  }
}

/**
 * Valida se um valor está criptografado (Base64 válido)
 * @param value - Valor a validar
 * @returns true se parece estar criptografado
 */
export function isEncrypted(value: string): boolean {
  if (!value) return false;
  
  // Base64 válido tem comprimento múltiplo de 4
  if (value.length % 4 !== 0) return false;
  
  // Base64 só contém caracteres válidos
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  return base64Regex.test(value);
}

/**
 * ⚠️ ATENÇÃO: Esta é uma implementação de EXEMPLO
 * 
 * Para produção, você DEVE:
 * 1. Mover a criptografia para o servidor (Edge Function)
 * 2. Usar uma chave mestra em variável de ambiente
 * 3. Usar salt único por registro
 * 4. Implementar rotação de chaves
 * 5. Auditar acessos a dados sensíveis
 * 
 * Exemplo de uso:
 * 
 * // Criptografar antes de salvar
 * const encrypted = await encryptSensitiveData(pixKey, process.env.MASTER_KEY);
 * await supabase.from('payout_requests').insert({ pix_key: encrypted });
 * 
 * // Descriptografar para exibir
 * const decrypted = await decryptSensitiveData(encrypted, process.env.MASTER_KEY);
 * console.log(maskSensitiveData(decrypted, 'pix')); // ***1234
 */
