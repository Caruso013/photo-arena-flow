

# Correção: Fotógrafos Atribuídos Devem Ser Reconhecidos como Aprovados

## Problema Identificado

O scanner do mesário está mostrando "ACESSO NEGADO" para o fotógrafo **Kauan castao** mesmo estando atribuído ao evento "S15 - Gthree x Alfa". Isso acontece porque:

- A validação atual verifica **somente** `event_applications.status = 'approved'`
- Fotógrafos atribuídos diretamente via `campaign_photographers` não são considerados
- O fotógrafo criador do evento (`campaigns.photographer_id`) também não é verificado

## Solução

Modificar as edge functions para considerar um fotógrafo como "aprovado" se ele atender a **qualquer uma** das condições:

1. Tem candidatura aprovada em `event_applications` com `status = 'approved'`
2. Está atribuído ao evento em `campaign_photographers` com `is_active = true`
3. É o fotógrafo criador do evento (`campaigns.photographer_id`)

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/validate-photographer-qr/index.ts` | Adicionar verificação em `campaign_photographers` e `campaigns.photographer_id` |
| `supabase/functions/confirm-attendance/index.ts` | Mesma lógica de verificação |

## Mudanças Técnicas

### 1. validate-photographer-qr/index.ts

**Antes:**
```typescript
// Verificar se está aprovado para este evento
const { data: application } = await supabase
  .from('event_applications')
  .select('id, status, applied_at, processed_at')
  .eq('campaign_id', campaign_id)
  .eq('photographer_id', qrToken.photographer_id)
  .eq('status', 'approved')
  .single();

const isApproved = !!application;
```

**Depois:**
```typescript
// Verificar aprovação por múltiplas fontes
let isApproved = false;
let approvalSource = null;

// 1. Verificar se é o criador do evento
const { data: campaign } = await supabase
  .from('campaigns')
  .select('photographer_id')
  .eq('id', campaign_id)
  .single();

if (campaign?.photographer_id === qrToken.photographer_id) {
  isApproved = true;
  approvalSource = 'event_creator';
}

// 2. Verificar se está atribuído via campaign_photographers
if (!isApproved) {
  const { data: assignment } = await supabase
    .from('campaign_photographers')
    .select('id, assigned_at')
    .eq('campaign_id', campaign_id)
    .eq('photographer_id', qrToken.photographer_id)
    .eq('is_active', true)
    .single();

  if (assignment) {
    isApproved = true;
    approvalSource = 'assigned';
  }
}

// 3. Verificar candidatura aprovada (mantém compatibilidade)
let application = null;
if (!isApproved) {
  const { data: appData } = await supabase
    .from('event_applications')
    .select('id, status, applied_at, processed_at')
    .eq('campaign_id', campaign_id)
    .eq('photographer_id', qrToken.photographer_id)
    .eq('status', 'approved')
    .single();
    
  if (appData) {
    isApproved = true;
    approvalSource = 'application';
    application = appData;
  }
}
```

### 2. confirm-attendance/index.ts

Aplicar a mesma lógica de verificação múltipla antes de registrar a presença.

## Fluxo Após Correção

```text
Mesário escaneia QR Code
        │
        ▼
Verificar aprovação:
   ┌─────────────────────────────────────────────────┐
   │ 1. É criador do evento (campaigns.photographer_id)?  │
   │    SIM → Aprovado (fonte: "event_creator")           │
   │                                                       │
   │ 2. Está em campaign_photographers (is_active=true)?  │
   │    SIM → Aprovado (fonte: "assigned")                │
   │                                                       │
   │ 3. Tem event_applications status='approved'?         │
   │    SIM → Aprovado (fonte: "application")             │
   │                                                       │
   │ Nenhum? → Acesso Negado                              │
   └─────────────────────────────────────────────────┘
        │
        ▼
   [Tela de confirmação com nome/foto]
        │
        ▼
   [Confirmar Presença]
```

## Resultado Esperado

- **Kauan castao** (atribuído ao evento) será reconhecido como **APROVADO**
- Fotógrafos que criaram o evento também serão aprovados automaticamente
- Candidaturas aprovadas continuam funcionando normalmente
- A lista de chamada do admin continuará mostrando apenas os de `event_applications` (conforme solicitado)

## Ordem de Implementação

1. Atualizar `validate-photographer-qr/index.ts`
2. Atualizar `confirm-attendance/index.ts`
3. Deploy das edge functions
4. Testar com o QR Code do Kauan castao

