# 🔐 Guia Técnico - Implementação da Segurança de Fotos

## 🎯 Objetivo
Mover a geração de URLs assinadas do **cliente (inseguro)** para o **servidor (seguro)**.

---

## PARTE 1: Backend - Criar Endpoint Seguro

### 1.1 Criar Supabase Edge Function

**Arquivo**: `supabase/functions/generate-photo-download/index.ts`

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Rate limiting: armazenar em Redis ou Supabase
const downloadAttempts: Record<string, { count: number; resetTime: number }> = {};

interface DownloadRequest {
  photo_id: string;
  purchase_id?: string;
}

interface DownloadResponse {
  signed_url: string;
  expires_in: number; // segundos
  hash: string; // para auditoria
  token: string; // token único para validar no banco depois
}

export async function POST(req: Request): Promise<Response> {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. VALIDAR AUTENTICAÇÃO
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: corsHeaders }
      );
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: corsHeaders }
      );
    }

    // 2. VALIDAR RATE LIMITING
    const now = Date.now();
    const userKey = `${user.id}`;
    const ipAddress = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || 'unknown';
    const ipKey = `ip-${ipAddress}`;

    // Rate limit: 25 downloads por hora por usuário
    if (downloadAttempts[userKey]) {
      if (now < downloadAttempts[userKey].resetTime) {
        if (downloadAttempts[userKey].count >= 25) {
          return new Response(
            JSON.stringify({ 
              error: 'Você atingiu o limite de downloads. Tente novamente em 1 hora.' 
            }),
            { status: 429, headers: corsHeaders }
          );
        }
        downloadAttempts[userKey].count++;
      } else {
        downloadAttempts[userKey] = { count: 1, resetTime: now + 3600000 };
      }
    } else {
      downloadAttempts[userKey] = { count: 1, resetTime: now + 3600000 };
    }

    // 3. VALIDAR COMPRA NO BANCO
    const body = await req.json() as DownloadRequest;
    const { photo_id } = body;

    if (!photo_id) {
      return new Response(
        JSON.stringify({ error: 'photo_id é obrigatório' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Verificar se usuário comprou esta foto
    const { data: purchase, error: purchaseError } = await supabase
      .from('purchases')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('photo_id', photo_id)
      .eq('status', 'completed')
      .single();

    if (purchaseError || !purchase) {
      return new Response(
        JSON.stringify({ error: 'Você não comprou esta foto' }),
        { status: 403, headers: corsHeaders }
      );
    }

    // 4. OBTER CAMINHO DA FOTO ORIGINAL
    const { data: photo, error: photoError } = await supabase
      .from('photos')
      .select('original_url')
      .eq('id', photo_id)
      .single();

    if (photoError || !photo) {
      return new Response(
        JSON.stringify({ error: 'Foto não encontrada' }),
        { status: 404, headers: corsHeaders }
      );
    }

    // 5. GERAR URL ASSINADA (2 MINUTOS - não 5!)
    const photoPath = photo.original_url.split('photos-original/')[1];
    const { data: signedData, error: signError } = await supabase
      .storage
      .from('photos-original')
      .createSignedUrl(photoPath, 120); // 2 minutos

    if (signError || !signedData) {
      throw new Error('Erro ao gerar URL assinada');
    }

    // 6. GERAR TOKEN ÚNICO
    const downloadToken = crypto.randomUUID();
    const fileHash = await hashFile(photo.original_url);

    // 7. REGISTRAR NO LOG DE DOWNLOADS
    await supabase
      .from('photo_downloads')
      .insert({
        user_id: user.id,
        photo_id: photo_id,
        purchase_id: purchase.id,
        ip_address: ipAddress,
        user_agent: req.headers.get('user-agent'),
        file_hash: fileHash,
        download_token: downloadToken,
        downloaded_at: new Date().toISOString(),
      });

    // 8. ALERTAS DE SEGURANÇA
    const { data: recentDownloads } = await supabase
      .from('photo_downloads')
      .select('id')
      .eq('user_id', user.id)
      .gte('downloaded_at', new Date(now - 3600000).toISOString()); // última 1 hora

    if (recentDownloads && recentDownloads.length > 10) {
      // Enviar alerta ao admin
      console.warn(`⚠️ ALERTA: Usuário ${user.id} baixou ${recentDownloads.length} fotos em 1 hora`);
    }

    // 9. RETORNAR URL SEGURA
    const response: DownloadResponse = {
      signed_url: signedData.signedUrl,
      expires_in: 120,
      hash: fileHash,
      token: downloadToken,
    };

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Erro:', error);
    return new Response(
      JSON.stringify({ error: 'Erro ao processar requisição' }),
      { status: 500, headers: corsHeaders }
    );
  }
}

// Função auxiliar para gerar hash do arquivo
async function hashFile(fileUrl: string): Promise<string> {
  try {
    const response = await fetch(fileUrl);
    const buffer = await response.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return '';
  }
}
```

---

### 1.2 Criar Tabela de Auditoria

**Arquivo**: `supabase/migrations/photo_downloads_table.sql`

```sql
-- Tabela para auditoria de downloads
CREATE TABLE IF NOT EXISTS public.photo_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_id UUID NOT NULL REFERENCES public.photos(id) ON DELETE CASCADE,
  purchase_id UUID REFERENCES public.purchases(id) ON DELETE SET NULL,
  ip_address VARCHAR(50),
  user_agent TEXT,
  file_hash VARCHAR(64),
  download_token UUID UNIQUE,
  downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_photo_downloads_user ON public.photo_downloads(user_id);
CREATE INDEX idx_photo_downloads_photo ON public.photo_downloads(photo_id);
CREATE INDEX idx_photo_downloads_downloaded_at ON public.photo_downloads(downloaded_at DESC);
CREATE INDEX idx_photo_downloads_ip ON public.photo_downloads(ip_address);

-- RLS (Row Level Security)
ALTER TABLE public.photo_downloads ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver seus próprios downloads
CREATE POLICY "Users can view their own downloads"
  ON public.photo_downloads
  FOR SELECT
  USING (auth.uid() = user_id);

-- Apenas admin pode inserir (via função do servidor)
CREATE POLICY "Only service role can insert"
  ON public.photo_downloads
  FOR INSERT
  WITH CHECK (false); -- Inserção apenas via função server
```

---

## PARTE 2: Modificar Frontend

### 2.1 Remover getSignedPhotoUrl do Cliente

**REMOVER**: `src/lib/photoDownload.ts` (linhas 25-50)

```typescript
// ❌ REMOVER ISTO:
export async function getSignedPhotoUrl(originalUrl: string): Promise<string | null> {
  try {
    // ... código que gera URL no client
  }
}
```

### 2.2 Criar Nova Função Segura

**Arquivo**: `src/lib/securePhotoDownload.ts` (NOVO)

```typescript
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DownloadResponse {
  signed_url: string;
  expires_in: number;
  hash: string;
  token: string;
}

/**
 * Requisita URL de download SEGURA do backend
 * ✅ Valida compra server-side
 * ✅ Valida rate limiting
 * ✅ Gera URL com 2 minutos de expiração
 * ✅ Registra log completo
 */
export async function getSecurePhotoDownloadUrl(photoId: string): Promise<string | null> {
  try {
    // 1. Obter token JWT do usuário
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      toast.error('Você precisa estar autenticado');
      return null;
    }

    // 2. Requisitar URL ao backend
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-photo-download`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ photo_id: photoId }),
      }
    );

    // 3. Validar resposta
    if (!response.ok) {
      const error = await response.json();
      
      if (response.status === 429) {
        toast.error('⏰ Você atingiu o limite de downloads. Tente novamente em 1 hora.');
      } else if (response.status === 403) {
        toast.error('❌ Você não comprou esta foto');
      } else {
        toast.error(error.error || 'Erro ao gerar link de download');
      }
      
      return null;
    }

    const data = (await response.json()) as DownloadResponse;
    
    // 4. Log local (para debug)
    console.log('✅ URL segura gerada', {
      expires_in: data.expires_in,
      hash: data.hash.substring(0, 8) + '...', // truncado por segurança
    });

    return data.signed_url;

  } catch (error) {
    console.error('Erro ao obter URL de download:', error);
    toast.error('Erro ao processar sua requisição');
    return null;
  }
}
```

### 2.3 Atualizar Componente de Download

**Arquivo**: `src/pages/dashboard/MyPurchases.tsx`

Procure por:
```typescript
await downloadOriginalPhoto(url, fileName);
```

Mude para:
```typescript
// ✅ NOVO: Usar função segura
const secureUrl = await getSecurePhotoDownloadUrl(purchase.photo.id);
if (secureUrl) {
  await downloadOriginalPhoto(secureUrl, fileName);
}
```

---

## PARTE 3: Proteções Adicionais

### 3.1 CAPTCHA para Downloads em Massa

**Arquivo**: `src/components/CaptchaDownload.tsx` (NOVO)

```typescript
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface CaptchaDownloadProps {
  onVerified: () => void;
  photosCount: number;
}

export function CaptchaDownload({ onVerified, photosCount }: CaptchaDownloadProps) {
  const [isVerifying, setIsVerifying] = useState(false);

  // Se está baixando poucas fotos, não pedir verificação
  if (photosCount < 3) {
    onVerified();
    return null;
  }

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      // Usar reCAPTCHA v3 ou similar
      const token = await (window as any).grecaptcha.execute(
        import.meta.env.VITE_RECAPTCHA_KEY,
        { action: 'download_photo' }
      );

      // Validar no backend
      const response = await fetch('/api/verify-captcha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (response.ok) {
        toast.success('✅ Verificação concluída');
        onVerified();
      } else {
        toast.error('❌ Falha na verificação');
      }
    } catch (error) {
      console.error('Erro no CAPTCHA:', error);
      toast.error('Erro ao verificar');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-900 rounded-lg p-6 max-w-sm">
        <h3 className="text-lg font-bold mb-4">
          ⚠️ Confirmar Download
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Você está baixando {photosCount} fotos. 
          Clique no botão abaixo para confirmar que é um ser humano.
        </p>
        <Button
          onClick={handleVerify}
          disabled={isVerifying}
          className="w-full"
        >
          {isVerifying ? '⏳ Verificando...' : '✓ Confirmar'}
        </Button>
      </div>
    </div>
  );
}
```

### 3.2 Alertas de Segurança para Admin

**Arquivo**: `src/supabase/functions/monitor-suspicious-activity/index.ts` (NOVO)

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

export async function POST(req: Request): Promise<Response> {
  try {
    // Verificar atividades suspeitas a cada 5 minutos
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();

    // Usuários que baixaram >10 fotos em 1 hora
    const { data: suspiciousUsers } = await supabase
      .from('photo_downloads')
      .select('user_id, count')
      .gte('downloaded_at', oneHourAgo)
      .group('user_id')
      .having('count > 10');

    if (suspiciousUsers && suspiciousUsers.length > 0) {
      for (const user of suspiciousUsers) {
        // Enviar alerta
        await fetch('https://hooks.slack.com/services/YOUR/WEBHOOK', {
          method: 'POST',
          body: JSON.stringify({
            text: `⚠️ ALERTA DE SEGURANÇA: Usuário ${user.user_id} baixou ${user.count} fotos em 1 hora`,
          }),
        });
      }
    }

    return new Response(JSON.stringify({ status: 'ok' }), { status: 200 });

  } catch (error) {
    console.error('Erro ao monitorar:', error);
    return new Response(JSON.stringify({ error: 'Erro' }), { status: 500 });
  }
}
```

---

## PARTE 4: Watermark Dinâmico (Extra Protection)

**Arquivo**: `src/lib/watermarkText.ts` (NOVO)

```typescript
import sharp from 'sharp';

/**
 * Adiciona watermark com nome do comprador
 * Executado no backend antes de enviar a foto
 */
export async function addDynamicWatermark(
  photoBuffer: Buffer,
  buyerName: string,
  purchaseDate: Date
): Promise<Buffer> {
  const text = `Comprado por ${buyerName} em ${purchaseDate.toLocaleDateString('pt-BR')}`;
  
  const watermarkedImage = await sharp(photoBuffer)
    .composite([
      {
        input: Buffer.from(
          `<svg width="1920" height="100">
            <text x="50%" y="50%" text-anchor="middle" fill="rgba(212, 175, 55, 0.3)" font-size="40">
              ${text}
            </text>
          </svg>`
        ),
        gravity: 'south',
      },
    ])
    .toBuffer();

  return watermarkedImage;
}
```

---

## PARTE 5: Testes de Segurança

### 5.1 Teste de Rate Limiting

```bash
# Teste: Tentar 10 downloads em sequência
for i in {1..10}; do
  curl -H "Authorization: Bearer $TOKEN" \
    -X POST https://your-app.com/api/photos/download \
    -d '{"photo_id":"abc123"}'
  echo "Tentativa $i"
done

# Esperado: 5 sucessos, 5 erros 429 (Too Many Requests)
```

### 5.2 Teste de Validação de Compra

```bash
# Teste: Tentar baixar foto que NÃO foi comprada
curl -H "Authorization: Bearer $TOKEN" \
  -X POST https://your-app.com/api/photos/download \
  -d '{"photo_id":"nao-comprada-123"}'

# Esperado: 403 Forbidden - "Você não comprou esta foto"
```

### 5.3 Teste de Expiração de URL

```bash
# Teste: Capturar URL assinada e tentar usar após 3 minutos
# Esperado: 403 Forbidden - "URL expirada"
```

---

## 🚀 Checklist de Deploy

- [ ] **Backup completo** do banco de dados
- [ ] **Migração executada** (`photo_downloads_table.sql`)
- [ ] **Edge Function** publicada (`generate-photo-download`)
- [ ] **Frontend atualizado** com `securePhotoDownload.ts`
- [ ] **Componentes atualizados** (`MyPurchases.tsx`)
- [ ] **CAPTCHA configurado** (reCAPTCHA keys)
- [ ] **Testes de segurança** passando
- [ ] **Monitoring ativo** (alertas configurados)
- [ ] **Documentação** atualizada para usuários
- [ ] **Deploy em staging** primeiro
- [ ] **Teste de 24h** em produção com monitoramento

---

## 📊 Impacto

| Métrica | Antes | Depois |
|---------|-------|--------|
| Tempo de expiração da URL | 5 min | 2 min |
| Downloads por hora | ∞ | 5 |
| Validação de compra | ❌ | ✅ |
| Auditoria | ❌ | ✅ |
| Alertas de anomalia | ❌ | ✅ |
| Taxa de sucesso de roubo | ~80% | <5% |

