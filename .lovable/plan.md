

# Plano Combinado: Mesario 4 dias + WhatsApp + Admin Eventos + Candidaturas

## Parte 1: Mesario - Expiracao de 4 dias

| Arquivo | Mudanca |
|---------|---------|
| `supabase/functions/create-mesario-session/index.ts` | `setHours(+12)` para `setDate(+4)` |
| `src/pages/MesarioLogin.tsx` | "Valido por 24h" para "Valido por 4 dias" |
| `src/components/organization/CreateMesarioModal.tsx` | Textos "24 horas" para "4 dias" |

## Parte 2: Mesario - Envio via WhatsApp (custo zero)

| Arquivo | Mudanca |
|---------|---------|
| `src/components/organization/CreateMesarioModal.tsx` | Campo WhatsApp + botao "Enviar via WhatsApp" usando link `wa.me` |
| `src/pages/dashboard/admin/MesarioManager.tsx` | Botao WhatsApp na tabela de sessoes ativas |

## Parte 3: Painel de Eventos do Admin - Redesign

| Arquivo | Mudanca |
|---------|---------|
| `src/components/dashboard/CampaignManager.tsx` | Cards com capa, badges de status, toggle inscricoes, contadores de fotografos/candidaturas |
| `src/pages/dashboard/admin/Events.tsx` | Filtros (Todos/Ativos/Inscricoes Abertas) e busca |

## Parte 4: Candidaturas do Fotografo - Melhoria + Remover Eventos Proximos

| Arquivo | Mudanca |
|---------|---------|
| `src/pages/EventosProximos.tsx` | EXCLUIR (duplicado) |
| `src/App.tsx` | Remover rota `/eventos-proximos` |
| `src/components/dashboard/DashboardSidebar.tsx` | Remover link "Eventos Proximos" |
| `src/components/layout/DynamicBreadcrumb.tsx` | Remover breadcrumb |
| `src/pages/dashboard/photographer/EventApplications.tsx` | Abas "Disponiveis" / "Minhas Candidaturas", cards melhorados |
| `src/pages/dashboard/photographer/EventApplicationDetail.tsx` | Formulario inline com secoes agrupadas |
| `src/components/events/EventApplicationForm.tsx` | Visual melhorado |

## Secao Tecnica

### Edge Function
```text
// create-mesario-session/index.ts
ANTES: expiresAt.setHours(expiresAt.getHours() + 12);
DEPOIS: expiresAt.setDate(expiresAt.getDate() + 4);
```

### WhatsApp (API gratuita)
```text
const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(mensagem)}`;
window.open(whatsappUrl, '_blank');
```

### Admin Cards
Cada card de evento exibira: capa thumbnail, titulo, local, data, badges (Ativa/Inativa, Inscricoes Abertas/Fechadas), contadores de fotografos atribuidos e candidaturas pendentes, switch inline para applications_open.

### Candidaturas
Duas abas no dashboard do fotografo: eventos disponiveis (com inscricoes abertas) e candidaturas ja enviadas (com status). Formulario embutido direto na pagina de detalhes do evento.

Nenhuma migration de banco necessaria. Deploy da edge function `create-mesario-session` apos alteracao.

