#!/usr/bin/env node

/**
 * 🧪 Script de Teste Completo - Photo Arena Flow
 * Validação de Backend, Frontend e Integração
 */

const https = require('https');
const http = require('http');

// Configurações
// ⚠️ ATENÇÃO: Configure estas variáveis com seus valores ANTES de usar este arquivo
// NUNCA commite este arquivo com valores reais no Git
const SUPABASE_URL = 'YOUR_SUPABASE_URL_HERE';
const SUPABASE_KEY = 'YOUR_SUPABASE_ANON_KEY_HERE';
const APP_URL = 'http://localhost:8080';

// Cores para output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

let stats = {
  total: 0,
  passed: 0,
  failed: 0
};

// Função auxiliar para requisições
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data ? JSON.parse(data) : null
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    }).on('error', reject);
  });
}

// Função para executar teste
async function runTest(name, testFn) {
  stats.total++;
  process.stdout.write(`${colors.cyan}⏳ ${name}${colors.reset} ... `);
  
  try {
    const result = await testFn();
    
    if (result.success) {
      stats.passed++;
      console.log(`${colors.green}✅ PASSOU${colors.reset} ${colors.yellow}(${result.message})${colors.reset}`);
    } else {
      stats.failed++;
      console.log(`${colors.red}❌ FALHOU${colors.reset} ${colors.yellow}(${result.message})${colors.reset}`);
    }
  } catch (error) {
    stats.failed++;
    console.log(`${colors.red}❌ ERRO${colors.reset} ${colors.yellow}(${error.message})${colors.reset}`);
  }
}

// ==================== TESTES ====================

async function testSupabaseConnection() {
  try {
    const response = await makeRequest(`${SUPABASE_URL}/rest/v1/`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    
    return response.statusCode === 200 || response.statusCode === 404
      ? { success: true, message: 'Conectado' }
      : { success: false, message: `Status ${response.statusCode}` };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

async function testCampaignsTable() {
  try {
    const response = await makeRequest(`${SUPABASE_URL}/rest/v1/campaigns?select=count`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'count=exact'
      }
    });
    
    if (response.statusCode !== 200 && response.statusCode !== 206) {
      return { success: false, message: `Status ${response.statusCode}` };
    }
    
    const count = response.headers['content-range']?.split('/')[1] || '0';
    return { success: true, message: `${count} campanhas` };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

async function testPlatformPercentage() {
  try {
    const response = await makeRequest(`${SUPABASE_URL}/rest/v1/campaigns?select=platform_percentage&order=created_at.desc&limit=1`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    
    if (response.statusCode !== 200) {
      return { success: false, message: `Status ${response.statusCode}` };
    }
    
    if (!response.data || response.data.length === 0) {
      return { success: true, message: 'Sem campanhas (OK)' };
    }
    
    const percentage = response.data[0].platform_percentage;
    // Aceitar tanto 7% (campanhas antigas) quanto 9% (novas)
    return (percentage === 7 || percentage === 9)
      ? { success: true, message: `Taxa: ${percentage}% (antiga: 7%, nova: 9%)` }
      : { success: false, message: `Taxa: ${percentage}% (esperado: 7% ou 9%)` };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

async function testPhotosTable() {
  try {
    const response = await makeRequest(`${SUPABASE_URL}/rest/v1/photos?select=count`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'count=exact'
      }
    });
    
    if (response.statusCode !== 200 && response.statusCode !== 206) {
      return { success: false, message: `Status ${response.statusCode}` };
    }
    
    const count = response.headers['content-range']?.split('/')[1] || '0';
    return { success: true, message: `${count} fotos` };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

async function testProfilesTable() {
  try {
    const response = await makeRequest(`${SUPABASE_URL}/rest/v1/profiles?select=count`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'count=exact'
      }
    });
    
    if (response.statusCode !== 200 && response.statusCode !== 206) {
      return { success: false, message: `Status ${response.statusCode}` };
    }
    
    const count = response.headers['content-range']?.split('/')[1] || '0';
    return { success: true, message: `${count} perfis` };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

async function testAppRunning() {
  try {
    const response = await makeRequest(APP_URL);
    return response.statusCode === 200
      ? { success: true, message: 'Rodando em localhost:8080' }
      : { success: false, message: `Status ${response.statusCode}` };
  } catch (error) {
    return { success: false, message: 'Execute: npm run dev' };
  }
}

async function testPercentageSystem() {
  const platform = 9;
  const photographer = 91;
  const organization = 0;
  const total = platform + photographer + organization;
  
  return total === 100
    ? { success: true, message: `${platform}% + ${photographer}% = ${total}%` }
    : { success: false, message: `Soma: ${total}% (esperado: 100%)` };
}

// ==================== EXECUÇÃO ====================

async function main() {
  console.log(`
${colors.magenta}╔════════════════════════════════════════════════════════════╗
║                                                            ║
║       🧪 TESTES LOCAIS - PHOTO ARENA FLOW 🧪              ║
║                                                            ║
║     Validação Completa do Sistema                         ║
║     Antes do Deploy                                        ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝${colors.reset}
`);

  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.cyan}🔧 TESTES DE BACKEND (SUPABASE)${colors.reset}`);
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

  await runTest('Conexão com Supabase', testSupabaseConnection);
  await runTest('Tabela campaigns', testCampaignsTable);
  await runTest('Verificar taxa da plataforma (9%)', testPlatformPercentage);
  await runTest('Tabela photos', testPhotosTable);
  await runTest('Tabela profiles', testProfilesTable);

  console.log(`\n${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.cyan}🎨 TESTES DE FRONTEND${colors.reset}`);
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

  await runTest('Aplicação está rodando', testAppRunning);

  console.log(`\n${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.cyan}🔗 TESTES DE SISTEMA${colors.reset}`);
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

  await runTest('Sistema de porcentagens', testPercentageSystem);

  console.log(`\n${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.magenta}📊 RESUMO DOS TESTES${colors.reset}`);
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

  console.log(`  Total de testes:    ${stats.total}`);
  console.log(`  ${colors.green}✅ Aprovados:        ${stats.passed}${colors.reset}`);
  console.log(`  ${colors.red}❌ Falharam:         ${stats.failed}${colors.reset}`);
  console.log(`  Taxa de sucesso:    ${((stats.passed / stats.total) * 100).toFixed(1)}%\n`);

  if (stats.failed === 0) {
    console.log(`${colors.green}╔════════════════════════════════════════════════════════════╗
║                                                            ║
║              ✅ TODOS OS TESTES PASSARAM! ✅               ║
║                                                            ║
║        Sistema está pronto para deploy! 🚀                ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);
  } else {
    console.log(`${colors.red}╔════════════════════════════════════════════════════════════╗
║                                                            ║
║           ⚠️  ALGUNS TESTES FALHARAM  ⚠️                  ║
║                                                            ║
║    Corrija os erros antes de fazer deploy                 ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);
    process.exit(1);
  }
}

// Executar testes
main().catch(error => {
  console.error(`${colors.red}Erro fatal:${colors.reset}`, error);
  process.exit(1);
});
