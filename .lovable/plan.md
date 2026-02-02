
## Plano: Correção Total do Modal de Upload

### Problemas Encontrados

1. **Evento "GOAL CUP | Campo do Mec" está desativado** no banco de dados (`is_active: false`)
2. **Painel de regras muito poluído** - o usuário quer remover
3. **Seleção de evento não funciona** - problema com Popover dentro de Dialog
4. **Limite atual é 60 dias** - reduzir para 30 dias
5. **Muitos eventos aparecendo** - lista muito longa

---

### Solução Proposta

#### 1. Ativar o Evento no Banco de Dados
Executar SQL para reativar o evento:
```sql
UPDATE campaigns 
SET is_active = true 
WHERE id = 'd5f4ad5a-c108-4b40-a7a6-4573b2d380f7';
```

#### 2. Remover o Painel de Regras de Upload
- Remover completamente o bloco amarelo com as regras
- Interface mais limpa e focada

#### 3. Corrigir o Seletor de Eventos
O problema é que o `Popover` dentro de um `Dialog` pode ter problemas de z-index e captura de cliques. Solução:
- Adicionar `modal={false}` ao Popover para evitar conflitos
- Usar `onPointerDownOutside` para fechar corretamente
- Aumentar z-index do PopoverContent

#### 4. Alterar Limite para 30 dias
```typescript
const MAX_PAST_DAYS = 30; // Era 60, agora 30
```

#### 5. Simplificar Interface
- Remover badge "Futuro" dos eventos (redundante)
- Compactar exibição de cada evento
- Limitar altura da lista para melhor navegação

---

### Arquivos a Serem Modificados

| Arquivo | Alteração |
|---------|-----------|
| `src/components/modals/UploadPhotoModal.tsx` | Remover painel de regras, alterar limite para 30 dias |
| `src/components/modals/SearchableEventSelect.tsx` | Corrigir Popover, simplificar UI dos eventos |

---

### Detalhes Técnicos

#### SearchableEventSelect - Correções

```typescript
// Adicionar props ao Popover para evitar conflitos com Dialog
<Popover open={open} onOpenChange={setOpen} modal={false}>

// Aumentar z-index do PopoverContent
<PopoverContent 
  className="w-[--radix-popover-trigger-width] p-0 z-[9999]" 
  align="start"
  sideOffset={4}
  onPointerDownOutside={(e) => e.preventDefault()}
>
```

#### UploadPhotoModal - Limpeza

- Remover linhas 429-463 (todo o bloco de regras amarelo)
- Alterar linha 125: `const MAX_PAST_DAYS = 30;`

---

### Benefícios

1. Evento "Campo do Mec" aparecerá após ativar no banco
2. Interface limpa sem painel de regras
3. Seleção de eventos funcionará corretamente
4. Apenas eventos dos últimos 30 dias visíveis
5. Experiência mais rápida e fluida
