# 🔍 Análise de Erros Potenciais - Photo Arena Flow

## ⚠️ PROBLEMAS CRÍTICOS ENCONTRADOS

### 1. 🚨 RECONHECIMENTO FACIAL - CORS E PERFORMANCE

**Arquivo**: `src/hooks/useFaceRecognition.ts`

#### Problema 1: CORS em Imagens Externas
```typescript
// Linha 262
const img = await faceapi.fetchImage(photo.watermarked_url || photo.thumbnail_url);
```

**Risco**: ❌ **ALTO**
- `faceapi.fetchImage()` pode falhar com erro CORS se as imagens estiverem em domínio diferente
- Imagens do Supabase Storage podem ter CORS restritivo
- Erro: `Access to fetch at 'URL' from origin has been blocked by CORS policy`

**Solução**:
```typescript
// Opção 1: Usar proxy ou configurar CORS no Supabase Storage
const img = document.createElement('img');
img.crossOrigin = 'anonymous'; // ⭐ Adicionar isso
img.src = photo.watermarked_url;
await new Promise((resolve, reject) => {
  img.onload = resolve;
  img.onerror = reject;
});
const detections = await faceapi.detectAllFaces(img, ...)
```

#### Problema 2: Loop Síncrono em Muitas Fotos
```typescript
// Linha 252-297
for (const photo of photos) {
  // Processa uma foto por vez (LENTO!)
  const img = await faceapi.fetchImage(...)
  const photoDetections = await faceapi.detectAllFaces(...)
}
```

**Risco**: ⚠️ **MÉDIO-ALTO**
- Se evento tem 500 fotos, levará 5+ minutos
- Bloqueia UI completamente
- Browser pode mostrar "página não responde"
- Usuário pode fechar antes de terminar

**Solução**:
```typescript
// Processar em batches paralelos
const BATCH_SIZE = 10;
for (let i = 0; i < photos.length; i += BATCH_SIZE) {
  const batch = photos.slice(i, i + BATCH_SIZE);
  const batchResults = await Promise.all(
    batch.map(photo => processPhoto(photo).catch(err => null))
  );
  matches.push(...batchResults.filter(Boolean));
}
```

#### Problema 3: Memória e Crashes
```typescript
// Carrega imagem completa na memória para cada foto
const img = await faceapi.fetchImage(photo.watermarked_url);
```

**Risco**: ⚠️ **MÉDIO**
- 500 fotos × 2MB cada = 1GB+ na memória
- Browser pode crashar em mobile
- Lentidão progressiva (memory leak)

**Solução**:
- Limitar a 50-100 fotos por busca
- Usar `thumbnail_url` ao invés de `watermarked_url`
- Limpar recursos: `img.remove()` após processar

---

### 2. 🔒 AUTENTICAÇÃO - Race Conditions

**Arquivo**: `src/contexts/AuthContext.tsx`

#### Problema: Estado Assíncrono
```typescript
useEffect(() => {
  supabase.auth.getSession().then(({ data: { session } }) => {
    setUser(session?.user ?? null);
    if (session?.user) {
      fetchProfile(session.user.id);
    }
  });
}, []);
```

**Risco**: ⚠️ **MÉDIO**
- Componentes podem renderizar antes de `user` estar pronto
- Queries podem falhar com "user is null"
- Proteção de rotas pode falhar

**Solução**:
```typescript
const [loading, setLoading] = useState(true);

useEffect(() => {
  setLoading(true);
  supabase.auth.getSession()
    .then(...)
    .finally(() => setLoading(false));
}, []);

// Nos componentes:
if (loading) return <Spinner />;
if (!user) return <Redirect to="/auth" />;
```

---

### 3. 💰 PAGAMENTO - Validações Faltando

**Arquivo**: `supabase/functions/create-payment-preference/index.ts`

#### Problema 1: Validação de Preço
```typescript
// Linha 68: Sem validação se preço mudou
const totalAmount = photos.reduce((sum, p) => sum + Number(p.price), 0);
```

**Risco**: 🚨 **CRÍTICO**
- Cliente pode manipular preço no frontend
- Enviar foto de R$50 mas pagar R$5
- Fotógrafo perde dinheiro

**Solução**:
```typescript
// Buscar preços REAIS do banco, não confiar no cliente
const { data: realPhotos } = await supabase
  .from('photos')
  .select('id, price')
  .in('id', photoIds);

const totalAmount = realPhotos.reduce((sum, p) => sum + Number(p.price), 0);

// Comparar com o que cliente enviou
if (Math.abs(totalAmount - clientTotal) > 0.01) {
  throw new Error('Preços não conferem');
}
```

#### Problema 2: Race Condition em Compras
```typescript
// Linha 73-91: Insere purchases em loop
for (const photo of photos) {
  await supabase.from('purchases').insert({...});
}
```

**Risco**: ⚠️ **MÉDIO**
- Se webhook chegar antes do loop terminar, compra parcial
- Usuário pode receber algumas fotos, outras não
- Difícil reverter transação

**Solução**:
```typescript
// Inserir tudo de uma vez (transação atômica)
const purchases = photos.map(photo => ({...}));
const { data, error } = await supabase
  .from('purchases')
  .insert(purchases)
  .select();

if (error || !data || data.length !== photos.length) {
  throw new Error('Falha ao criar todas as compras');
}
```

---

### 4. 📸 UPLOAD DE FOTOS - Falta Validação

**Arquivo**: Componentes de upload

#### Problema: Sem Validação de Tamanho/Tipo
```typescript
// Uploads aceitam qualquer arquivo
const { error } = await supabase.storage
  .from('photos')
  .upload(filePath, file);
```

**Risco**: ⚠️ **MÉDIO**
- Usuário pode enviar vídeo de 4GB
- Arquivos maliciosos (executáveis)
- Estouro de storage/custos

**Solução**:
```typescript
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

if (file.size > MAX_SIZE) {
  throw new Error('Arquivo muito grande (máximo 10MB)');
}

if (!ALLOWED_TYPES.includes(file.type)) {
  throw new Error('Tipo de arquivo não permitido');
}

// Validar dimensões
const img = new Image();
img.src = URL.createObjectURL(file);
await img.decode();
if (img.width < 800 || img.height < 600) {
  throw new Error('Imagem muito pequena (mínimo 800x600)');
}
```

---

### 5. 🔄 WEBHOOK MERCADO PAGO - Problemas de Idempotência

**Arquivo**: `supabase/functions/mercadopago-webhook/index.ts`

#### Problema: Webhook Duplicado
```typescript
// Linha 102-121: Atualiza purchase sem verificar
const { error: updateError } = await supabase
  .from('purchases')
  .update({ status: purchaseStatus })
  .eq('id', pid);
```

**Risco**: ⚠️ **MÉDIO**
- Mercado Pago envia webhook múltiplas vezes
- Pode processar pagamento 2x
- Enviar 2 emails de confirmação
- Creditar 2x o saldo do fotógrafo

**Solução**:
```typescript
// Verificar status anterior
const { data: currentPurchase } = await supabase
  .from('purchases')
  .select('status')
  .eq('id', pid)
  .single();

// Só atualizar se mudou
if (currentPurchase?.status === purchaseStatus) {
  console.log(`Purchase ${pid} já está com status ${purchaseStatus}, skip`);
  continue;
}

// Adicionar log de webhook processado
await supabase.from('webhook_logs').insert({
  webhook_id: req.headers.get('x-request-id'),
  type: 'mercadopago',
  payload: JSON.stringify(body),
  processed_at: new Date()
});
```

---

### 6. 🗄️ QUERIES SEM PAGINAÇÃO

**Múltiplos arquivos**

#### Problema: SELECT * sem LIMIT
```typescript
// Busca TODAS as fotos do fotógrafo
const { data } = await supabase
  .from('photos')
  .select('*')
  .eq('photographer_id', userId);
```

**Risco**: ⚠️ **MÉDIO**
- Fotógrafo com 10.000 fotos = query de 100MB
- Travamento do browser
- Timeout em mobile

**Solução**:
```typescript
// Sempre paginar
const PAGE_SIZE = 50;
const { data, count } = await supabase
  .from('photos')
  .select('*', { count: 'exact' })
  .eq('photographer_id', userId)
  .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
  .order('created_at', { ascending: false });

// Implementar infinite scroll ou paginação
```

---

### 7. 💳 VAZAMENTO DE CHAVES PIX

**Arquivo**: `src/components/dashboard/PhotographerDashboard.tsx`

#### Problema: Chave PIX Visível
```typescript
// Linha 250+: Salva PIX sem hash
const { error } = await supabase
  .from('payout_requests')
  .insert({
    pix_key: pixKey.trim(), // ⚠️ Plain text
    recipient_name: recipientName
  });
```

**Risco**: ⚠️ **MÉDIO**
- Admin vê chaves PIX de todos fotógrafos
- Vazamento em logs
- Dados sensíveis sem criptografia

**Solução**:
```typescript
// Backend: Criptografar antes de salvar
import { encryptPII } from './crypto';

const encryptedPix = await encryptPII(pixKey);

// Frontend: Mascarar ao exibir
const maskedPix = pixKey.replace(/(.{3})(.+)(.{4})/, '$1***$3');
// CPF: 123.456.789-12 → 123.***-12
```

---

### 8. 🎯 RECONHECIMENTO FACIAL - Threshold Muito Baixo

**Arquivo**: `src/hooks/useFaceRecognition.ts` (Linha 280)

```typescript
// Se similaridade > 40%, considerar um match
if (similarity > 0.4) {
  matches.push({...});
}
```

**Risco**: ⚠️ **BAIXO-MÉDIO**
- 40% similaridade = muitos falsos positivos
- Usuário vê fotos de outras pessoas parecidas
- Reclamações de precisão

**Solução**:
```typescript
// Aumentar threshold
const MIN_SIMILARITY = 0.6; // 60% mínimo

// Adicionar confiança no resultado
if (similarity > MIN_SIMILARITY) {
  matches.push({
    ...
    confidence: similarity > 0.8 ? 'alta' : 'média'
  });
}

// Avisar usuário sobre matches de baixa confiança
toast({
  title: `${matches.length} fotos encontradas`,
  description: matches.filter(m => m.similarity < 0.7).length > 0
    ? 'Algumas fotos podem ter baixa confiança'
    : 'Todas com alta confiança!'
});
```

---

### 9. 📧 EMAIL - Falta Rate Limiting

**Arquivo**: `supabase/functions/send-*-email/index.ts`

#### Problema: Spam Desprotegido
```typescript
// Nenhuma proteção contra múltiplos envios
const { data, error } = await resend.emails.send({...});
```

**Risco**: ⚠️ **MÉDIO**
- Usuário pode spammar botão
- 100 emails por segundo
- Ban da conta Resend
- Custos extras

**Solução**:
```typescript
// Verificar últimos emails
const { data: recentEmails } = await supabase
  .from('email_logs')
  .select('sent_at')
  .eq('recipient', email)
  .eq('type', 'purchase_confirmation')
  .gte('sent_at', new Date(Date.now() - 60000)) // Último minuto
  .order('sent_at', { ascending: false });

if (recentEmails && recentEmails.length >= 3) {
  throw new Error('Limite de emails atingido. Aguarde 1 minuto.');
}

// Log após enviar
await supabase.from('email_logs').insert({
  recipient: email,
  type: 'purchase_confirmation',
  sent_at: new Date()
});
```

---

### 10. 🔐 RLS - Possível Vazamento de Dados

**Arquivo**: Várias queries sem filtro de usuário

#### Problema: Queries Sem WHERE user_id
```typescript
// ❌ Busca TODAS as compras (mesmo de outros usuários)
const { data } = await supabase
  .from('purchases')
  .select('*')
  .eq('status', 'completed');
```

**Risco**: 🚨 **CRÍTICO se RLS estiver OFF**
- Se RLS não estiver habilitado, vaza dados
- Usuário A vê compras do usuário B
- Dados sensíveis expostos

**Verificação**:
```sql
-- Verificar se RLS está ativo
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Deve retornar rowsecurity = true para:
-- purchases, photos, campaigns, profiles, payout_requests
```

**Solução**:
```typescript
// Sempre filtrar por usuário no frontend
const { data } = await supabase
  .from('purchases')
  .select('*')
  .eq('buyer_id', user.id) // ⭐ Sempre adicionar
  .eq('status', 'completed');
```

---

## 📊 RESUMO DE RISCOS

### 🚨 CRÍTICOS (Resolver Imediatamente)
1. ✅ **Validação de preços** - Cliente pode manipular valores
2. ⚠️ **RLS verificação** - Possível vazamento de dados

### ⚠️ ALTOS (Resolver em 1 semana)
1. **CORS em face recognition** - Vai falhar em produção
2. **Performance face recognition** - Timeout em eventos grandes
3. **Race conditions em pagamento** - Compras parciais

### 🟡 MÉDIOS (Resolver em 1 mês)
1. Upload sem validação
2. Webhook duplicados
3. Queries sem paginação
4. Vazamento de PIX
5. Email sem rate limit

### 🟢 BAIXOS (Melhorias futuras)
1. Threshold reconhecimento facial
2. Memory leaks em processamento

---

## ✅ RECOMENDAÇÕES IMEDIATAS

### 1. Adicionar Validações Críticas
```typescript
// validations.ts
export const validatePhoto = (file: File) => {
  if (file.size > 10 * 1024 * 1024) throw new Error('Arquivo muito grande');
  if (!['image/jpeg', 'image/png'].includes(file.type)) {
    throw new Error('Tipo inválido');
  }
};

export const validatePrice = async (photoIds: string[], clientTotal: number) => {
  const { data } = await supabase
    .from('photos')
    .select('price')
    .in('id', photoIds);
  
  const realTotal = data.reduce((sum, p) => sum + p.price, 0);
  if (Math.abs(realTotal - clientTotal) > 0.01) {
    throw new Error('Preços não conferem');
  }
};
```

### 2. Adicionar Rate Limiting
```typescript
// rateLimit.ts
const limits = new Map<string, number[]>();

export const checkRateLimit = (key: string, maxRequests = 5, windowMs = 60000) => {
  const now = Date.now();
  const timestamps = limits.get(key) || [];
  const recent = timestamps.filter(t => now - t < windowMs);
  
  if (recent.length >= maxRequests) {
    throw new Error('Limite de requisições atingido');
  }
  
  limits.set(key, [...recent, now]);
};
```

### 3. Configurar CORS no Supabase Storage
```sql
-- No dashboard do Supabase > Storage > Settings
-- Adicionar:
{
  "allowedOrigins": ["https://seudominio.com"],
  "allowedMethods": ["GET", "HEAD"],
  "allowedHeaders": ["*"],
  "exposeHeaders": [],
  "maxAge": 3600
}
```

### 4. Monitoramento de Erros
```typescript
// Adicionar Sentry ou similar
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "YOUR_DSN",
  environment: import.meta.env.MODE,
  tracesSampleRate: 1.0,
});

// Wrapper para funções críticas
const safeExecute = async (fn, context) => {
  try {
    return await fn();
  } catch (error) {
    Sentry.captureException(error, { tags: { context } });
    throw error;
  }
};
```

---

## 🧪 TESTES RECOMENDADOS

### Casos de Teste Críticos
1. [ ] Tentar comprar foto alterando preço no DevTools
2. [ ] Enviar 500 fotos para reconhecimento facial
3. [ ] Clicar "Comprar" 10x seguidas rapidamente
4. [ ] Upload de arquivo de 100MB
5. [ ] Buscar fotos sem estar logado
6. [ ] Processar webhook 2x com mesmo ID
7. [ ] Deletar foto enquanto outro usuário está comprando
8. [ ] Solicitar saque de R$ 999999999

---

**Criado em**: 17 de Novembro de 2025  
**Última atualização**: Hoje  
**Status**: 🔴 Ação Necessária
