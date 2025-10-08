# 🔧 Correção - Download de Fotos "Bucket not found"

## 🐛 Problema Identificado

**Erro**: `{"statusCode":"404","error":"Bucket not found","message":"Bucket not found"}`

**Causa**: O sistema está tentando baixar fotos, mas os **buckets de storage não existem** no Supabase.

---

## ✅ Correções Aplicadas

### 1. **Código de Download Melhorado** 🔧

**Antes** (UserDashboard.tsx):
```typescript
// Simplesmente tentava acessar a URL diretamente
const link = document.createElement('a');
link.href = photo.photo.original_url;
link.click();
```

**Depois** (UserDashboard.tsx):
```typescript
// Usa o método correto do Supabase Storage
const { data: fileData, error } = await supabase.storage
  .from('photos-original')
  .download(filePath);

// Cria blob local e faz download
const url = URL.createObjectURL(fileData);
// ... código de download
```

**Melhorias**:
- ✅ Usa API correta do Supabase
- ✅ Tratamento de erros específicos
- ✅ Mensagens claras para o usuário
- ✅ Extração correta do caminho do arquivo

---

## 🎯 Solução Completa

### **PASSO 1: Executar Script SQL** ⚠️ CRÍTICO

O erro acontece porque os **buckets não existem**. Você DEVE executar o script SQL:

```bash
# No Supabase Dashboard → SQL Editor
# Execute o arquivo: fix_storage_policies.sql
```

O que o script faz:
1. ✅ Cria bucket `photos-original` (privado)
2. ✅ Cria bucket `photos-watermarked` (público)
3. ✅ Cria bucket `photos-thumbnails` (público)
4. ✅ Cria bucket `campaign-covers` (público)
5. ✅ Cria bucket `avatars` (público)
6. ✅ Configura políticas de acesso corretas

### **PASSO 2: Código Já Corrigido** ✅

- ✅ `UserDashboard.tsx` - Download melhorado
- ✅ Tratamento de erros específico
- ✅ Mensagens claras para usuário

---

## 📊 Status

### **Antes**:
```
Usuário clica em "Baixar"
    ↓
Sistema tenta acessar bucket
    ↓
❌ Erro: "Bucket not found"
    ↓
Download falha
```

### **Depois (após executar SQL)**:
```
Usuário clica em "Baixar"
    ↓
Sistema acessa bucket corretamente
    ↓
✅ Download via Supabase Storage
    ↓
Foto baixada com sucesso
```

---

## 🚀 Como Resolver AGORA

### **1. Execute o Script SQL** (5 minutos):

1. Abra o Supabase Dashboard
2. Vá em: **SQL Editor**
3. Copie TODO o conteúdo de: `fix_storage_policies.sql`
4. Cole no editor
5. Clique em **"Run"**
6. Aguarde confirmação ✅

### **2. Teste o Download**:

1. Faça login na aplicação
2. Vá em "Minhas Compras" ou "Dashboard"
3. Clique em "Baixar" em uma foto comprada
4. ✅ Download deve funcionar perfeitamente

---

## 💡 Mensagens de Erro Melhoradas

O código agora mostra mensagens específicas:

| Erro | Mensagem ao Usuário |
|------|---------------------|
| `Bucket not found` | "O sistema de armazenamento não está configurado. Entre em contato com o suporte." |
| `Object not found` | "Arquivo não encontrado. A foto pode ter sido removida." |
| `Unauthorized` | "Você não tem permissão para baixar esta foto." |
| Outros | "Não foi possível baixar a foto." |

---

## 🎯 Prioridade

### **CRÍTICO - EXECUTAR AGORA**:
⚠️ **fix_storage_policies.sql** - Sem isso, downloads NÃO funcionam

### **Já Resolvido**:
✅ Código de download melhorado
✅ Tratamento de erros
✅ UX melhorada

---

## 📝 Arquivos Modificados

```
src/components/dashboard/UserDashboard.tsx
  └─ handleDownload() - Reescrito com método correto
```

---

## 🔍 Verificação

Após executar o script SQL, verifique:

```sql
-- No Supabase SQL Editor
-- Verificar se buckets foram criados
SELECT * FROM storage.buckets;

-- Deve retornar:
-- photos-original (public: false)
-- photos-watermarked (public: true)
-- photos-thumbnails (public: true)
-- campaign-covers (public: true)
-- avatars (public: true)
```

---

## ✅ Resultado Esperado

### **Após executar fix_storage_policies.sql**:

1. ✅ Buckets criados no Supabase
2. ✅ Políticas de acesso configuradas
3. ✅ Download funcionando perfeitamente
4. ✅ Mensagens de erro claras
5. ✅ Upload de fotos funcionando

### **Fluxo Completo**:
```
Fotógrafo faz upload
    ↓
Foto salva em photos-original
    ↓
Usuário compra foto
    ↓
Usuário clica em "Baixar"
    ↓
Sistema busca do bucket
    ↓
✅ Download bem-sucedido
```

---

## 🆘 Troubleshooting

### **Se ainda não funcionar**:

1. **Verifique buckets**:
   ```sql
   SELECT * FROM storage.buckets;
   ```

2. **Verifique políticas**:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'objects';
   ```

3. **Console do navegador** (F12):
   - Veja erro específico
   - Compartilhe para análise

4. **Supabase Logs**:
   - Dashboard → Logs
   - Veja erros de storage

---

## 📞 Suporte

Se o problema persistir após executar o script:

1. ✅ Confirme que o script foi executado com sucesso
2. ✅ Verifique se os buckets existem
3. ✅ Limpe o cache do navegador (Ctrl+F5)
4. ✅ Tente em navegador anônimo
5. ✅ Veja console do navegador (F12)

---

**Data**: 08/10/2025  
**Status**: ✅ Código corrigido  
**Pendente**: ⚠️ Executar fix_storage_policies.sql