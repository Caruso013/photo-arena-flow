/**
 * Scaffold simples de worker para processar registros em `face_processing_jobs`.
 * Uso:
 *  - Instale dependências: npm install pg node-fetch
 *  - Exporte variável de conexão: DATABASE_URL
 *  - Rode: node worker.js
 *
 * O worker busca jobs com status 'pending', marca como 'processing', processa (chamar ML externo)
 * e atualiza o registro com status 'succeeded' ou 'failed'.
 */

const fetch = require('node-fetch');
const { URL } = require('url');

const POLL_INTERVAL_MS = process.env.POLL_INTERVAL_MS ? Number(process.env.POLL_INTERVAL_MS) : 3000;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente');
  process.exit(1);
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function pickPendingJob() {
  // Usar a REST API para buscar e lockear um job usando soft-update
  const url = `${SUPABASE_URL}/rest/v1/face_processing_jobs?status=eq.pending&order=created_at.asc&limit=1`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Accept: 'application/json',
    },
  });

  if (!res.ok) return null;
  const rows = await res.json();
  if (!rows || rows.length === 0) return null;
  return rows[0];
}

async function markJobStatus(jobId, status, extra = {}) {
  const url = `${SUPABASE_URL}/rest/v1/face_processing_jobs?id=eq.${jobId}`;
  const body = { status, ...extra };
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    console.error('Falha ao atualizar status do job', jobId, await res.text());
  }
  return res.ok;
}

async function fetchPhotoInfo(photoId) {
  const url = `${SUPABASE_URL}/rest/v1/photos?id=eq.${photoId}&select=id,campaign_id,thumbnail_url,watermarked_url`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Accept: 'application/json',
    },
  });
  if (!res.ok) throw new Error(`Falha ao obter photo info: ${res.status}`);
  const rows = await res.json();
  return rows[0];
}

async function insertFaceDescriptor(photoId, albumId, descriptor, confidence = 1.0, boundingBox = null) {
  const url = `${SUPABASE_URL}/rest/v1/photo_face_descriptors`;
  const body = {
    photo_id: photoId,
    album_id: albumId,
    descriptor: descriptor,
    confidence,
    bounding_box: boundingBox,
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Falha ao inserir descriptor: ${text}`);
  }
  const inserted = await res.json();
  return inserted[0];
}

async function callDetectFacesFunction(base64Image) {
  const fnUrl = `${SUPABASE_URL}/functions/v1/detect-faces`;
  const res = await fetch(fnUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ image: base64Image }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Falha na função detect-faces: ${text}`);
  }
  return res.json();
}

async function processJob(job) {
  const jobId = job.id;
  try {
    await markJobStatus(jobId, 'processing');

    // Buscar informações da foto
    const photo = await fetchPhotoInfo(job.photo_id);
    if (!photo) throw new Error('Foto não encontrada');

    const imageUrl = (job.payload && job.payload.thumbnail_url) || photo.thumbnail_url || photo.watermarked_url;
    if (!imageUrl) throw new Error('Nenhuma URL de imagem disponível');

    // Baixar imagem e converter para base64
    const imageResp = await fetch(imageUrl);
    if (!imageResp.ok) throw new Error('Falha ao baixar imagem');
    const arrayBuffer = await imageResp.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = `data:image/jpeg;base64,${buffer.toString('base64')}`;

    // Chamar função detect-faces
    const detectRes = await callDetectFacesFunction(base64);
    if (!detectRes || !detectRes.descriptors || detectRes.descriptors.length === 0) {
      // Nenhum rosto detectado, marcar succeeded mas sem inserir
      await markJobStatus(jobId, 'succeeded');
      console.log('Nenhum rosto detectado para foto', job.photo_id);
      return;
    }

    // Inserir cada descriptor no banco
    const albumId = photo.campaign_id || null;
    for (const desc of detectRes.descriptors) {
      await insertFaceDescriptor(job.photo_id, albumId, desc, 1.0, null);
    }

    await markJobStatus(jobId, 'succeeded');
    console.log(`Job ${jobId} concluído: ${detectRes.descriptors.length} rosto(s) inseridos`);
  } catch (err) {
    console.error('Erro processando job', job.id, err.message);
    await markJobStatus(job.id, 'failed', { error: err.message });
  }
}

async function main() {
  console.log('Face worker iniciado - consultando jobs...');
  while (true) {
    try {
      const job = await pickPendingJob();
      if (!job) {
        await sleep(POLL_INTERVAL_MS);
        continue;
      }

      await processJob(job);
    } catch (err) {
      console.error('Erro no loop principal do worker:', err);
      await sleep(2000);
    }
  }
}

main().catch(err => {
  console.error('Worker fatal error:', err);
  process.exit(1);
});
