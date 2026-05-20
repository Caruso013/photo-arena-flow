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

const { Client } = require('pg');
const fetch = require('node-fetch');

const POLL_INTERVAL_MS = process.env.POLL_INTERVAL_MS ? Number(process.env.POLL_INTERVAL_MS) : 3000;

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  console.log('Face worker conectado ao banco');

  while (true) {
    try {
      // Buscar um job pendente e marcar como processing (concorrência simples)
      await client.query('BEGIN');
      const res = await client.query(`
        SELECT * FROM face_processing_jobs
        WHERE status = 'pending'
        ORDER BY created_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      `);

      if (res.rows.length === 0) {
        await client.query('COMMIT');
        await sleep(POLL_INTERVAL_MS);
        continue;
      }

      const job = res.rows[0];
      await client.query(`UPDATE face_processing_jobs SET status='processing', attempts=attempts+1 WHERE id=$1`, [job.id]);
      await client.query('COMMIT');

      console.log('Processando job', job.id, 'photo_id', job.photo_id);

      // Exemplo: chamar um serviço externo de ML que recebe image_url e retorna descritores
      // Aqui mantemos um stub que apenas espera e marca succeeded
      await sleep(1000);

      // Atualizar job como succeeded (na prática gravar descritores em photo_face_descriptors)
      await client.query(`UPDATE face_processing_jobs SET status='succeeded', error=NULL WHERE id=$1`, [job.id]);
      console.log('Job concluído', job.id);

    } catch (err) {
      console.error('Erro no loop do worker:', err);
      try { await client.query('ROLLBACK'); } catch (e) {}
      await sleep(2000);
    }
  }
}

main().catch(err => {
  console.error('Worker fatal error:', err);
  process.exit(1);
});
