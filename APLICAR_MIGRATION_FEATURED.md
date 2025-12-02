# INSTRUÇÕES PARA APLICAR MIGRATION NO SUPABASE

## ⚠️ AÇÃO NECESSÁRIA NO SUPABASE

A funcionalidade de **Eventos em Destaque** requer que você aplique a migration manualmente no Supabase.

### Passo a Passo:

1. **Acesse o Dashboard do Supabase:**
   - Vá para: https://supabase.com/dashboard
   - Selecione seu projeto: `photo-arena-flow`

2. **Abra o SQL Editor:**
   - No menu lateral, clique em **"SQL Editor"**
   - Clique em **"New query"**

3. **Cole e Execute o SQL abaixo:**

```sql
-- Adicionar coluna is_featured para marcar eventos em destaque
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

-- Criar índice para otimizar queries de eventos em destaque
CREATE INDEX IF NOT EXISTS idx_campaigns_featured 
ON campaigns(is_featured, created_at DESC) 
WHERE is_featured = true AND is_active = true;

-- Comentário
COMMENT ON COLUMN campaigns.is_featured IS 'Define se o evento aparece na seção de destaques da home';
```

4. **Clique em "Run" para executar**

5. **Após aplicar a migration:**
   - Descomente o código em `FeaturedEventsManager.tsx` (linhas 72-96)
   - Ative a busca por `is_featured` em `Home.tsx` (linha 69)
   - Faça um novo commit e push

### Verificar se foi aplicado:

```sql
-- Execute esta query para verificar se a coluna existe
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'campaigns' AND column_name = 'is_featured';
```

Se retornar uma linha com `is_featured | boolean | false`, a migration foi aplicada com sucesso! ✅

### Marcar eventos como destaque:

Após aplicar a migration, você pode marcar eventos manualmente:

```sql
-- Marcar evento como destaque
UPDATE campaigns 
SET is_featured = true 
WHERE id = 'seu-id-do-evento-aqui';

-- Ver todos os eventos em destaque
SELECT id, title, is_featured 
FROM campaigns 
WHERE is_featured = true;
```

---

## 📝 Arquivo da Migration

A migration completa está em:
`supabase/migrations/20251201000000_add_featured_campaigns.sql`
