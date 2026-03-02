

## Plano: Bloquear alteração de preço pelo fotógrafo após definição

### Problema
Atualmente, o fotógrafo pode alterar livremente tanto o `photo_price_display` (preço do evento) quanto o `price` individual de cada foto, mesmo após já ter definido esses valores.

### Solução
Bloquear a edição de preços pelo fotógrafo em 3 pontos do código:

### Mudanças

**1. `src/components/modals/EditEventModal.tsx`**
- Receber uma nova prop `isPhotographer` (boolean)
- Quando `isPhotographer === true` e `photo_price_display` já tem valor, desabilitar o campo de preço e mostrar aviso "Preço já definido, não pode ser alterado"
- Remover `photo_price_display` do objeto de update quando fotógrafo tenta salvar e o valor já existia

**2. `src/components/modals/UploadPhotoModal.tsx`**
- Verificar se o evento já possui fotos com preço definido pelo fotógrafo
- Se o evento já tem `photo_price_display` definido OU já tem fotos publicadas, travar o campo de preço no valor existente
- Expandir a lógica `priceLockedByAdmin` para incluir também o cenário "fotógrafo já definiu o preço anteriormente" — renomear para `priceLocked`

**3. `src/pages/Campaign.tsx`** e **`src/components/dashboard/CampaignManager.tsx`**
- Passar `isPhotographer` ao `EditEventModal` baseado no role do perfil logado

### Lógica de bloqueio
- Se `campaign.photo_price_display` já tem valor e o usuário é fotógrafo → campo desabilitado
- Se o evento já tem fotos e o usuário é fotógrafo → preço individual travado no valor da primeira foto ou do `photo_price_display`
- Admin sempre pode alterar preços (sem restrição)

### Arquivos modificados
- `src/components/modals/EditEventModal.tsx` — desabilitar campo de preço para fotógrafo
- `src/components/modals/UploadPhotoModal.tsx` — travar preço após primeira definição
- `src/pages/Campaign.tsx` — passar prop `isPhotographer`
- `src/components/dashboard/CampaignManager.tsx` — passar prop `isPhotographer=false`

