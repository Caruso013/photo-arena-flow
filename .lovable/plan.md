

## Plano: Adicionar botão "Copiar Link" no dashboard do fotógrafo

### Mudanças

**Arquivo**: `src/pages/dashboard/photographer/PhotographerEvents.tsx`

1. Importar `Link2` (ícone de link) do `lucide-react` e `copyShareLink` do `shareUtils`
2. Adicionar botão de copiar link ao lado do botão "Gerenciar Evento" e do botão de excluir
3. Ao clicar, copia o link do evento (`{origin}/#/E/{short_code}`) para o clipboard e mostra toast "Link copiado!"
4. Também ordenar os eventos por `event_date` em vez de `created_at` (melhoria solicitada anteriormente)

### Detalhes técnicos

- O botão será um `Button variant="outline" size="icon"` com o ícone `Link2`
- Usa a função `copyShareLink` já existente em `src/lib/shareUtils.ts`
- Tooltip visual via título no botão
- Toast de confirmação ao copiar

### Layout do card (botões)

```text
[ Gerenciar Evento (flex-1) ] [ 🔗 ] [ 🗑️ ]
```

