
# Sistema Completo de QR Code para Validação e Controle de Presença de Fotógrafos

## Visão Geral do Sistema

Sistema de validação de fotógrafos em eventos através de QR Code com:
1. QR Code único por fotógrafo (exibido no dashboard)
2. Login temporário para mesários (válido por 24h)
3. Scanner que exibe nome/foto do fotógrafo para confirmação visual
4. Botão de confirmação de presença pelo mesário
5. Lista de chamada no dashboard admin mostrando quem compareceu

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FLUXO COMPLETO DO SISTEMA                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. ORGANIZAÇÃO                                                             │
│     └── Cria login temporário (24h) para mesário                            │
│                                                                             │
│  2. MESÁRIO                                                                 │
│     ├── Acessa /mesario e faz login com código                              │
│     ├── Seleciona o evento do dia                                           │
│     ├── Escaneia QR do fotógrafo                                            │
│     │         ↓                                                             │
│     │   ┌─────────────────────────────────────────┐                         │
│     │   │  TELA DE CONFIRMAÇÃO                    │                         │
│     │   │                                         │                         │
│     │   │  [Avatar]  João Carlos Silva            │                         │
│     │   │                                         │                         │
│     │   │  ✓ Aprovado para este evento            │                         │
│     │   │                                         │                         │
│     │   │  [ CONFIRMAR PRESENÇA ]                 │                         │
│     │   │                                         │                         │
│     │   └─────────────────────────────────────────┘                         │
│     └── Clica em "Confirmar Presença"                                       │
│                                                                             │
│  3. ADMIN DASHBOARD                                                         │
│     └── Visualiza "Lista de Chamada" do evento                              │
│              │                                                              │
│              ▼                                                              │
│     ┌───────────────────────────────────────────────────────────┐           │
│     │  LISTA DE CHAMADA - Copa São Paulo 2026                   │           │
│     ├───────────────────────────────────────────────────────────┤           │
│     │  Fotógrafo           │ Status      │ Chegada              │           │
│     │──────────────────────│─────────────│──────────────────────│           │
│     │  João Carlos Silva   │ ✓ Presente  │ 14:32                │           │
│     │  Maria Aparecida     │ ✓ Presente  │ 14:45                │           │
│     │  Pedro Henrique      │ ⏳ Aguardando │ -                   │           │
│     │  Ana Beatriz         │ ⏳ Aguardando │ -                   │           │
│     └───────────────────────────────────────────────────────────┘           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Estrutura do Banco de Dados

### Tabela 1: `mesario_sessions` (Sessões de Mesários)

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | Identificador único |
| organization_id | uuid | FK → organizations.id |
| campaign_id | uuid | FK → campaigns.id (evento específico) |
| access_code | text | Código de 6 dígitos único |
| mesario_name | text | Nome do mesário |
| created_by | uuid | FK → auth.users (admin que criou) |
| expires_at | timestamptz | Expiração (created_at + 24h) |
| is_active | boolean | Se ainda pode ser usado |
| created_at | timestamptz | Data de criação |

### Tabela 2: `photographer_qr_tokens` (Tokens QR dos Fotógrafos)

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | Identificador único |
| photographer_id | uuid | FK → profiles.id (único) |
| token | text | Token criptografado (HMAC-SHA256) |
| created_at | timestamptz | Data de criação |
| updated_at | timestamptz | Última atualização |

### Tabela 3: `event_attendance` (Registro de Presença)

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | Identificador único |
| campaign_id | uuid | FK → campaigns.id |
| photographer_id | uuid | FK → profiles.id |
| confirmed_by | uuid | FK → mesario_sessions.id |
| confirmed_at | timestamptz | Horário da confirmação |
| created_at | timestamptz | Data de criação |

**Constraint**: UNIQUE(campaign_id, photographer_id) - cada fotógrafo só pode ter 1 registro de presença por evento

---

## Arquivos a Criar

### Frontend (Páginas)

| Arquivo | Descrição |
|---------|-----------|
| `src/pages/MesarioLogin.tsx` | Login para mesários (código de 6 dígitos) |
| `src/pages/MesarioScanner.tsx` | Scanner + tela de confirmação de presença |
| `src/pages/dashboard/photographer/MyQRCode.tsx` | QR Code do fotógrafo |
| `src/pages/dashboard/admin/EventAttendance.tsx` | Lista de chamada do evento |

### Frontend (Componentes)

| Arquivo | Descrição |
|---------|-----------|
| `src/components/mesario/QRScanner.tsx` | Componente de scanner de câmera |
| `src/components/mesario/PhotographerConfirmation.tsx` | Card de confirmação com foto/nome |
| `src/components/mesario/AttendanceResult.tsx` | Tela de sucesso/erro após confirmação |
| `src/components/organization/CreateMesarioModal.tsx` | Modal para criar sessão de mesário |
| `src/components/admin/EventAttendanceList.tsx` | Tabela de lista de chamada |

### Backend (Edge Functions)

| Arquivo | Descrição |
|---------|-----------|
| `supabase/functions/create-mesario-session/index.ts` | Cria sessão temporária (24h) |
| `supabase/functions/validate-mesario-login/index.ts` | Valida código do mesário |
| `supabase/functions/validate-photographer-qr/index.ts` | Valida QR e retorna dados do fotógrafo |
| `supabase/functions/confirm-attendance/index.ts` | Registra presença do fotógrafo |

---

## Fluxos Detalhados

### Fluxo 1: Geração do QR Code (Fotógrafo)

```text
Fotógrafo acessa /dashboard/photographer/qrcode
        ↓
Sistema verifica se já tem token em photographer_qr_tokens
        ↓
    ┌───┴───┐
    Não     Sim
    ↓        ↓
Gera token  Usa token
(HMAC-SHA256) existente
    ↓        ↓
Salva no BD  
    ↓        ↓
    └───┬───┘
        ↓
Exibe QR Code com formato:
"STA-PHOTO:{token}"
```

**Conteúdo do QR Code:**
```
STA-PHOTO:eyJpZCI6IjEyMzQ1Njc4IiwidHMiOjE3MDkxMjM0NTYsInNpZyI6ImFiY2RlZjEyMyJ9
```
- Prefixo `STA-PHOTO:` para identificação
- Token = base64({ id: photographer_id, ts: timestamp, sig: hmac_signature })

### Fluxo 2: Login do Mesário

```text
Mesário acessa /mesario
        ↓
Insere código de 6 dígitos (ex: A3X7K9)
        ↓
Edge function validate-mesario-login
        ↓
Verifica:
  ✓ Código existe?
  ✓ Não expirou (< 24h)?
  ✓ is_active = true?
        ↓
    ┌───┴───┐
  Inválido  Válido
    ↓        ↓
 "Código    Retorna:
 expirado"  - Evento (campaign)
            - Nome do mesário
            - Fotógrafos aprovados
        ↓
Redireciona para /mesario/scanner
Salva sessão em sessionStorage
```

### Fluxo 3: Validação e Confirmação de Presença

```text
Mesário escaneia QR Code
        ↓
Sistema extrai token e valida assinatura
        ↓
Edge function validate-photographer-qr:
  - Decodifica token
  - Verifica assinatura HMAC
  - Busca photographer_id
  - Verifica em event_applications:
    WHERE campaign_id = X AND photographer_id = Y AND status = 'approved'
        ↓
    ┌───────┴───────┐
 Não aprovado      Aprovado
    ↓                ↓
┌──────────────┐  ┌──────────────────────────────┐
│  VERMELHO    │  │         CONFIRMAÇÃO          │
│     ✗        │  │                              │
│   ACESSO     │  │  [Avatar grande]             │
│   NEGADO     │  │                              │
│              │  │  João Carlos Silva           │
│  Este foto-  │  │                              │
│  grafo não   │  │  ✓ Aprovado para este evento │
│  está        │  │                              │
│  aprovado    │  │  [ CONFIRMAR PRESENÇA ]      │
│              │  │  [ CANCELAR ]                │
└──────────────┘  └──────────────────────────────┘
                            ↓
                  Mesário clica "Confirmar"
                            ↓
                  Edge function confirm-attendance:
                    INSERT INTO event_attendance
                            ↓
                  ┌──────────────────────────────┐
                  │        VERDE - SUCESSO       │
                  │                              │
                  │            ✓                 │
                  │                              │
                  │   PRESENÇA CONFIRMADA!       │
                  │                              │
                  │   João Carlos Silva          │
                  │   Entrada às 14:32           │
                  │                              │
                  │  [ VALIDAR PRÓXIMO ]         │
                  └──────────────────────────────┘
```

### Fluxo 4: Lista de Chamada (Admin)

```text
Admin acessa /dashboard/admin/events → Seleciona evento
        ↓
Nova aba "Lista de Chamada"
        ↓
Busca:
  1. event_applications WHERE campaign_id = X AND status = 'approved'
     → Todos os fotógrafos aprovados
  
  2. event_attendance WHERE campaign_id = X
     → Fotógrafos que confirmaram presença
        ↓
Monta tabela:
┌───────────────────────────────────────────────────────────────────┐
│  LISTA DE CHAMADA - Copa São Paulo 2026                           │
│  Data: 30/01/2026 | Local: Estádio Municipal                      │
├───────────────────────────────────────────────────────────────────┤
│  [Avatar] Nome               │ Status        │ Horário Chegada    │
│───────────────────────────────────────────────────────────────────│
│  [👤] João Carlos Silva      │ ✓ Presente    │ 14:32              │
│  [👤] Maria Aparecida        │ ✓ Presente    │ 14:45              │
│  [👤] Pedro Henrique Costa   │ ⏳ Aguardando  │ -                  │
│  [👤] Ana Beatriz Santos     │ ⏳ Aguardando  │ -                  │
└───────────────────────────────────────────────────────────────────┘
│                                                                   │
│  Resumo: 2 de 4 fotógrafos presentes (50%)                        │
│                                                                   │
│  [🔄 Atualizar Lista]                                             │
└───────────────────────────────────────────────────────────────────┘
```

---

## Rotas do Sistema

| Rota | Componente | Acesso |
|------|------------|--------|
| `/mesario` | MesarioLogin | Público |
| `/mesario/scanner` | MesarioScanner | Mesário logado (sessionStorage) |
| `/dashboard/photographer/qrcode` | MyQRCode | Fotógrafo |
| `/dashboard/admin/events/:id/attendance` | EventAttendance | Admin |

---

## Segurança

1. **Token do QR Code**: 
   - Assinado com HMAC-SHA256 usando secret do Supabase
   - Inclui timestamp para evitar replay attacks
   - Verificação de assinatura server-side

2. **Sessão do Mesário**:
   - Código de 6 caracteres alfanuméricos (sem I, O, 0, 1)
   - Expira automaticamente após 24 horas
   - Vinculado a um evento específico
   - Não pode ser reutilizado após expiração

3. **Validação de Presença**:
   - Verifica se fotógrafo está em `event_applications` com `status = 'approved'`
   - Previne duplicidade via UNIQUE constraint
   - Registra quem confirmou (mesario_session_id)

4. **RLS Policies**:
   - Mesários só veem dados do evento atribuído
   - Admins veem tudo
   - Fotógrafos veem apenas seu próprio QR

---

## Dependências NPM

```bash
npm install qrcode.react html5-qrcode
```

- **qrcode.react**: Gera QR Code como SVG
- **html5-qrcode**: Scanner de câmera mobile-friendly

---

## Telas Visuais

### Tela do Fotógrafo (QR Code)

```text
┌──────────────────────────────────────────┐
│  MEU QR CODE DE IDENTIFICAÇÃO            │
├──────────────────────────────────────────┤
│                                          │
│        ┌────────────────────┐            │
│        │                    │            │
│        │   [QR CODE 280px]  │            │
│        │                    │            │
│        └────────────────────┘            │
│                                          │
│        João Carlos Silva                 │
│        Fotógrafo verificado ✓            │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │  💡 Apresente este QR Code ao      │  │
│  │  mesário na entrada do evento      │  │
│  └────────────────────────────────────┘  │
│                                          │
│  [ Baixar QR Code ]  [ Tela Cheia ]      │
│                                          │
└──────────────────────────────────────────┘
```

### Tela do Mesário (Confirmação)

```text
┌──────────────────────────────────────────┐
│  VALIDAR FOTÓGRAFO                       │
│  Copa São Paulo 2026                     │
├──────────────────────────────────────────┤
│                                          │
│        ┌────────────────────┐            │
│        │                    │            │
│        │   [AVATAR 120px]   │            │
│        │                    │            │
│        └────────────────────┘            │
│                                          │
│        João Carlos Silva                 │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │  ✓ APROVADO PARA ESTE EVENTO       │  │
│  │                                    │  │
│  │  Candidatura aprovada em 25/01     │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │       CONFIRMAR PRESENÇA           │  │
│  │         (botão verde)              │  │
│  └────────────────────────────────────┘  │
│                                          │
│  [ Cancelar e escanear outro ]           │
│                                          │
└──────────────────────────────────────────┘
```

### Tela Admin (Lista de Chamada)

```text
┌────────────────────────────────────────────────────────────────────┐
│  📋 LISTA DE CHAMADA                                               │
│  Copa São Paulo 2026 - 30/01/2026                                  │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Resumo                                                      │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐           │  │
│  │  │ 4 Aprovados │  │ 2 Presentes │  │ 50% Taxa    │           │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘           │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Fotógrafo              │ Status       │ Entrada    │ Ações  │  │
│  │────────────────────────────────────────────────────────────────│ │
│  │  [👤] João Carlos       │ ✓ Presente   │ 14:32      │ [Ver]  │  │
│  │  [👤] Maria Aparecida   │ ✓ Presente   │ 14:45      │ [Ver]  │  │
│  │  [👤] Pedro Henrique    │ ⏳ Aguardando │ -          │ [Ver]  │  │
│  │  [👤] Ana Beatriz       │ ⏳ Aguardando │ -          │ [Ver]  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  [🔄 Atualizar] [📊 Exportar PDF]                                  │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## Ordem de Implementação

1. **Migrations** - Criar tabelas `mesario_sessions`, `photographer_qr_tokens`, `event_attendance`
2. **Dependências** - Instalar `qrcode.react` e `html5-qrcode`
3. **Edge Function** - `create-mesario-session`
4. **Edge Function** - `validate-mesario-login`
5. **Edge Function** - `validate-photographer-qr`
6. **Edge Function** - `confirm-attendance`
7. **Frontend** - `MyQRCode.tsx` (QR do fotógrafo)
8. **Frontend** - `MesarioLogin.tsx` (Login mesário)
9. **Frontend** - `MesarioScanner.tsx` (Scanner + confirmação)
10. **Frontend** - `EventAttendanceList.tsx` (Lista de chamada)
11. **Frontend** - `CreateMesarioModal.tsx` (Criar sessão mesário)
12. **Rotas** - Adicionar em `App.tsx`
13. **Integração** - Links no dashboard do fotógrafo, organização e admin
