# 🛠️ Comandos Úteis - STA Fotos

## 🚀 Desenvolvimento

### Iniciar Servidor de Desenvolvimento
```bash
npm run dev
```
Acessa em: http://localhost:8081

### Build de Produção
```bash
npm run build
```

### Preview do Build
```bash
npm run preview
```

---

## 📱 Testar em Dispositivo Mobile

### 1. Descobrir IP Local

**Windows:**
```bash
ipconfig
```
Procure por "IPv4 Address" na interface de rede ativa

**Mac/Linux:**
```bash
ifconfig
```
Ou:
```bash
hostname -I
```

### 2. Acessar do Celular
```
http://[SEU_IP]:8081
```
Exemplo: `http://192.168.1.100:8081`

**Importante**: Celular e computador devem estar na mesma rede WiFi!

---

## 🗄️ Migrações SQL no Supabase

### Via Supabase Dashboard

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em "SQL Editor"
4. Clique em "New Query"
5. Copie e cole o conteúdo de cada arquivo:

**Arquivo 1 - Taxa de 6%:**
```
supabase/migrations/20250111000000_set_default_platform_fee.sql
```

**Arquivo 2 - Colaboradores:**
```
supabase/migrations/20250111000001_add_photo_collaborators.sql
```

6. Execute cada query
7. Verifique se não houve erros

### Via CLI do Supabase (se configurado)
```bash
# Aplicar todas as migrações pendentes
supabase db push

# Ou aplicar arquivo específico
supabase db execute --file supabase/migrations/20250111000000_set_default_platform_fee.sql
supabase db execute --file supabase/migrations/20250111000001_add_photo_collaborators.sql
```

---

## 🔍 Verificações Úteis

### Verificar Erros de Build
```bash
npm run build 2>&1 | grep -i error
```

### Verificar Warnings
```bash
npm run build 2>&1 | grep -i warning
```

### Verificar Tamanho dos Bundles
```bash
npm run build | grep -E "\.js.*kB"
```

### Limpar Cache e node_modules
```bash
rm -rf node_modules
rm -rf dist
rm -rf .vite
npm install
npm run build
```

---

## 🐛 Debug

### Ver logs do Chrome DevTools Mobile
1. Abra Chrome no PC
2. Acesse: `chrome://inspect`
3. Conecte celular via USB
4. Clique em "inspect" no dispositivo
5. Veja console e erros

### Ver logs do Safari iOS
1. iPhone: Ative "Web Inspector" em Ajustes > Safari > Avançado
2. Mac: Safari > Develop > [Nome do iPhone]
3. Selecione a aba para ver console

---

## 📊 Verificar Banco de Dados

### Verificar campanhas com taxa correta
```sql
SELECT id, title, platform_percentage, photographer_percentage, organization_percentage
FROM campaigns
ORDER BY created_at DESC
LIMIT 10;
```

### Verificar saldo de fotógrafo específico
```sql
-- Substituir PHOTOGRAPHER_ID_AQUI pelo ID real
SELECT 
  rs.photographer_amount,
  p.created_at,
  p.status,
  (NOW() - p.created_at) > INTERVAL '12 hours' as can_withdraw
FROM revenue_shares rs
JOIN purchases p ON p.id = rs.purchase_id
WHERE rs.photographer_id = 'PHOTOGRAPHER_ID_AQUI'
  AND p.status = 'completed'
ORDER BY p.created_at DESC;
```

### Verificar colaboradores de uma foto
```sql
SELECT 
  pc.id,
  pc.percentage,
  p.full_name as collaborator_name,
  ph.title as photo_title
FROM photo_collaborators pc
JOIN profiles p ON p.id = pc.collaborator_id
JOIN photos ph ON ph.id = pc.photo_id
WHERE pc.photo_id = 'PHOTO_ID_AQUI';
```

---

## 🔐 Testar Recuperação de Senha

### 1. Via Interface
1. Acesse: http://localhost:8081/auth
2. Clique em "Esqueceu a senha?"
3. Digite email cadastrado
4. Clique em "Enviar Email"
5. Verifique email (pode ir para spam)

### 2. Verificar no Supabase
1. Dashboard > Authentication > Users
2. Procure pelo usuário
3. Veja se há "Password Reset" recente

---

## 📈 Performance

### Verificar tamanho de imagens
```bash
# Ver tamanho dos assets
du -sh dist/assets/*
```

### Lighthouse (Performance Mobile)
1. Chrome DevTools (F12)
2. Aba "Lighthouse"
3. Selecione "Mobile"
4. Marque "Performance"
5. Clique "Generate report"
6. Meta: > 80 pontos

---

## 🎯 Git Workflow Recomendado

### Antes do Commit
```bash
# 1. Verificar arquivos modificados
git status

# 2. Ver diferenças
git diff

# 3. Adicionar arquivos
git add .

# 4. Build para garantir que compila
npm run build

# 5. Commit
git commit -m "feat: implementa feedbacks do cliente

- Adiciona recuperação de senha
- Logo STA redireciona para home
- Taxa padrão de 6% configurada
- Sistema de colaboradores
- Melhorias UI mobile
- Card fotógrafo destacado
- Link Instagram no footer
- Melhorias no sistema de saldo"

# 6. Push
git push origin main
```

### Após Commit com Problemas
```bash
# Desfazer último commit (mantém alterações)
git reset --soft HEAD~1

# Ou desfazer e descartar alterações
git reset --hard HEAD~1
```

---

## 🆘 Troubleshooting Comum

### Porta 8081 já em uso
```bash
# Windows
netstat -ano | findstr :8081
taskkill /PID [PID_NUMBER] /F

# Mac/Linux
lsof -ti:8081 | xargs kill -9
```

### Módulos não encontrados
```bash
rm -rf node_modules package-lock.json
npm install
```

### Build falhando
```bash
# Limpar tudo
rm -rf dist .vite node_modules
npm install
npm run build
```

### Problemas com tipos TypeScript
```bash
# Verificar tipos
npx tsc --noEmit

# Ignorar temporariamente (não recomendado para produção)
# Adicione // @ts-ignore antes da linha com erro
```

---

## 📞 Suporte Rápido

### Arquivos de Documentação
- `RESUMO_EXECUTIVO.md` - Overview geral
- `ALTERACOES_FEEDBACK_CLIENTE.md` - Detalhes técnicos
- `CHECKLIST_TESTE_MOBILE.md` - Guia de testes mobile
- `COMANDOS_UTEIS.md` - Este arquivo

### Estrutura de Pastas Importante
```
src/
├── components/
│   ├── dashboard/        # Dashboards (Admin, Fotógrafo, etc)
│   ├── modals/           # Modais (Upload, Payment, etc)
│   ├── layout/           # Header, Footer, MainLayout
│   └── ui/               # Componentes base (shadcn)
├── pages/                # Páginas principais
├── contexts/             # Context API (Auth, Cart, etc)
└── lib/                  # Utilitários

supabase/
└── migrations/           # Migrações SQL
```

---

## 🎉 Checklist Final Antes de Produção

- [ ] ✅ Build passou sem erros
- [ ] 📱 Testado em mobile (Android + iOS)
- [ ] 🗄️ Migrações SQL aplicadas
- [ ] 🔐 Recuperação de senha testada
- [ ] 💰 Sistema de saldo validado
- [ ] 👥 Colaboradores funcionando
- [ ] 🚀 Performance > 80 no Lighthouse
- [ ] 🔍 Console sem erros
- [ ] 📊 Dados de produção verificados
- [ ] 🎯 Todas as funcionalidades testadas

---

**Data**: 11/01/2025  
**Versão**: 1.0  
**Build**: ✅ Sucesso (18.85s)
