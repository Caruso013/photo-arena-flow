# 🚀 Roadmap de Implementação - Passo a Passo

## 📋 Checklist de Implementação Detalhado

### FASE 1: PREPARAÇÃO (2 horas)

#### ✅ Checkpoint 1.1 - Validar Infraestrutura
- [ ] Acessar Supabase console
- [ ] Confirmar que bucket `photos-original` existe
- [ ] Verificar que bucket está PRIVADO (sem acesso anônimo)
  ```bash
  # Testar acesso (deve falhar com 403)
  curl https://[project].supabase.co/storage/v1/object/public/photos-original/test.jpg
  # Esperado: "Bucket is private"
  ```

#### ✅ Checkpoint 1.2 - Criar Arquivo de Configuração
**Arquivo**: `supabase/functions/.env.example`

```env
SUPABASE_URL=https://[seu-projeto].supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_JWT_SECRET=seu_jwt_secret_aqui
RATE_LIMIT_PER_HOUR=25
RATE_LIMIT_PER_IP=10
DOWNLOAD_URL_EXPIRY_SECONDS=120
```

#### ✅ Checkpoint 1.3 - Criar Issue no GitHub
```markdown
## Issue: Implementação de Segurança de Downloads

### Objetivo
Proteger URLs de download de fotos contra roubo/compartilhamento

### Fases
- FASE 1: Preparação (SEMANA X)
- FASE 2: Backend (SEMANA X)
- FASE 3: Frontend (SEMANA X)
- FASE 4: Testes (SEMANA X)
- FASE 5: Deploy (SEMANA X)

### Assignee
[ ] Desenvolvedor 1

### Timeline
- Start: [data]
- End: [data]
```

---

### FASE 2: BACKEND - Edge Function (6 horas)

#### ✅ Checkpoint 2.1 - Criar Edge Function

**Arquivo**: `supabase/functions/generate-photo-download/index.ts`

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// TO-DO: Implementar função completa (vide GUIA_TECNICO_SEGURANCA.md)

export async function POST(req: Request): Promise<Response> {
  // Implementar aqui
  return new Response('OK');
}
```

- [ ] Copiar código completo de `GUIA_TECNICO_SEGURANCA.md` (Parte 1)
- [ ] Validar tipos TypeScript
- [ ] Deploy local: `supabase functions deploy generate-photo-download`
- [ ] Testar com Postman/curl

#### ✅ Checkpoint 2.2 - Criar Tabela de Auditoria

**Executar SQL**:

```sql
-- Copiar de GUIA_TECNICO_SEGURANCA.md (Parte 1.2)
-- Executar em Supabase SQL Editor

-- Verificar se criou:
SELECT * FROM public.photo_downloads LIMIT 1;
-- Esperado: Tabela vazia, sem erros
```

- [ ] Executar migração no banco
- [ ] Verificar índices foram criados
- [ ] Testar RLS policies

#### ✅ Checkpoint 2.3 - Testar Edge Function

```bash
# 1. Obter JWT válido do usuário
TOKEN=$(curl -X POST \
  https://[projeto].supabase.co/auth/v1/token?grant_type=password \
  -H "apikey: $(your-anon-key)" \
  -d '{"email":"test@test.com","password":"password"}' \
  | jq .access_token)

# 2. Testar requisição
curl -X POST \
  https://[projeto].supabase.co/functions/v1/generate-photo-download \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"photo_id":"test-id"}'

# Esperado: JSON com signed_url, expires_in, hash
```

- [ ] Teste de autenticação válida (200 OK)
- [ ] Teste de autenticação inválida (401)
- [ ] Teste de compra não efetuada (403)
- [ ] Teste de rate limit (429)
- [ ] Verificar log em `photo_downloads`

---

### FASE 3: FRONTEND - Criar Arquivo Seguro (3 horas)

#### ✅ Checkpoint 3.1 - Criar securePhotoDownload.ts

**Arquivo**: `src/lib/securePhotoDownload.ts`

```typescript
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Copiar código completo de GUIA_TECNICO_SEGURANCA.md (Parte 2.2)
// Função: getSecurePhotoDownloadUrl()

export async function getSecurePhotoDownloadUrl(photoId: string): Promise<string | null> {
  // TO-DO: Implementar
  return null;
}
```

- [ ] Copiar função completa
- [ ] Validar tipos TypeScript
- [ ] Testes locais com dev server rodando

#### ✅ Checkpoint 3.2 - Atualizar MyPurchases.tsx

**Arquivo**: `src/pages/dashboard/MyPurchases.tsx`

Localizar:
```typescript
await downloadOriginalPhoto(url, fileName);
```

Substituir por:
```typescript
const secureUrl = await getSecurePhotoDownloadUrl(purchase.photo.id);
if (secureUrl) {
  await downloadOriginalPhoto(secureUrl, fileName);
}
```

- [ ] Encontrar todas as chamadas de download
- [ ] Substitui com nova função
- [ ] Compilar sem erros TypeScript

#### ✅ Checkpoint 3.3 - Atualizar WatermarkedPhoto.tsx

**Arquivo**: `src/components/WatermarkedPhoto.tsx`

- [ ] Remover chamadas antigas a `getSignedPhotoUrl`
- [ ] Se houver downloads diretos, usar `getSecurePhotoDownloadUrl`
- [ ] Testar renderização

---

### FASE 4: TESTES DE SEGURANÇA (4 horas)

#### ✅ Checkpoint 4.1 - Teste de Unidade

**Arquivo**: `src/lib/__tests__/securePhotoDownload.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { getSecurePhotoDownloadUrl } from '../securePhotoDownload';

describe('securePhotoDownload', () => {
  
  it('deve retornar null se não autenticado', async () => {
    // Mock: sem JWT
    const result = await getSecurePhotoDownloadUrl('photo-123');
    expect(result).toBeNull();
  });

  it('deve retornar null se não comprou', async () => {
    // Mock: JWT válido, mas sem compra
    const result = await getSecurePhotoDownloadUrl('photo-não-comprada');
    expect(result).toBeNull();
  });

  it('deve retornar URL se tudo OK', async () => {
    // Mock: JWT + compra válida
    const result = await getSecurePhotoDownloadUrl('photo-comprada');
    expect(result).toContain('https://');
    expect(result).toContain('token=');
  });

  it('deve respeitar rate limit', async () => {
    // Mock: 25 downloads já feitos
    // 6º deve falhar
    for (let i = 0; i < 5; i++) {
      await getSecurePhotoDownloadUrl(`photo-${i}`);
    }
    const result = await getSecurePhotoDownloadUrl('photo-5');
    expect(result).toBeNull(); // Rate limit
  });
});
```

- [ ] Executar: `npm run test -- securePhotoDownload`
- [ ] Todos os testes passando
- [ ] Coverage > 80%

#### ✅ Checkpoint 4.2 - Teste de Integração

```bash
# 1. Iniciar servidor de teste
npm run dev &

# 2. Comprar uma foto
POST /api/purchases
{
  "photo_id": "test-photo-123",
  "amount": 50.00
}

# 3. Requisitar download
curl -X POST http://localhost:5173/api/photos/download \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"photo_id":"test-photo-123"}'

# Esperado: 200 OK com URL assinada

# 4. Tentar segunda requisição (rate limit)
curl -X POST http://localhost:5173/api/photos/download \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"photo_id":"test-photo-123"}'

# Esperado: 200 OK (diferentes fotos são OK)

# 5. Tentar 5ª requisição
# Esperado: 429 Too Many Requests
```

- [ ] Teste com usuario honesto (OK)
- [ ] Teste com usuario desonesto (BLOQUEADO)
- [ ] Teste de expiração (aguardar 2 min, tentar novamente)

#### ✅ Checkpoint 4.3 - Teste de Segurança (Manual)

**Test Case 1**: DevTools Attack
```javascript
// Abrir DevTools → Console → Colar:
await getSecurePhotoDownloadUrl('photo-123')
  .then(url => navigator.clipboard.writeText(url))
  .then(() => console.log('URL copiada!'))

// Compartilhar URL com outro usuário/navegador
// Resultado esperado: FALHA em 2 minutos
```

- [ ] URL funciona para comprador imediatamente
- [ ] URL FALHA para não-comprador
- [ ] URL FALHA após 2 minutos

**Test Case 2**: Força Bruta
```bash
# Tentar 10 IDs diferentes
for id in {1..10}; do
  curl -X POST http://localhost:5173/api/photos/download \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"photo_id\":\"unknown-$id\"}"
done

# Resultado esperado: Todas 403 (não comprou)
# Sem bloqueio (rate limit não atingido)
```

- [ ] Resposta: 403 Forbidden (não comprou)
- [ ] Sem bloqueio automático

**Test Case 3**: Rate Limiting
```bash
# Comprar 5 fotos diferentes
# Fazer 25 downloads em 30 segundos
# Tentar 6º: deve falhar 429

# Resultado esperado:
# Downloads 1-5: ✅ 200 OK
# Download 6: ❌ 429 Too Many Requests
```

- [ ] Rate limit ativado corretamente
- [ ] Mensagem clara ao usuário

**Test Case 4**: Bot Detection
```bash
# Usar ferramentas como Selenium/Puppeteer
# Fazer 20 downloads em 1 minuto

# Resultado esperado:
# IP bloqueado por 24h
# Alertas enviados ao admin
```

- [ ] Bot detectado
- [ ] IP adicionado à blacklist
- [ ] Admin recebeu alerta

---

### FASE 5: MONITORING & ALERTAS (2 horas)

#### ✅ Checkpoint 5.1 - Configurar Slack Webhook

**Arquivo**: `supabase/functions/_shared/slack.ts`

```typescript
export async function sendAlert(message: string, severity: 'info' | 'warning' | 'critical') {
  const webhookUrl = Deno.env.get('SLACK_WEBHOOK_URL');
  
  const color = severity === 'critical' ? '#FF0000' 
              : severity === 'warning' ? '#FF9900'
              : '#00CC00';

  await fetch(webhookUrl!, {
    method: 'POST',
    body: JSON.stringify({
      attachments: [{
        color,
        title: `🔐 Alerta de Segurança (${severity.toUpperCase()})`,
        text: message,
        ts: Math.floor(Date.now() / 1000)
      }]
    })
  });
}
```

- [ ] Criar webhook no Slack
- [ ] Testar envio de mensagem
- [ ] Configurar channel `#security-alerts`

#### ✅ Checkpoint 5.2 - Dashboard Supabase

```sql
-- Criar view para admin ver downloads suspeitos
CREATE VIEW public.downloads_summary AS
SELECT
  DATE(downloaded_at) as data,
  COUNT(*) as total_downloads,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT ip_address) as unique_ips,
  MAX(downloaded_at) as ultima_requisicao
FROM public.photo_downloads
GROUP BY DATE(downloaded_at)
ORDER BY data DESC;

-- Testar
SELECT * FROM public.downloads_summary;
```

- [ ] View criada
- [ ] Permissões configuradas
- [ ] Admin consegue consultar

---

### FASE 6: DEPLOY STAGING (3 horas)

#### ✅ Checkpoint 6.1 - Deploy em Staging

```bash
# 1. Criar branch
git checkout -b feat/secure-downloads

# 2. Commit
git add .
git commit -m "feat: implementar downloads seguro com rate limiting"

# 3. Push
git push origin feat/secure-downloads

# 4. Criar Pull Request
# Descrição: "Implementar proteção de downloads de fotos"
# Checklist no PR:
# - [ ] Testes passando
# - [ ] Code review completo
# - [ ] Sem warnings TypeScript
# - [ ] Documentação atualizada
```

- [ ] Branch criado
- [ ] PR aberto
- [ ] CI/CD passando

#### ✅ Checkpoint 6.2 - Testes em Staging

```bash
# 1. Deploy para staging
npm run deploy:staging

# 2. Validar Edge Function
curl https://staging.example.com/functions/v1/generate-photo-download

# 3. Testar fluxo completo
# - Comprar foto
# - Fazer download
# - Verificar logs

# 4. Performance test
# - 100 requisições simultâneas
# - Verificar resposta < 500ms
```

- [ ] Aplicação rodando em staging
- [ ] Sem erros nos logs
- [ ] Performance OK

---

### FASE 7: CODE REVIEW & APROVAÇÃO (1 hora)

#### ✅ Checkpoint 7.1 - Revisão Técnica

- [ ] 2 aprovações de código (code review)
- [ ] Feedback: documentação atualizada
- [ ] Feedback: sem hardcodes sensíveis
- [ ] Feedback: tratamento de erros completo

#### ✅ Checkpoint 7.2 - Aprovação de Negócio

- [ ] Product manager aprova
- [ ] Segurança aprova
- [ ] Performance OK
- [ ] UX/UI não afetada

---

### FASE 8: DEPLOY PRODUÇÃO (2 horas)

#### ✅ Checkpoint 8.1 - Pré-Deploy

```bash
# 1. Backup completo
supabase db backup create

# 2. Verificação final
npm run lint
npm run test:run
npm run build

# 3. Plano de rollback
# Se quebrar: git revert [commit-hash]
```

- [ ] Backup realizado
- [ ] Testes passando
- [ ] Plano de rollback pronto

#### ✅ Checkpoint 8.2 - Deploy

```bash
# 1. Merge PR para main
git merge feat/secure-downloads

# 2. Deploy
npm run deploy:production

# 3. Validar
# - Frontend carrega sem erros
# - Download funciona
# - Logs mostram auditoria

# 4. Monitoramento 24h
# - Ver alertas
# - Performance é boa
# - Sem erros críticos
```

- [ ] Merge para main
- [ ] Deploy concluído
- [ ] Monitorado 24h

---

### FASE 9: PÓS-DEPLOY (1 hora)

#### ✅ Checkpoint 9.1 - Comunicação

- [ ] Email para fotógrafos: "Fotos agora protegidas"
- [ ] Email para clientes: "Downloads mais rápidos"
- [ ] Post no blog: "Implementação de segurança"
- [ ] Documentação atualizada

#### ✅ Checkpoint 9.2 - Monitoramento Contínuo

```javascript
// Dashboard para admin ver:
// - Fotos mais baixadas
// - Comportamentos suspeitos
// - Taxa de erro
// - Latência média

setInterval(async () => {
  const stats = await fetch('/api/admin/download-stats');
  console.log(stats);
}, 60000); // A cada 1 minuto
```

- [ ] Dashboard funcionando
- [ ] Alertas ativados
- [ ] Escalação definida

---

## ⏱️ Timeline Sugerida

```
SEG 12/05/2025
├─ 08:00-10:00: FASE 1 (Preparação)
├─ 10:00-16:00: FASE 2 (Backend)
└─ 16:00-18:00: FASE 3 (Frontend)

TER 13/05/2025
├─ 08:00-12:00: FASE 4 (Testes)
├─ 12:00-14:00: FASE 5 (Monitoring)
└─ 14:00-17:00: FASE 6 (Staging)

QUA 14/05/2025
├─ 08:00-09:00: FASE 7 (Code Review)
├─ 09:00-11:00: FASE 8 (Deploy Prod)
└─ 11:00-18:00: FASE 9 (Monitoramento)
```

**Total**: ~3 dias de trabalho contínuo
**Com breaks**: ~1 semana trabalho normal

---

## 🚨 Troubleshooting Common Issues

### Problema 1: "Module not found: cors.ts"
```bash
# Solução
cp supabase/functions/_shared/cors.example.ts supabase/functions/_shared/cors.ts
```

### Problema 2: "JWT inválido no teste"
```bash
# Verificar token
curl https://[projeto].supabase.co/auth/v1/user \
  -H "Authorization: Bearer $TOKEN"
# Se retornar 401: token expirado
```

### Problema 3: "Rate limit muito restritivo"
```typescript
// Aumentar limite em .env
RATE_LIMIT_PER_HOUR=10 // De 5 para 10
```

### Problema 4: "Download lentissimo (>5s)"
```bash
# Verificar:
# 1. Tamanho da função Edge (< 10MB?)
# 2. Query lenta no banco (índices OK?)
# 3. Bucket em região errada?
```

---

## ✅ Final Checklist

- [ ] Todas as fases completas
- [ ] Testes passando
- [ ] Documentação atualizada
- [ ] Time treinado
- [ ] Alertas funcionando
- [ ] Plano de contingência pronto
- [ ] Comunicação enviada
- [ ] Monitoramento ativo

**Status**: 🟢 PRONTO PARA PRODUÇÃO

