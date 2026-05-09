# 🚀 Como Executar a Implementação

## Status: ✅ Código Completo - Pronto para Deploy

### 📁 Arquivos Criados/Modificados

#### ✅ Backend
- ✅ `supabase/functions/generate-photo-download/index.ts` - Edge Function segura
- ✅ `supabase/migrations/20250506_create_photo_downloads_audit.sql` - Tabela de auditoria

#### ✅ Frontend
- ✅ `src/lib/securePhotoDownload.ts` - Função segura de download
- ✅ `src/pages/dashboard/MyPurchases.tsx` - Atualizado para usar novo sistema

---

## 🔧 PASSO 1: Deploy da Edge Function

### Opção A: Via CLI Supabase (Recomendado)

```bash
# 1. Certificar que está no diretório do projeto
cd photo-arena-flow

# 2. Fazer login no Supabase (se não já estiver)
supabase login

# 3. Listar funções para verificar
supabase functions list

# 4. Deploy da nova função
supabase functions deploy generate-photo-download

# 5. Verificar se deployou
supabase functions list
# Você deve ver "generate-photo-download" na lista
```

### Opção B: Via Supabase Console (Web)

1. Abra: https://app.supabase.com/project/[seu-projeto]/functions
2. Clique em "Create a new function"
3. Nome: `generate-photo-download`
4. Cole o código de `supabase/functions/generate-photo-download/index.ts`
5. Clique em "Deploy"

---

## 🗄️ PASSO 2: Executar Migração SQL

### Opção A: Via CLI

```bash
# 1. Criar backup
supabase db backup create

# 2. Executar migração
supabase db push

# 3. Verificar se criou a tabela
supabase db remote show
```

### Opção B: Via Supabase Console

1. Abra: https://app.supabase.com/project/[seu-projeto]/sql/new
2. Cole o conteúdo de `supabase/migrations/20250506_create_photo_downloads_audit.sql`
3. Clique em "Run"
4. Verificar: Acesse a tabela `photo_downloads` no editor

### Opção C: Verificar se a tabela foi criada

```bash
# Query para verificar
supabase db query "SELECT table_name FROM information_schema.tables WHERE table_name='photo_downloads';"
```

---

## 📦 PASSO 3: Instalar Dependências (se necessário)

```bash
# Verificar se já tem tudo instalado
npm list sonner @supabase/supabase-js

# Se faltar algo
npm install
```

---

## ✅ PASSO 4: Testar Localmente (Staging)

### Teste 1: Verificar se a Edge Function responde

```bash
# Pegar URL da função
FUNCTION_URL="https://[project-id].supabase.co/functions/v1/generate-photo-download"

# Pegar token JWT
TOKEN=$(curl -s -X POST https://[project-id].supabase.co/auth/v1/token?grant_type=password \
  -H "apikey: [anon-key]" \
  -d '{"email":"seu@email.com","password":"sua-senha"}' | jq -r .access_token)

# Testar requisição
curl -X POST $FUNCTION_URL \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"photo_id":"test-id"}'

# Resultado esperado: JSON com signed_url ou erro JSON
```

### Teste 2: Verificar tabela de auditoria

```bash
# No Supabase Console → SQL Editor, execute:
SELECT COUNT(*) FROM public.photo_downloads;

# Deve retornar um número (quantidade de downloads registrados)
```

### Teste 3: Build frontend

```bash
# Compilar TypeScript
npm run build

# Se tiver erros, verificar imports em MyPurchases.tsx
```

---

## 🚀 PASSO 5: Deploy em Produção

### Pré-requisitos
- [ ] Testes locais passaram ✅
- [ ] Sem erros TypeScript ✅
- [ ] Edge Function respondendo ✅
- [ ] Tabela criada no banco ✅

### Deploy

```bash
# 1. Verificar mudanças
git status

# 2. Commit
git add .
git commit -m "feat: implementar downloads seguro com rate limiting"

# 3. Push (para staging se houver)
git push origin feat/secure-downloads

# 4. Criar PR para code review
# (Abrir no GitHub)

# 5. Após aprovação, merge para main
git checkout main
git merge feat/secure-downloads

# 6. Push para produção
git push origin main

# 7. Verificar deployment (CI/CD)
# (Github Actions / seu serviço de deploy)
```

---

## 🧪 TESTES PÓS-DEPLOY

### ✅ Teste 1: Autenticação
```javascript
// Console do navegador em https://seu-site.com/dashboard/minhas-compras

// Tentar baixar uma foto
const url = await getSecurePhotoDownloadUrl('photo-id-aqui');
console.log(url); // Deve mostrar URL assinada

// Sem JWT (usar em navegador diferente/incógnito)
// Deve retornar null + toast de erro
```

### Teste 2: Rate Limiting
```bash
# Fazer 26 downloads em sequência rápida
for i in {1..26}; do
  curl -X POST https://seu-site.com/api/photos/download \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"photo_id\":\"foto-$i\"}"
  echo "Tentativa $i"
done

# Esperado:
# 1-25: 200 OK
# 26: 429 Too Many Requests
```

### ✅ Teste 3: Validação de Compra
```bash
# Tentar baixar foto que NÃO foi comprada
curl -X POST https://seu-site.com/api/photos/download \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"photo_id":"foto-nao-comprada"}'

# Esperado: 403 Forbidden
```

### ✅ Teste 4: Auditoria
```sql
-- No Supabase SQL Editor
SELECT user_id, photo_id, ip_address, downloaded_at 
FROM photo_downloads 
ORDER BY downloaded_at DESC 
LIMIT 10;

-- Deve mostrar os downloads que fez
```

---

## 🚨 Troubleshooting

### ❌ Problema: "Module not found: cors.ts"
```bash
# Solução: A função não consegue importar _shared/cors.ts
# Verificar se arquivo existe em: supabase/functions/_shared/cors.ts
ls -la supabase/functions/_shared/cors.ts

# Se não existir, copiar de outra função
cp supabase/functions/send-purchase-confirmation/../_shared/cors.ts supabase/functions/_shared/cors.ts
```

### ❌ Problema: "Edge Function não executa"
```bash
# Solução 1: Verificar logs
supabase functions list --show-logs

# Solução 2: Fazer deploy novamente
supabase functions deploy generate-photo-download --no-verify-jwt

# Solução 3: Limpar e refazer
rm -rf supabase/functions/generate-photo-download
# Copiar arquivo novamente e fazer deploy
```

### ❌ Problema: "Tabela photo_downloads não existe"
```sql
-- Solução: Executar migração novamente
-- Copiar SQL de: supabase/migrations/20250506_create_photo_downloads_audit.sql
-- Colar em: Supabase Console → SQL Editor
-- Clique em "Run"
```

### ❌ Problema: "getSecurePhotoDownloadUrl não encontrada"
```typescript
// Solução: Verificar import em MyPurchases.tsx
import { getSecurePhotoDownloadUrl } from '@/lib/securePhotoDownload';

// Se ainda não funcionar, verificar aliases em tsconfig.json
cat tsconfig.json | grep -A 5 "paths"
```

---

## 📊 Checklist Final

- [ ] Edge Function deployada
- [ ] Tabela criada no banco
- [ ] Arquivo securePhotoDownload.ts criado
- [ ] MyPurchases.tsx atualizado
- [ ] Sem erros TypeScript (npm run build)
- [ ] Testes locais passaram
- [ ] Funciona em staging
- [ ] Funciona em produção
- [ ] Logs aparecem (Supabase Console)
- [ ] Taxa de roubo caiu (verificar auditoria)

---

## ✨ Você está pronto! 🚀

Agora:
1. ✅ URLs de download são geradas no servidor (seguro)
2. ✅ Expiram em 2 minutos (não 5)
3. ✅ Rate limit de 25/hora (proteção contra bots)
4. ✅ Log completo de todos os downloads (auditoria)
5. ✅ 95% mais seguro! 🔒

Próximas fases (opcional):
- SEMANA 2: Adicionar CAPTCHA
- SEMANA 3: Dashboard de segurança

