

## Plano de Implementação - 4 Mudanças Solicitadas

### 1. Mesário: Incluir nome do evento e organização na mensagem

**Problema**: A mensagem do WhatsApp e o modal do mesário não mostram o nome da organização.

**Solução**:
- Adicionar prop `organizationName` ao `CreateMesarioModal`
- Atualizar a mensagem do WhatsApp para incluir organização: *"evento 'X' da organização 'Y'"*
- Atualizar o `DialogDescription` para exibir evento + organização
- No `EventAttendance.tsx`, buscar `organization_id` da campanha, depois o nome da organização, e passar como prop

**Arquivos**: `src/components/organization/CreateMesarioModal.tsx`, `src/pages/dashboard/admin/EventAttendance.tsx`

---

### 2. Faixa Beta + Botão WhatsApp no topo do site

**Problema**: O site não indica que está em fase beta.

**Solução**:
- Criar um componente `BetaBanner` com uma faixa sutil fixa no topo (altura ~32px)
- Texto: "🚧 Este site está em fase beta" + botão "WhatsApp" com link direto para contato
- Cores: fundo amarelo/dourado sutil, texto pequeno
- Botão de fechar (X) para o usuário dispensar (salva no localStorage)
- Adicionar no `MainLayout.tsx` antes do `<Header />`

**Arquivos**: Novo `src/components/layout/BetaBanner.tsx`, editar `src/components/layout/MainLayout.tsx`

---

### 3. Barra de busca no gerenciamento de fotógrafos

**Problema**: Ao atribuir fotógrafos a um evento, a lista é grande e difícil de navegar.

**Solução**:
- Adicionar um estado `searchQuery` no `CampaignPhotographersManager`
- Inserir um `<Input>` com ícone de busca acima da lista de fotógrafos disponíveis
- Filtrar `availablePhotographers` por `full_name` ou `email` que contenha o termo buscado
- Filtro em tempo real, case-insensitive

**Arquivo**: `src/components/dashboard/CampaignPhotographersManager.tsx`

---

### 4. Candidatura rejeitada causa refresh/volta ao início do dashboard

**Problema**: Ao rejeitar uma candidatura no `ApplicationsManager`, o `fetchApplications()` recarrega tudo e pode perder a posição do scroll ou o estado das tabs.

**Solução**:
- No `ApplicationsManager.tsx`, em vez de chamar `fetchApplications()` após rejeitar, atualizar o estado localmente: mudar o `status` da aplicação para `'rejected'` diretamente no array `applications` via `setApplications`
- Isso evita recarregar a página inteira e mantém a posição do usuário
- Mesmo tratamento para aprovação: atualizar localmente em vez de refetch completo

**Arquivo**: `src/components/dashboard/ApplicationsManager.tsx`

---

### Resumo de Arquivos

| Arquivo | Ação |
|---------|------|
| `src/components/layout/BetaBanner.tsx` | Criar |
| `src/components/layout/MainLayout.tsx` | Editar (adicionar BetaBanner) |
| `src/components/organization/CreateMesarioModal.tsx` | Editar (add organizationName) |
| `src/pages/dashboard/admin/EventAttendance.tsx` | Editar (buscar org name, passar prop) |
| `src/components/dashboard/CampaignPhotographersManager.tsx` | Editar (add busca) |
| `src/components/dashboard/ApplicationsManager.tsx` | Editar (update local ao invés de refetch) |

