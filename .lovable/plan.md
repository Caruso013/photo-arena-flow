

## Plano: Melhoria do Modal de Upload com Pesquisa e Regras Formalizadas

### Resumo
Vamos aprimorar o modal de upload de fotos para facilitar a vida de fotógrafos com muitos eventos, adicionando:
1. **Campo de pesquisa** para filtrar eventos rapidamente
2. **Exibição de informações extras** (data, local) para diferenciar eventos
3. **Regras de upload formalizadas** e mais claras

---

### O que será melhorado

#### Para o Fotógrafo
- Barra de busca integrada ao seletor de eventos
- Filtrar eventos por nome, local ou data digitando
- Ver data e localização de cada evento na lista
- Contador de eventos disponíveis
- Eventos ordenados por data (mais recentes primeiro)

#### Regras de Upload (Atualizadas)
- Eventos futuros: sempre disponíveis
- **Eventos passados: até 60 dias após a data** (alterado de 180 para 60)
- Limite por arquivo: 2.5MB
- Formatos aceitos: JPEG, PNG, WebP
- Chave PIX obrigatória para upload

---

### Detalhes Técnicos

#### 1. Criar Componente de Select com Pesquisa

Novo componente `SearchableEventSelect` que combina um campo de busca com a lista de eventos:

```text
+----------------------------------------------+
|  Buscar evento...                            |
+----------------------------------------------+
|  GOAL CUP | Campo do Mec                     |
|     31/01/2026 - Campo do Mec                |
+----------------------------------------------+
|  Campeonato Regional                         |
|     15/02/2026 - Ginasio Municipal           |
+----------------------------------------------+
|  Copa das Estrelas                           |
|     28/02/2026 - Estadio Central             |
+----------------------------------------------+
```

**Arquivo:** `src/components/modals/SearchableEventSelect.tsx`

#### 2. Atualizar Interface Campaign

Adicionar campos `event_date` e `location` a interface:

```typescript
interface Campaign {
  id: string;
  title: string;
  event_date?: string;
  location?: string;
}
```

#### 3. Atualizar Query de Campanhas

Modificar a busca para incluir `location`:

```typescript
.select('id, title, event_date, is_active, location')
```

#### 4. Logica de Filtragem (60 dias)

```typescript
const MAX_PAST_DAYS = 60; // Limite de 60 dias para eventos passados

const validCampaigns = allCampaigns.filter((c) => {
  if (!c || !c.is_active) return false;
  if (!c.event_date) return true; // Sem data = disponivel
  
  const eventDate = new Date(c.event_date);
  const now = new Date();
  const isFuture = eventDate >= now;
  const daysPassed = (now.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24);
  
  return isFuture || daysPassed <= MAX_PAST_DAYS;
});
```

#### 5. Ordenacao de Eventos

Eventos serao ordenados por:
1. Eventos futuros primeiro (por data ascendente)
2. Eventos passados depois (por data descendente - mais recentes primeiro)

#### 6. Painel de Regras (Info Box)

Secao informativa visivel no modal:

```text
+----------------------------------------+
| Regras de Upload                       |
|                                        |
| - Eventos futuros: sempre disponiveis  |
| - Eventos passados: ate 60 dias        |
| - Maximo por foto: 2.5MB               |
| - Formatos: JPEG, PNG, WebP            |
| - Chave PIX obrigatoria                |
+----------------------------------------+
```

---

### Arquivos a Serem Modificados

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/modals/SearchableEventSelect.tsx` | **NOVO** - Componente de selecao com busca |
| `src/components/modals/UploadPhotoModal.tsx` | Substituir Select por SearchableEventSelect, adicionar painel de regras, alterar limite para 60 dias |

---

### Beneficios

1. **Rapidez**: Fotografos encontram eventos em segundos
2. **Clareza**: Informacoes de data/local evitam confusao
3. **Organizacao**: Eventos ordenados logicamente
4. **Transparencia**: Regras de upload visiveis e claras
5. **Limite razoavel**: 60 dias para uploads em eventos passados

