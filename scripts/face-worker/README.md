Face Worker
============

Pequeno worker Node.js que consome a tabela `face_processing_jobs`, chama a Edge Function `detect-faces` e insere descritores em `photo_face_descriptors`.

Requisitos
---------
- Node.js 18+ (ou 16 com fetch polyfill)
- Variáveis de ambiente:
  - `SUPABASE_URL` (ex: https://xyz.supabase.co)
  - `SUPABASE_SERVICE_ROLE_KEY` (service_role key)
  - opcional: `POLL_INTERVAL_MS` (ms)

Instalação
---------
```bash
cd scripts/face-worker
npm install
```

Execução local
--------------
```bash
export SUPABASE_URL="https://<your>.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="<your-service-role-key>"
npm start
```

O worker fará polling na tabela `face_processing_jobs` por novos jobs, marcará como `processing`, chamará a função `detect-faces` via `/functions/v1/detect-faces` e inserirá os descritores retornados em `photo_face_descriptors`.

Observações
----------
- Em produção prefira rodar o worker como serviço (systemd, PM2, Docker, etc.) com autoscaling.
- Para alto volume, considere usar Redis/BullMQ em vez de polling via REST.
- Não envie chaves sensíveis ao frontend. Use a `service_role` apenas no backend.
