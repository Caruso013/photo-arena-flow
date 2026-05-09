# 🔒 Plano de Segurança para Proteção de Fotos

## Problema Identificado
As fotos originais podem ser acessadas de forma indevida através de:
- URL assinada capturada do browser (DevTools, rede)
- Download em massa/automático por bots
- Compartilhamento de links diretos
- Acesso sem verificação de compra real

---

## 📋 Vulnerabilidades Críticas Encontradas

### 1. **URLs Assinadas Expostas no Frontend** ⚠️ ALTA
- Localização: `src/lib/photoDownload.ts`
- Problema: URLs são geradas no cliente e podem ser capturadas
- Impacto: Qualquer pessoa vendo o DevTools consegue copiar a URL
- Risco: **CRÍTICO** - Download ilimitado da foto

### 2. **Falta de Validação Server-Side** ⚠️ ALTA
- Localização: `src/lib/photoDownload.ts` line 25-40
- Problema: URL assinada não valida se o usuário realmente comprou
- Impacto: Alguém pode forjar a URL e baixar fotos não compradas
- Risco: **CRÍTICO** - Acesso a fotos grátis

### 3. **Rate Limiting Ausente** ⚠️ MÉDIA
- Problema: Sem limite de downloads por minuto
- Impacto: Bot pode baixar 1000 fotos em segundos
- Risco: **ALTO** - Roubo em massa

### 4. **Sem Auditoria de Downloads** ⚠️ MÉDIA
- Problema: Não há log de quem baixou o quê
- Impacto: Impossível rastrear uso indevido
- Risco: **MÉDIO** - Sem prova de contaminação

### 5. **URLs Compartilháveis Indefinidamente** ⚠️ ALTA
- Problema: Uma vez gerada, URL funciona por 5 minutos
- Impacto: Usuário pode copiar e compartilhar
- Risco: **ALTO** - Fotos viralizarem gratuitamente

### 6. **Sem Proteção Contra Download em Massa** ⚠️ MÉDIA
- Problema: Sem CAPTCHA ou verificação humana
- Impacto: Ferramentas automáticas conseguem baixar múltiplas fotos
- Risco: **ALTO** - Roubo automatizado

### 7. **Bucket Pode Estar Público** ⚠️ CRÍTICA
- Problema: Se bucket não está protegido, URLs podem ser descobertas
- Impacto: Força bruta para encontrar fotos
- Risco: **CRÍTICA** - Acesso total às fotos

---

## ✅ Solução em 3 Camadas

### CAMADA 1: Backend Seguro (IMPLEMENTAR PRIMEIRO) 🔴

#### 1.1 - Criar Endpoint de Download Seguro
```
POST /api/v1/photos/download
- Requer autenticação JWT
- Valida se usuário comprou a foto
- Gera token descartável (single-use)
- Log completo do acesso
- Valida rate limiting por IP/usuário
```

**Fluxo seguro:**
```
Cliente solicita download
    ↓
API valida autenticação
    ↓
API valida compra no banco de dados
    ↓
API gera HASH único + timestamp
    ↓
API registra log do download
    ↓
API retorna URL assinada + hash
    ↓
Cliente baixa (token válido por 2 minutos apenas)
    ↓
URL expira automaticamente
```

-#### 1.2 - Rate Limiting
- **Por usuário autenticado**: 25 downloads/hora
- **Por IP**: 10 downloads/hora (detecta proxies)
- **Por foto**: 1 download completo por compra (se comprou múltiplas vezes, múltiplos downloads)

#### 1.3 - Auditoria Completa
Registrar em tabela `photo_downloads`:
- `id` (UUID)
- `user_id` (quem baixou)
- `photo_id` (qual foto)
- `downloaded_at` (quando)
- `ip_address` (de onde)
- `user_agent` (qual navegador)
- `purchase_id` (qual compra autoriza)
- `hash` (hash do arquivo baixado)

#### 1.4 - Proteção do Bucket
```
Configuração Supabase:
- Bucket "photos-original" = PRIVADO
- Sem acesso público anônimo
- Acesso APENAS via URLs assinadas do backend
- CORS habilitado APENAS para domínio da app
```

---

### CAMADA 2: Proteção no Frontend 🟡

#### 2.1 - Remover URLs Diretas
- ❌ ANTES: `await getSignedPhotoUrl()` no client
- ✅ DEPOIS: Chamar `POST /api/photos/download` que retorna URL protegida

#### 2.2 - Adicionar Verificação Humana
Para downloads em massa (múltiplas fotos):
- Se ≥ 3 fotos em 5 minutos → exigir verificação
- Opções:
  - Resolver CAPTCHA
  - Entrar com 2FA
  - Validar email

#### 2.3 - Proteção do Devtools
```typescript
// Impedir que usuários vejam URLs nos logs
console.log = () => {}; // Se for muito restritivo
// OU Sanitizar URLs nos logs
```

---

### CAMADA 3: Monitoramento e Detecção 🟢

#### 3.1 - Alertas Automáticos
Notificar administrador se:
- Mesmo usuário baixa >10 fotos em 1 hora
- Mesmo IP baixa >50 fotos em 1 dia
- Fotógrafo reporta foto sendo vendida em site pirata
- Download de foto ocorre 10+ vezes em 1 minuto

#### 3.2 - Dashboard de Segurança
- Ver downloads por foto/evento
- Ver padrões suspeitos
- Bloquear usuários se necessário
- Ver relatório de fotos mais "copiadas"

#### 3.3 - Watermark Dinâmico (Backup)
Se foto for vazada, saberemos de quem:
- Adicionar nome do comprador + data de compra
- Tornar watermark fino mas persistente
- Impossível remover sem corromper imagem

---

## 🛠️ Implementação Por Prioridade

### SEMANA 1 - Crítico (Parar vazamento agora)
- [ ] **P1**: Backend endpoint `/api/photos/download`
- [ ] **P1**: Rate limiting por usuário
- [ ] **P1**: Log completo de downloads
- [ ] **P1**: URL assinada com expiração 2 min
- [ ] **P1**: Validação de compra server-side

### SEMANA 2 - Alto (Adicionar proteção)
- [ ] **P2**: CAPTCHA para múltiplos downloads
- [ ] **P2**: Auditoria avançada (IP, User-Agent)
- [ ] **P2**: Alertas de atividade suspeita
- [ ] **P2**: Bucket totalmente privado

### SEMANA 3 - Médio (Polish)
- [ ] **P3**: Dashboard de segurança
- [ ] **P3**: Watermark dinâmico
- [ ] **P3**: Email de notificação para downloads
- [ ] **P3**: Relatório de integridade (hash)

---

## 📊 Comparação: Antes vs Depois

| Aspecto | ❌ Antes | ✅ Depois |
|---------|---------|----------|
| Validação de compra | Cliente (não confiável) | Servidor (seguro) |
| Expiração de URL | 5 minutos | 2 minutos |
| Rate limiting | Nenhum | 25/hora por usuário |
| Auditoria | Nenhuma | Completa (IP, User-Agent, hora) |
| Fotos compartilhadas | Ilimitadas | Controladas |
| Download em massa | Fácil (bot) | Bloqueado (CAPTCHA + rate limit) |
| Rastreamento | Impossível | Completo |

---

## 🚨 Riscos Residuais (Aceitáveis)

### 1. Captura de Tela ⚠️
- Usuário pode tirar screenshot
- **Solução**: Watermark visível (nome + data)
- **Aceitável**: Sim (usuário já pagou)

### 2. Proxy Anônimo 🔒
- Usuário usa VPN para esgueirar rate limit
- **Solução**: Validação de comportamento (ML)
- **Aceitável**: Parcialmente (capta 80% dos casos)

### 3. Browser Plugin 🔌
- Usuário cria plugin customizado
- **Solução**: Monitoramento de Hash
- **Aceitável**: Sim (muito técnico, poucos conseguem)

---

## 📝 Checklist de Implementação

### Backend (Node.js/Supabase)

```typescript
// ✅ Implementar em src/supabase/functions/download-photo
// ou src/pages/api/photos/download.ts

// 1. Validar JWT
// 2. Validar rate limit
// 3. Verificar compra no banco
// 4. Gerar token único
// 5. Criar URL assinada (2 min)
// 6. Registrar log
// 7. Retornar URL + hash
```

### Frontend (React)

```typescript
// ✅ Modificar: src/lib/photoDownload.ts

// Remover: getSignedPhotoUrl() no cliente
// Adicionar: async function getSignedUrlFromBackend()
// Adicionar: Verificação de CAPTCHA para múltiplos
```

### Banco de Dados

```sql
-- ✅ Nova tabela: photo_downloads

CREATE TABLE photo_downloads (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  photo_id UUID NOT NULL,
  purchase_id UUID,
  downloaded_at TIMESTAMP,
  ip_address VARCHAR(50),
  user_agent TEXT,
  file_hash VARCHAR(64),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_user_id ON photo_downloads(user_id);
CREATE INDEX idx_photo_id ON photo_downloads(photo_id);
CREATE INDEX idx_downloaded_at ON photo_downloads(downloaded_at);
```

---

## 🎯 Resultado Esperado

### Antes (Inseguro)
```
Atacante: "Quero pegar a foto grátis"
1. Abre DevTools → Aba Network
2. Faz download de qualquer foto
3. Vê URL assinada: https://...?token=xyz
4. Copia a URL
5. Compartilha em grupo do WhatsApp
6. 1000 pessoas baixam grátis em 1 hora ❌
```

### Depois (Seguro)
```
Atacante: "Quero pegar a foto grátis"
1. Tenta usar DevTools → URL está protegida
2. Tenta forçar download → Bloqueado (rate limit)
3. Tenta automação (bot) → Bloqueado (CAPTCHA)
4. IP dele é bloqueado após 3 tentativas
5. Administrador recebe alerta de segurança
6. Atacante desiste ✅
```

---

## 💡 Considerações Finais

1. **Não é 100% à prova de falhas** - se foto já está em posse de alguém, não dá para impedir screenshot
2. **Watermark + Auditoria = Poder legal** - se foto vazar, você sabe de quem e pode processar
3. **Balanço UX vs Segurança** - usuários legítimos não sofrem (só download legítimo)
4. **Implementação gradual** - pode fazer SEMANA 1 e depois outras fases

---

## Próximos Passos

1. ✅ Revisar este plano com o time
2. ✅ Aprovar orçamento/timeline
3. ✅ Começar pela SEMANA 1 (4 tarefas críticas)
4. ✅ Testes de segurança com Red Team
5. ✅ Deploy gradual com monitoramento

**Estimativa**: 20-30 horas de desenvolvimento (SEMANA 1)
