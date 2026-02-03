

## Plano: Correção Total do Modal de Upload

### Problemas Identificados

1. **Evento "GOAL CUP | Campo do Mec" já está ativo** no banco de dados - o problema é a interação do seletor
2. **Painel de regras muito poluído** - remover completamente
3. **Seleção de evento não funciona** - Popover dentro de Dialog captura cliques incorretamente
4. **Limite atual é 60 dias** - reduzir para 30 dias
5. **Interface muito complexa** - simplificar exibição de eventos
6. **Sequência de fotos** - já está implementada no `backgroundUploadService.ts` usando `extractFileSequence` e `upload_sequence`

---

### Correções a Implementar

#### 1. Corrigir SearchableEventSelect (Problema Principal)

O Popover dentro de um Dialog tem conflito de modais. Correções:

| Linha | Alteração |
|-------|-----------|
| 143 | Adicionar `modal={false}` ao Popover |
| 181-184 | Adicionar `z-index: 9999`, `onPointerDownOutside`, `onInteractOutside` |
| 232-286 | Simplificar layout dos itens (remover badge "Futuro", compactar) |

Código corrigido para o Popover:
```typescript
<Popover open={open} onOpenChange={setOpen} modal={false}>
```

Código corrigido para PopoverContent:
```typescript
<PopoverContent 
  className="w-[--radix-popover-trigger-width] p-0 z-[9999]" 
  align="start"
  sideOffset={4}
  onPointerDownOutside={(e) => e.preventDefault()}
  onInteractOutside={(e) => e.preventDefault()}
>
```

Simplificar itens da lista (remover ícone grande, badge "Futuro"):
```typescript
<button type="button" onClick={() => handleSelect(event.id)} ...>
  <div className="flex items-center gap-3">
    <Camera className="h-4 w-4 text-primary" />
    <div className="flex-1">
      <p className="font-medium truncate text-sm">{event.title}</p>
      <span className="text-xs text-muted-foreground">
        {formatEventDate(event.event_date)} • {event.location}
      </span>
    </div>
    {isSelected && <CheckIcon />}
  </div>
</button>
```

#### 2. Atualizar UploadPhotoModal

| Linha | Alteração |
|-------|-----------|
| 125 | Mudar `MAX_PAST_DAYS = 60` para `MAX_PAST_DAYS = 30` |
| 429-463 | **REMOVER** todo o bloco do painel de regras amarelo |

#### 3. Sobre a Sequência de Fotos (Já Implementado)

O sistema já possui lógica de sequenciamento em `backgroundUploadService.ts`:

- **Linha 21-37**: Função `extractFileSequence` extrai número do nome do arquivo (ex: IMG_0234.jpg vira 234)
- **Linha 96-97**: Tarefas são ordenadas por `fileSequence` antes do upload
- **Linha 207-221**: `upload_sequence` é calculado somando offset + fileSequence
- **Linha 264**: O campo `upload_sequence` é gravado no banco

A sequência está funcionando corretamente!

---

### Arquivos a Modificar

| Arquivo | Alterações |
|---------|-----------|
| `src/components/modals/SearchableEventSelect.tsx` | Corrigir Popover modal, simplificar lista |
| `src/components/modals/UploadPhotoModal.tsx` | Remover painel de regras, alterar limite para 30 dias |

---

### Benefícios

- Seleção de eventos funcionará sem conflitos
- Interface mais limpa e objetiva
- Limite de 30 dias conforme solicitado
- Sequência de fotos já está funcionando corretamente

