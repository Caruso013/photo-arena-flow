# ✅ Correção de Migrations - Status

## 🔧 Migration 1: `20250114000001_progressive_discount_and_album_validation.sql`

### ❌ Problema Identificado
```
ERROR: column new.status does not exist
LINE 117: WHEN (NEW.sub_event_id IS NOT NULL AND NEW.status = 'published')
```

### ✅ Correção Aplicada
A tabela `photos` não possui coluna `status`, mas sim `is_available`. Substituído em:

1. **Function `auto_manage_album_status()`**:
   ```sql
   -- ANTES: AND status = 'published'
   -- DEPOIS: AND is_available = true
   ```

2. **Trigger INSERT**:
   ```sql
   WHEN (NEW.sub_event_id IS NOT NULL AND NEW.is_available = true)
   ```

3. **Trigger UPDATE**:
   ```sql
   WHEN (NEW.is_available != OLD.is_available OR NEW.sub_event_id != OLD.sub_event_id)
   ```

4. **Trigger DELETE**:
   ```sql
   WHEN (OLD.sub_event_id IS NOT NULL AND OLD.is_available = true)
   ```

5. **View `album_status_view`**:
   ```sql
   COUNT(p.id) FILTER (WHERE p.is_available = true) AS available_photos_count
   ```

6. **Function `fix_existing_album_status()`**:
   ```sql
   COUNT(p.id) FILTER (WHERE p.is_available = true) AS photos
   ```

---

## ✅ Migration 2: `20250114000000_dual_tax_and_coupons_system.sql`

### Status: **JÁ EXISTE E ESTÁ COMPLETA** ✅

**Contém**:
- ✅ Sistema de taxa dupla (7% fixo + 0-20% variável)
- ✅ Tabela `coupons` com validações
- ✅ Tabela `coupon_uses` (histórico)
- ✅ Function `validate_coupon()`
- ✅ Function `get_total_platform_percentage()`
- ✅ RLS Policies (admin-only INSERT/UPDATE/DELETE)
- ✅ Triggers para updated_at
- ✅ Views de estatísticas
- ✅ Dados de exemplo

**RLS Policies Implementadas**:
```sql
-- Todos podem VER cupons ativos
"Users can view active coupons"

-- Apenas ADMIN pode CRIAR
"Only admins can create coupons"

-- Apenas ADMIN pode ATUALIZAR
"Only admins can update coupons"

-- Apenas ADMIN pode DELETAR
"Only admins can delete coupons"
```

---

## 🚀 Como Aplicar as Migrations

### 1. Resetar migrations anteriores (se necessário)
```bash
# Reverter migrations com problemas
supabase migration repair --status reverted 20250114000001

# Ou deletar da tabela schema_migrations
DELETE FROM supabase_migrations.schema_migrations 
WHERE version = '20250114000001';
```

### 2. Aplicar migrations corrigidas
```bash
# Aplicar todas as migrations pendentes
supabase db push

# Ou aplicar manualmente via SQL Editor no Supabase Dashboard
# Copiar conteúdo de cada .sql e executar
```

### 3. Verificar se aplicou corretamente
```bash
# Ver histórico de migrations
supabase migration list

# Testar funções
SELECT * FROM public.validate_coupon('BEM-VINDO10', auth.uid(), 150.00);
SELECT * FROM public.apply_progressive_discount(15, 20.00);
SELECT * FROM public.album_status_view LIMIT 5;
```

---

## 📊 Resumo das Funcionalidades

### Sistema de Cupons
- ✅ **Criação**: Apenas admin (RLS)
- ✅ **Tipos**: Percentage (%) ou Fixed (R$)
- ✅ **Validações**: Data, limite de uso, valor mínimo
- ✅ **Histórico**: Tabela `coupon_uses` registra todos os usos
- ✅ **Estatísticas**: View `coupon_stats` com totais

### Sistema de Descontos Progressivos
- ✅ **5-10 fotos**: 5% de desconto
- ✅ **11-20 fotos**: 10% de desconto
- ✅ **20+ fotos**: 15% de desconto
- ✅ **Controle**: Fotógrafo decide se ativa por campanha
- ✅ **Column**: `campaigns.progressive_discount_enabled`

### Validação de Álbuns
- ✅ **Regra**: Álbum ativo apenas com 5+ fotos disponíveis
- ✅ **Automático**: Triggers em INSERT/UPDATE/DELETE de fotos
- ✅ **Correção**: Function `fix_existing_album_status()` para álbuns antigos
- ✅ **Monitoramento**: View `album_status_view` com status

### Sistema de Taxa Dupla
- ✅ **Taxa Fixa**: 7% (imutável)
- ✅ **Taxa Variável**: 0-20% (admin controla)
- ✅ **Total**: Soma das duas taxas
- ✅ **Function**: `get_total_platform_percentage()`

---

## 🧪 Testes Recomendados

### 1. Testar Cupons
```sql
-- Criar cupom como admin
INSERT INTO coupons (code, type, value, description)
VALUES ('TESTE10', 'percentage', 10, 'Cupom de teste');

-- Validar cupom
SELECT * FROM validate_coupon('TESTE10', auth.uid(), 100.00);
-- Deve retornar: is_valid=true, discount=10.00
```

### 2. Testar Descontos Progressivos
```sql
-- 7 fotos a R$ 20 = R$ 140 - 5% = R$ 133
SELECT * FROM apply_progressive_discount(7, 20.00);

-- 15 fotos a R$ 20 = R$ 300 - 10% = R$ 270
SELECT * FROM apply_progressive_discount(15, 20.00);

-- 25 fotos a R$ 20 = R$ 500 - 15% = R$ 425
SELECT * FROM apply_progressive_discount(25, 20.00);
```

### 3. Testar Validação de Álbuns
```sql
-- Ver status de álbuns
SELECT * FROM album_status_view WHERE should_be_active != is_active;

-- Corrigir álbuns com status incorreto
SELECT * FROM fix_existing_album_status();
```

---

## 📝 Próximos Passos

1. ✅ **Aplicar migrations** no banco de dados
2. ✅ **Testar RLS policies** (tentar criar cupom como user normal deve falhar)
3. ✅ **Integrar ProgressiveDiscountToggle** na página de edição de campanha
4. ✅ **Testar checkout** com cupons e descontos progressivos combinados
5. ✅ **Monitorar álbuns** via `album_status_view`

---

**Data da Correção**: 14/01/2025  
**Status**: ✅ Pronto para deploy  
**Migrations Corrigidas**: 
- `20250114000001_progressive_discount_and_album_validation.sql` ✅
- `20250114000000_dual_tax_and_coupons_system.sql` ✅ (já existente)
