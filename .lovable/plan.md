

# Plano: Correcoes de Data, Porcentagem e Upload de Logo

## 3 Problemas a Resolver

---

## 1. Datas dos eventos mudando sozinhas

**Problema:** Quando o admin edita um evento e salva, a data pode ser alterada involuntariamente. Isso pode ocorrer porque o campo `event_date` nao esta sendo tratado corretamente no formato do input date HTML (`YYYY-MM-DD`).

**Solucao:** Garantir que o `event_date` seja sempre convertido para `YYYY-MM-DD` antes de popular o estado do formulario de edicao, usando `.split('T')[0]` para remover qualquer parte de hora/timezone. Tambem garantir que ao salvar, somente a data limpa seja enviada.

**Arquivos:**
| Arquivo | Mudanca |
|---------|---------|
| `src/components/modals/EditEventModal.tsx` | Linhas 60, 99: Aplicar `.split('T')[0]` ao `event_date` ao inicializar e no useEffect |
| `src/components/dashboard/CampaignManager.tsx` | Garantir que `event_date` seja passado como string limpa `YYYY-MM-DD` ao `EditEventModal` |

---

## 2. Remover "100 pessoas" e mostrar apenas porcentagem do fotografo

**Problema:** Na listagem de candidaturas (print), ainda aparece "100 pessoas" (expected_audience). O cliente quer ver apenas a porcentagem que o fotografo ganha, sem o valor em reais.

**Solucao:** No arquivo `EventApplications.tsx`, substituir o bloco de `expected_audience` por uma linha que mostre a porcentagem do fotografo (ex: "Voce ganha 60%"). Buscar `photographer_percentage` na query.

**Arquivos:**
| Arquivo | Mudanca |
|---------|---------|
| `src/pages/dashboard/photographer/EventApplications.tsx` | Linhas 64-68: Adicionar `photographer_percentage` na query. Linhas 186-191: Substituir `expected_audience` por porcentagem do fotografo |
| `src/pages/dashboard/photographer/EventApplicationDetail.tsx` | Linhas 226-233: Simplificar para mostrar apenas porcentagem, sem o valor em reais |

---

## 3. Upload de logo da organizacao pelo admin

**Problema:** Atualmente o admin so consegue colar uma URL para a logo. Precisa de um botao de upload que envie a imagem para o Supabase Storage.

**Solucao:** 
1. Criar bucket `org-logos` no Supabase Storage (migration SQL)
2. Adicionar funcionalidade de upload de arquivo nos dialogos de criar e editar organizacao em `OrganizationManager.tsx`
3. O admin clica em "Enviar Logo", seleciona o arquivo, ele sobe para o bucket e a URL publica eh salva no campo `logo_url`

**Arquivos:**
| Arquivo | Mudanca |
|---------|---------|
| `supabase/migrations/create_org_logos_bucket.sql` | Criar bucket `org-logos` publico com politicas RLS para admin |
| `src/components/dashboard/OrganizationManager.tsx` | Adicionar input file + botao upload nos dialogos de criar e editar. Usar `logoInputRef` e `uploadingLogo` que ja existem mas nao estao sendo usados. Upload para `org-logos` bucket |

---

## Secao Tecnica

### Correcao de Data
```text
// EditEventModal.tsx - Ao inicializar e no useEffect:
ANTES: setEventDate(campaignData.event_date || '');
DEPOIS: setEventDate(campaignData.event_date?.split('T')[0] || '');
```

### Cards de Candidatura - Porcentagem
```text
// EventApplications.tsx - Query:
Adicionar: photographer_percentage na select

// Substituir bloco expected_audience por:
{campaign.photographer_percentage > 0 && (
  <div className="flex items-center gap-2">
    <DollarSign className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
    <span className="text-emerald-600">Voce ganha {campaign.photographer_percentage}%</span>
  </div>
)}
```

### Bucket de Logos
```text
-- Migration SQL
INSERT INTO storage.buckets (id, name, public) VALUES ('org-logos', 'org-logos', true);
-- Politica: qualquer autenticado pode fazer upload (admin controla via frontend)
CREATE POLICY "Authenticated upload org logos" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'org-logos');
CREATE POLICY "Public read org logos" ON storage.objects
  FOR SELECT USING (bucket_id = 'org-logos');
```

### Upload de Logo no OrganizationManager
Utilizar os estados `uploadingLogo` e `logoInputRef` ja declarados no componente. Ao selecionar arquivo, fazer upload para `org-logos/{org_id}_{timestamp}.ext`, obter URL publica e salvar no `formData.logo_url`.

