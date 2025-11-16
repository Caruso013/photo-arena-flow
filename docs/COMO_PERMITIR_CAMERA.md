# 📸 Como Permitir Câmera no Celular/Navegador

## 🤳 No Celular (Android/iPhone)

### **Android (Chrome/Firefox):**

1. **Primeira Vez:**
   - Quando abrir o modal, uma mensagem aparecerá pedindo permissão
   - Toque em **"Permitir"** ou **"Allow"**

2. **Se Negou por Acidente:**
   - Toque no **ícone de cadeado 🔒** ou **"i"** ao lado da URL
   - Procure por **"Câmera"** ou **"Camera"**
   - Mude para **"Permitir"**
   - Recarregue a página

3. **Configurações do Android:**
   - Vá em **Configurações** > **Apps** > **Chrome/Firefox**
   - Toque em **Permissões**
   - Encontre **Câmera**
   - Selecione **"Permitir sempre"**

### **iPhone (Safari/Chrome):**

1. **Primeira Vez:**
   - Quando abrir o modal, aparecerá popup pedindo permissão
   - Toque em **"Permitir"** ou **"OK"**

2. **Se Negou por Acidente:**
   - Toque em **"AA"** na barra de endereço
   - Toque em **"Configurações do Site"**
   - Encontre **"Câmera"**
   - Mude para **"Permitir"**
   - Recarregue a página

3. **Configurações do iPhone:**
   - Vá em **Ajustes** > **Safari** (ou **Chrome**)
   - Role até **"Câmera"**
   - Certifique-se que está **LIGADO** (verde)

## 💻 No Computador

### **Google Chrome:**
1. Clique no **ícone de câmera 🎥** ou **cadeado 🔒** na barra de endereço
2. Ao lado de "Câmera", clique na seta
3. Selecione **"Sempre permitir"**
4. Recarregue a página (F5)

### **Firefox:**
1. Clique no **ícone de câmera 🎥** na barra de endereço
2. Marque **"Lembrar desta decisão"**
3. Clique em **"Permitir"**

### **Edge:**
1. Clique no **cadeado 🔒** na barra de endereço
2. Clique em **"Permissões para este site"**
3. Ao lado de "Câmera", selecione **"Permitir"**

## 🚨 Problemas Comuns

### ❌ **"Nenhuma câmera detectada"**
- Verifique se seu dispositivo tem câmera
- No celular, verifique se não está coberta
- Tente fechar e abrir o navegador novamente

### ❌ **"Câmera em uso por outro aplicativo"**
- Feche outros apps que usam câmera (Zoom, Teams, WhatsApp Web, etc)
- Feche outras abas do navegador
- Reinicie o navegador

### ❌ **"Acesso negado"**
- Siga as instruções acima para permitir câmera
- Em alguns celulares antigos, pode não funcionar
- Use navegador atualizado (Chrome 53+ ou Safari 11+)

### ❌ **"SecurityError" ou "HTTPS required"**
- Em desenvolvimento: use `localhost` (já funciona)
- Em produção: site PRECISA estar em `https://` (não `http://`)

## 🎯 Testando se Funciona

1. Acesse: **http://localhost:8080** (ou IP do seu PC na rede)
2. Entre em qualquer evento
3. Clique no botão **🔍** (ícone de rosto) no header
4. Modal abre com câmera
5. Permita acesso quando solicitado
6. Você deve ver seu rosto na tela!

## 📋 Checklist de Permissões

- [ ] Navegador atualizado (Chrome 53+, Safari 11+, Firefox 36+)
- [ ] Câmera não está sendo usada por outro app
- [ ] Permissão de câmera PERMITIDA no navegador
- [ ] Permissão de câmera PERMITIDA nas configurações do sistema
- [ ] Site em HTTPS (ou localhost para desenvolvimento)
- [ ] Câmera física não está coberta/bloqueada

## 🔧 Para Desenvolvedores

### **Modo MOCK Atual:**
- ✅ Câmera funciona e captura foto
- 🎭 Detecção de rosto é SIMULADA (retorna dados fake)
- 🎭 Busca de fotos é SIMULADA (retorna 3 fotos placeholder)

### **Para Produção Real:**

Você precisa fazer deploy das Edge Functions no Supabase:

```bash
# 1. Fazer deploy das functions
supabase functions deploy detect-faces
supabase functions deploy find-photos-by-face

# 2. Configurar variáveis de ambiente (AWS Rekognition recomendado)
supabase secrets set AWS_REGION=us-east-1
supabase secrets set AWS_ACCESS_KEY_ID=your_key
supabase secrets set AWS_SECRET_ACCESS_KEY=your_secret

# 3. Descomentar código real em src/hooks/useFaceRecognition.ts
# Procure por: "TODO: Descomentar quando Edge Functions estiverem no ar"
```

### **Arquivos Criados:**
- ✅ `src/hooks/useFaceRecognition.ts` - Hook principal
- ✅ `src/components/FaceRecognitionModal.tsx` - UI do modal
- ✅ `supabase/functions/detect-faces/` - Edge Function detecção
- ✅ `supabase/functions/find-photos-by-face/` - Edge Function busca
- ✅ `supabase/migrations/20250113000000_add_face_recognition.sql` - Banco

### **Integrações Recomendadas:**
- **AWS Rekognition** (mais preciso, ~99%)
- **Azure Face API** (bom custo-benefício)
- **Google Vision API** (fácil integração)
- **Face-API.js self-hosted** (grátis, ~85% precisão)

---

**Status Atual:** ✅ Câmera funcionando | 🎭 Modo DEMONSTRAÇÃO ativo  
**Para Produção:** Fazer deploy das Edge Functions e integrar com serviço de reconhecimento facial
