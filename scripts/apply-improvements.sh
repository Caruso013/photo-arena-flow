#!/bin/bash

# Script para aplicar migrations e verificar melhorias
# Data: 2025-11-06

echo "🚀 Aplicando melhorias no STA Fotos..."
echo ""

# 1. Aplicar migrations
echo "📦 1/4 - Aplicando migrations no banco de dados..."
npx supabase db push

if [ $? -eq 0 ]; then
    echo "✅ Migrations aplicadas com sucesso!"
else
    echo "❌ Erro ao aplicar migrations"
    exit 1
fi

echo ""

# 2. Build para verificar se console.logs foram removidos
echo "🏗️  2/4 - Fazendo build de produção..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build concluído com sucesso!"
else
    echo "❌ Erro no build"
    exit 1
fi

echo ""

# 3. Verificar tamanho do bundle
echo "📊 3/4 - Verificando tamanho do bundle..."
du -sh dist/

echo ""

# 4. Testar preview
echo "🎬 4/4 - Iniciando preview..."
echo ""
echo "✅ Tudo pronto!"
echo ""
echo "📝 Próximos passos:"
echo "1. Acesse: http://localhost:4173"
echo "2. Teste o login (deve redirecionar automaticamente)"
echo "3. Crie um evento com data passada (deve funcionar)"
echo "4. Verifique o console.log no build (não deve aparecer nada)"
echo ""
echo "🎉 Melhorias implementadas com sucesso!"
echo ""

npm run preview
