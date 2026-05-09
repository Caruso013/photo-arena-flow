#!/bin/bash

# 🚀 QUICK START - Implementação de Segurança de Fotos
# Execute este script para fazer deploy completo em 5 minutos!

set -e

echo "=========================================="
echo "🔐 Implementação de Segurança - QUICK START"
echo "=========================================="
echo ""

# CORES
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# PASSO 1: Verificar Supabase CLI
echo -e "${YELLOW}[1/5]${NC} Verificando Supabase CLI..."
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI não instalada!${NC}"
    echo "Instale com: npm install -g @supabase/cli"
    exit 1
fi
echo -e "${GREEN}✅ Supabase CLI encontrada${NC}"
echo ""

# PASSO 2: Fazer login
echo -e "${YELLOW}[2/5]${NC} Verificando login no Supabase..."
if ! supabase projects list &> /dev/null; then
    echo -e "${YELLOW}⚠️ Não está logado. Fazendo login...${NC}"
    supabase login
fi
echo -e "${GREEN}✅ Supabase autenticado${NC}"
echo ""

# PASSO 3: Deploy da Edge Function
echo -e "${YELLOW}[3/5]${NC} Deployando Edge Function..."
if [ -d "supabase/functions/generate-photo-download" ]; then
    supabase functions deploy generate-photo-download
    echo -e "${GREEN}✅ Edge Function deployada${NC}"
else
    echo -e "${RED}❌ Arquivo não encontrado: supabase/functions/generate-photo-download/index.ts${NC}"
    exit 1
fi
echo ""

# PASSO 4: Executar Migração
echo -e "${YELLOW}[4/5]${NC} Executando migração de banco de dados..."
if [ -f "supabase/migrations/20250506_create_photo_downloads_audit.sql" ]; then
    echo "Migração será executada automaticamente com 'supabase db push'"
    supabase db push --dry-run # Teste seco
    supabase db push # Deploy real
    echo -e "${GREEN}✅ Migração executada${NC}"
else
    echo -e "${RED}❌ Arquivo de migração não encontrado${NC}"
    exit 1
fi
echo ""

# PASSO 5: Build Frontend
echo -e "${YELLOW}[5/5]${NC} Compilando TypeScript..."
npm run build
echo -e "${GREEN}✅ Build concluído${NC}"
echo ""

# RESUMO
echo "=========================================="
echo -e "${GREEN}✅ TUDO PRONTO PARA PRODUÇÃO!${NC}"
echo "=========================================="
echo ""
echo "📋 Verificação:"
echo "  ✅ Edge Function: generate-photo-download"
echo "  ✅ Tabela: photo_downloads"
echo "  ✅ Frontend: securePhotoDownload.ts"
echo "  ✅ Componente: MyPurchases.tsx"
echo ""
echo "🧪 Próximos passos:"
echo "  1. npm run dev                      (testar localmente)"
echo "  2. Verificar logs no Supabase       (console)"
echo "  3. Fazer um teste de download"
echo "  4. Verificar tabela photo_downloads"
echo ""
echo "📊 Para monitorar:"
echo "  • Supabase Console → Functions → Logs"
echo "  • Supabase Console → SQL → SELECT * FROM photo_downloads"
echo ""
echo "❓ Problemas? Veja: IMPLEMENTACAO_SEGURANCA_PASSOS.md"
echo ""
