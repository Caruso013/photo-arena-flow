# ✅ Sprint 4 - Testes, Monitoramento e Performance

## 📋 Resumo das Implementações

Esta sprint implementou **testes automatizados**, **monitoramento de erros com Sentry** e **tracking de Web Vitals** para garantir qualidade, estabilidade e performance do projeto.

---

## 🎯 Correções Críticas Implementadas

### 1. ✅ Visualização de Pastas no Mobile

**Problema**: HoverCard não funciona em dispositivos mobile (hover não existe em touch).

**Solução**: Implementado sistema responsivo no `EventCard.tsx`:
- **Desktop**: HoverCard (hover funciona)
- **Mobile**: Sheet bottom drawer (clique/tap funciona)

**Arquivos modificados**:
- `src/components/events/EventCard.tsx`

**Funcionalidades**:
- Sheet slide-up do fundo com lista de pastas
- Scroll independente dentro do Sheet
- Visual otimizado para touch (botões maiores, espaçamentos)
- Transições suaves e feedback visual

---

### 2. ✅ Paginação de Fotos

**Status**: Já estava implementada corretamente em `Campaign.tsx`

**Funcionalidades**:
- Paginação de 24 fotos por página
- Botões Previous/Next funcionais
- Números de página clicáveis
- Reticências (...) para muitas páginas
- Prefetch da próxima página para performance
- Reset de página ao trocar de álbum

---

### 3. ✅ Criação de Eventos

**Status**: Funcional - `CreateCampaignModal.tsx` está correto

**Validações implementadas**:
- Taxa da plataforma fixa (configurável via DB)
- Divisão fotógrafo/organização soma 93%
- Preview visual em tempo real (R$ por venda)
- Feedback de erros de validação

---

## 🧪 Testes Automatizados com Vitest

### Instalação

```bash
npm install --save-dev vitest @vitest/ui @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

### Configuração

**Arquivo**: `vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### Setup de Testes

**Arquivo**: `src/test/setup.ts`

- Importa `@testing-library/jest-dom`
- Cleanup automático após cada teste
- Mocks de `window.matchMedia`, `IntersectionObserver`, `ResizeObserver`

### Testes Criados

#### 1. **utils.test.ts** - Testes de Utilidades
- `formatCurrency()`: valores monetários, negativos, arredondamento

#### 2. **EventCard.test.tsx** - Testes de Componente
- Renderização de informações básicas
- Formatação de datas
- Links funcionais
- Botão "Ver Fotos"

#### 3. **hooks.test.ts** - Testes de Hooks
- `useIsMobile()`: detecção mobile/desktop

### Scripts de Teste

Adicionados no `package.json`:

```json
{
  "test": "vitest",
  "test:ui": "vitest --ui",
  "test:run": "vitest run",
  "test:coverage": "vitest run --coverage"
}
```

### Executar Testes

```bash
# Modo watch (interativo)
npm test

# UI visual
npm run test:ui

# Rodar uma vez (CI)
npm run test:run

# Com cobertura
npm run test:coverage
```

---

## 🚨 Monitoramento com Sentry

### Instalação

```bash
npm install @sentry/react @sentry/vite-plugin
```

### Configuração

**Arquivo**: `src/main.tsx`

```typescript
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  enabled: import.meta.env.PROD,
});
```

### ErrorBoundary com Sentry

**Arquivo**: `src/components/ErrorBoundary.tsx`

**Melhorias**:
- Captura erros e envia automaticamente para Sentry
- Botão "Reportar Problema" abre dialog do Sentry
- Contexto adicional (componentStack) enviado
- Event ID armazenado para tracking

**Funcionalidades**:
- Captura de erros de React
- Session Replay quando há erro (100%)
- Performance tracing (10% em prod)
- Filtro de erros de extensões do navegador

### Configurar DSN do Sentry

1. Criar conta em [sentry.io](https://sentry.io)
2. Criar novo projeto React
3. Copiar DSN
4. Adicionar no `.env`:

```env
VITE_SENTRY_DSN=https://your_key@sentry.io/project_id
```

---

## 📊 Web Vitals Tracking

### Instalação

```bash
npm install web-vitals
```

### Hook Criado

**Arquivo**: `src/hooks/useWebVitals.ts`

### Métricas Rastreadas

1. **CLS** (Cumulative Layout Shift)
   - Estabilidade visual
   - Bom: ≤ 0.1
   - Precisa melhorar: ≤ 0.25
   - Ruim: > 0.25

2. **INP** (Interaction to Next Paint)
   - Interatividade (substitui FID)
   - Bom: ≤ 200ms
   - Precisa melhorar: ≤ 500ms
   - Ruim: > 500ms

3. **FCP** (First Contentful Paint)
   - Primeira renderização
   - Bom: ≤ 1.8s
   - Precisa melhorar: ≤ 3s
   - Ruim: > 3s

4. **LCP** (Largest Contentful Paint)
   - Carregamento principal
   - Bom: ≤ 2.5s
   - Precisa melhorar: ≤ 4s
   - Ruim: > 4s

5. **TTFB** (Time to First Byte)
   - Tempo de resposta do servidor
   - Bom: ≤ 800ms
   - Precisa melhorar: ≤ 1.8s
   - Ruim: > 1.8s

### Integração

**Arquivo**: `src/App.tsx`

```typescript
import { useWebVitals } from '@/hooks/useWebVitals';

function AppContent() {
  useWebVitals({
    reportToConsole: import.meta.env.DEV,
    reportToSentry: import.meta.env.PROD,
  });
  
  // ...
}
```

### Visualização

- **Desenvolvimento**: Console do navegador
- **Produção**: Dashboard do Sentry (Metrics)

---

## 📦 Estrutura de Arquivos Criados/Modificados

```
✨ NOVOS:
├── vitest.config.ts                      # Configuração do Vitest
├── .env.example                          # Exemplo de variáveis de ambiente
├── src/test/
│   ├── setup.ts                          # Setup global dos testes
│   ├── utils.test.ts                     # Testes de utils
│   ├── EventCard.test.tsx                # Testes de EventCard
│   └── hooks.test.ts                     # Testes de hooks
├── src/hooks/useWebVitals.ts             # Hook de Web Vitals
└── docs/SPRINT_4_TESTS_MONITORING.md     # Esta documentação

🔧 MODIFICADOS:
├── package.json                          # Scripts de teste
├── src/main.tsx                          # Inicialização do Sentry
├── src/App.tsx                           # Integração Web Vitals
├── src/components/ErrorBoundary.tsx      # Integração Sentry
└── src/components/events/EventCard.tsx   # Mobile responsive (Sheet)
```

---

## 🚀 Como Usar

### 1. Rodar Testes

```bash
# Modo interativo
npm test

# UI visual
npm run test:ui

# CI/CD
npm run test:run

# Com cobertura
npm run test:coverage
```

### 2. Configurar Sentry (Opcional - Produção)

1. Criar conta em https://sentry.io
2. Criar projeto React
3. Copiar DSN
4. Adicionar no `.env`:
   ```
   VITE_SENTRY_DSN=https://...@sentry.io/...
   ```

### 3. Monitorar Web Vitals

**Desenvolvimento**: Abrir DevTools Console
**Produção**: Dashboard Sentry > Metrics

---

## ✅ Checklist de Implementação

- [x] Corrigir visualização de pastas no mobile (Sheet)
- [x] Verificar paginação (já estava OK)
- [x] Verificar criação de eventos (já estava OK)
- [x] Instalar dependências de teste
- [x] Configurar Vitest
- [x] Criar testes básicos (utils, components, hooks)
- [x] Adicionar scripts de teste no package.json
- [x] Instalar Sentry
- [x] Configurar Sentry no main.tsx
- [x] Integrar ErrorBoundary com Sentry
- [x] Instalar web-vitals
- [x] Criar hook useWebVitals
- [x] Integrar Web Vitals no App.tsx
- [x] Documentação completa

---

## 📊 Benefícios Imediatos

### Testes
✅ **Confiança**: Mudanças não quebram funcionalidades  
✅ **Documentação Viva**: Testes documentam comportamento esperado  
✅ **Refatoração Segura**: Testes protegem durante mudanças  
✅ **CI/CD Ready**: Pode rodar em pipelines automáticos

### Sentry
✅ **Alertas Automáticos**: Erros em produção notificados imediatamente  
✅ **Contexto Completo**: Stack traces, breadcrumbs, user info  
✅ **Session Replay**: Ver exatamente o que o usuário fez  
✅ **Performance**: Detectar endpoints lentos

### Web Vitals
✅ **User Experience**: Métricas que impactam usuário real  
✅ **SEO**: Google usa Core Web Vitals para ranking  
✅ **Benchmarking**: Comparar performance ao longo do tempo  
✅ **Priorização**: Saber exatamente onde otimizar

---

## 🎯 Próximos Passos (Opcional)

- [ ] Aumentar cobertura de testes (target: 80%+)
- [ ] Testes E2E com Playwright ou Cypress
- [ ] Configurar CI/CD (GitHub Actions)
- [ ] Dashboard customizado de Web Vitals
- [ ] Alertas do Sentry por canal (Slack, Discord)
- [ ] A/B testing baseado em métricas
- [ ] Lighthouse CI para performance contínua

---

## 🆘 Troubleshooting

### Testes não rodam

```bash
# Limpar cache
npm run test -- --clearCache

# Reinstalar dependências
rm -rf node_modules package-lock.json
npm install
```

### Sentry não captura erros

- Verificar se `VITE_SENTRY_DSN` está no `.env`
- Verificar se `enabled: import.meta.env.PROD` está correto
- Testar com `Sentry.captureException(new Error('Test'))`

### Web Vitals não aparecem

- Verificar console do navegador (modo dev)
- Verificar Sentry > Metrics (modo prod)
- Garantir que navegador suporta (Chrome 90+)

---

## 📚 Recursos

- [Vitest Docs](https://vitest.dev/)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Sentry React Docs](https://docs.sentry.io/platforms/javascript/guides/react/)
- [Web Vitals](https://web.dev/vitals/)
- [Core Web Vitals](https://web.dev/vitals/#core-web-vitals)

---

**Status**: ✅ **SPRINT 4 COMPLETA**

Todas as funcionalidades implementadas, testadas e documentadas!
