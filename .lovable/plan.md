# Reconhecimento Facial por Álbum — Arquitetura e Plano

Funcionalidade que permite ao cliente enviar uma selfie e receber automaticamente todas as fotos do álbum em que ele aparece. Escopo restrito ao álbum atual (sub_event), com pipeline assíncrono de indexação no upload e busca vetorial rápida na hora da selfie.

## 1. Visão geral do fluxo

```text
Fotógrafo                       Cliente
   │ upload de fotos              │ abre álbum
   ▼                              ▼
[Storage original]          [Botão "Encontrar minhas fotos"]
   │                              │
   ▼                              ▼
[Edge Function: enqueue]    [Modal: selfie ou upload]
   │                              │
   ▼                              ▼
[Job: detect+embed por foto][Edge Function: search-by-face]
   │                              │
   ▼                              ▼
[photo_face_embeddings]  ──►  [pgvector match no álbum]
                                  │
                                  ▼
                          [Galeria de resultados]
```

## 2. Stack escolhida (custo/escala)

- **Detecção + embeddings**: `@vladmandic/face-api` (fork mantido do face-api.js) rodando em Edge Function Deno usando WASM/TFJS. Modelo `SsdMobilenetv1` + `FaceLandmark68Net` + `FaceRecognitionNet` (descritor 128-D, mesmo padrão já usado no projeto).
- **Armazenamento vetorial**: extensão `pgvector` no Supabase, coluna `vector(128)` com índice `ivfflat` por similaridade cosseno.
- **Fila/Jobs**: tabela `face_processing_jobs` + `pg_cron` chamando uma Edge Function worker a cada minuto (consistente com o stack atual; sem Redis/BullMQ extra).
- **Frontend**: detecção local opcional com face-api.js já presente para validar qualidade da selfie antes de enviar (reduz custo).
- **Selfie**: nunca persistida — processada em memória na Edge Function, descartada após gerar o embedding.

> Por que não AWS Rekognition / InsightFace agora: custo por imagem e operação extra. A arquitetura abaixo isola o "motor" atrás de uma única Edge Function (`generate-face-embedding`) — trocar por Rekognition no futuro é só reimplementar essa função.

## 3. Banco de dados

Migração nova (a aprovar quando você confirmar o plano):

- Extensão: `create extension if not exists vector;`
- Tabela `photo_face_embeddings`
  - `photo_id uuid` (ref. lógica a `photos`)
  - `campaign_id uuid`, `sub_event_id uuid` (denormalizado para filtrar álbum sem join)
  - `embedding vector(128) not null`
  - `bbox jsonb` (x, y, w, h, score)
  - `face_index int` (várias faces por foto)
  - `created_at`
  - Índice `ivfflat (embedding vector_cosine_ops) with (lists = 100)`
  - Índice composto `(sub_event_id)` e `(campaign_id)`
- Tabela `face_processing_jobs`
  - `photo_id`, `status` (`pending|processing|done|failed`), `attempts`, `last_error`, `created_at`, `updated_at`
  - Índice parcial em `status='pending'`
- Tabela `face_search_logs` (auditoria LGPD, sem selfie)
  - `user_id`, `sub_event_id`, `matches_count`, `created_at`
- RLS:
  - `photo_face_embeddings`: SELECT público (só vetor, sem PII) — necessário para o RPC; INSERT/DELETE só pelo service role (Edge Function).
  - `face_processing_jobs`: somente service role + admin.
  - `face_search_logs`: usuário vê os próprios; admin vê todos.
- RPC `match_faces_in_album(p_sub_event_id uuid, p_embedding vector, p_threshold float, p_limit int)` retornando `photo_id, similarity` — encapsula a query vetorial.
- Trigger em `photos` after insert → enfileira job em `face_processing_jobs`.
- Função `delete_user_face_data(p_user_id)` para LGPD (apaga logs do usuário; embeddings de fotos não pertencem ao usuário).

## 4. Edge Functions

1. **`face-worker`** (cron a cada 1 min, lote de N=20)
   - Lê jobs `pending`, marca `processing`.
   - Baixa thumbnail da foto, roda face-api WASM, gera N embeddings.
   - Insere em `photo_face_embeddings`, marca job `done`. Em erro, incrementa `attempts` (máx 3).
2. **`generate-face-embedding`** (chamada pelo frontend com a selfie)
   - Recebe imagem base64, valida tamanho/MIME, detecta **1** rosto, retorna embedding 128-D. Não persiste nada.
3. **`search-faces-in-album`**
   - Input: `sub_event_id`, `embedding`, `threshold` (default 0.55), `limit` (default 100).
   - Chama RPC `match_faces_in_album`, devolve `photo_id` ordenados por similaridade.
   - Loga em `face_search_logs`.
4. **`reprocess-album-faces`** (admin) — re-enfileira todas as fotos de um álbum.

Todas com CORS padrão, validação Zod, JWT validado via `getClaims`.

## 5. Frontend

Novo componente `AlbumFaceSearch` em `src/components/face/`:

- Botão "Encontrar minhas fotos" dentro de `src/pages/Campaign.tsx`, ao lado dos filtros do álbum atual.
- Modal com 2 tabs: **Selfie (câmera)** e **Upload de foto**.
- Pré-validação local: usa face-api do cliente (já carregado em `useFaceRecognition`) para checar que existe exatamente 1 rosto bem enquadrado antes de enviar. Reduz custo no servidor.
- Chama `generate-face-embedding` → `search-faces-in-album` → filtra a galeria do álbum por `photo_id` retornados, ordenados por similaridade.
- Estado da busca persistido em URL (`?face=session-id`) para o usuário poder voltar.
- Slider opcional (avançado) de tolerância 0.45–0.70.
- Aviso LGPD claro + link de "Excluir meus dados faciais".

Hook novo `useAlbumFaceSearch(subEventId)` encapsulando as duas chamadas + cache via React Query.

## 6. Performance e escala

- **Indexação assíncrona** via worker em lotes — upload do fotógrafo nunca espera o face-api.
- **Escopo por álbum**: queries vetoriais sempre filtram `sub_event_id` antes do `<=>`, reduzindo o conjunto.
- **ivfflat lists=100** ajustado conforme volume; `SET ivfflat.probes = 10` na RPC.
- **Backpressure**: cron pega lotes pequenos; se fila > 500, dispara mais workers (segundo cron a cada 30s).
- **Cache CDN** das thumbnails já existente (Vercel CDN) reutilizado.
- **Pré-filtro client-side** evita selfies ruins chegarem ao backend.
- **Limite**: 100 resultados por busca, paginados client-side.

## 7. Segurança / LGPD

- Selfie nunca tocada em disco; embedding 128-D não é reversível para imagem.
- Banner explícito no modal sobre uso de reconhecimento facial + checkbox de consentimento.
- Página "Privacidade facial" no dashboard do usuário com botão "Excluir meus dados de busca facial" (limpa `face_search_logs`).
- Embeddings das fotos pertencem ao fotógrafo/álbum, removidos junto quando a foto é deletada (cascade lógico via trigger).
- Rate limit na `search-faces-in-album` (5 buscas/min/usuário).
- Service role nunca exposto ao client.

## 8. Plano de entrega por etapas

**MVP (Fase 1) — busca funcional**
1. Migração: `pgvector`, `photo_face_embeddings`, `face_processing_jobs`, RPC, trigger, RLS.
2. Edge Function `face-worker` + cron.
3. Edge Function `generate-face-embedding` + `search-faces-in-album`.
4. UI: botão + modal selfie/upload em `Campaign.tsx`, integração com galeria existente.
5. Aviso LGPD + consentimento.

**Fase 2 — robustez**
6. Reprocess admin, painel de status da fila, métricas.
7. Pré-validação client-side de qualidade da selfie.
8. Rate limit + `face_search_logs` + página de privacidade.

**Fase 3 — escala**
9. Tuning `ivfflat`, segundo worker condicional, métricas Supabase.
10. Avaliar troca do motor (Rekognition/InsightFace via microserviço) só se o custo Edge Function pesar.

**Fase 4 — extras**
11. "Minhas fotos" cross-álbum (opt-in: usuário salva embedding pessoal cifrado).
12. Favoritos automáticos, coleção pessoal, compra "só minhas fotos", compartilhamento.

## 9. Detalhes técnicos resumidos

- Distância: cosseno (`embedding <=> $1`), `similarity = 1 - distance`, threshold default 0.55.
- Lote do worker: 20 fotos / execução; timeout EF 60s suficiente para esse volume com SsdMobilenet em WASM.
- Modelos servidos em `/models` (já existem no `public/models/`); a EF baixa-os uma vez por cold start e cacheia em memória.
- Tipos TS gerados automaticamente após a migração.

---

**Próximos passos após sua aprovação:**
1. Rodo a migração (pgvector + tabelas + RPC + trigger + RLS).
2. Crio as Edge Functions e o cron.
3. Implemento o componente + integração no `Campaign.tsx`.

Confirma para eu seguir com o MVP (Fase 1)?
