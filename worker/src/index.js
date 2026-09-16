// Worker — Faz 1 + GERÇEK platform entegrasyonu
// Değişen tek bölüm: publish işçisi artık gerçek SDK çağrıları yapıyor
// (token varsa), demo modu birebir korunuyor. Render bölümü Faz 1 ile AYNI.
const { Worker } = require('bullmq');
const { execFile } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { publish } = require('./publishers');
const { unseal } = require('./tokenStore');

const run = promisify(execFile);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT, region: 'us-east-1', forcePathStyle: true,
  credentials: { accessKeyId: process.env.S3_ACCESS, secretAccessKey: process.env.S3_SECRET },
});
const conn = { url: process.env.REDIS_URL };

const RATIOS = { '16:9': [1280, 720], '9:16': [720, 1280], '1:1': [960, 960] };
const THEMES = {
  mor:      { bg: '#0f0c29', wave: '#a29bfe' },
  gunes:    { bg: '#1a1a2e', wave: '#ffd32a' },
  okyanus:  { bg: '#000428', wave: '#00cec9' },
  neon:     { bg: '#0a0a0a', wave: '#00ff9d' },
};

// ================= RENDER İŞÇİSİ (Faz 1 ile birebir aynı) =================
new Worker('convert', async job => {
  const { conversionId } = job.data;
  console.log(`[render] başladı ${conversionId}`);
  const c = (await pool.query('SELECT * FROM conversions WHERE id=$1', [conversionId])).rows[0];
  if (!c) throw new Error('Kayıt bulunamadı');

  await pool.query("UPDATE conversions SET status='rendering' WHERE id=$1", [conversionId]);
  const [W, H] = RATIOS[c.ratio] || RATIOS['16:9'];
  const theme = THEMES[c.theme] || THEMES.mor;
  const out = path.join('/tmp/renders', `${conversionId}.mp4`);
  fs.mkdirSync('/tmp/renders', { recursive: true });

  const fc = [
    `color=c=${theme.bg}:s=${W}x${H}:d=1[bg]`,
    `movie='${c.input_path}',showwaves=s=${W}x${Math.floor(H * 0.6)}:mode=line:rate=30:colors=${theme.wave}[wv]`,
    `[bg][wv]overlay=(W-w)/2:(H-h)/2,drawtext=text='${c.title.replace(/'/g, '')}':fontcolor=white:fontsize=${Math.floor(W / 28)}:x=(w-text_w)/2:y=h*0.08[outv]`,
  ].join(';');

  await run('ffmpeg', [
    '-y', '-re', '-i', c.input_path,
    '-f', 'lavfi', '-i', `color=c=${theme.bg}:s=${W}x${H}`,
    '-filter_complex', fc, '-map', '[outv]', '-map', '0:a',
    '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-shortest', out,
  ], { maxBuffer: 1024 * 1024 * 64 });

  const key = `videos/${conversionId}.mp4`;
  await s3.send(new PutObjectCommand({
    Bucket: 'sesvizyon-media', Key: key,
    Body: fs.createReadStream(out), ContentType: 'video/mp4',
  }));

  // Platformlar videoyu herkese açık URL'den çeker: üretimde PUBLIC_BASE_URL
  // (örn. https://media.sesvizyon.com) verilirse o kullanılır, yoksa dev fallback.
  const url = process.env.PUBLIC_BASE_URL
    ? `${process.env.PUBLIC_BASE_URL}/sesvizyon-media/${key}`
    : `${process.env.S3_ENDPOINT.replace('minio:9000', 'localhost:9000')}/sesvizyon-media/${key}`;
  await pool.query(
    "UPDATE conversions SET status='done', output_url=$1, finished_at=now() WHERE id=$2",
    [url, conversionId]);
  fs.unlink(out, () => {}); fs.unlink(c.input_path, () => {});
  console.log(`[render] bitti ${conversionId} → ${url}`);
}, { connection: conn, concurrency: 2 });

// ================= YAYIN İŞÇİSİ (ENTEGRASYONLU) =================
new Worker('publish', async job => {
  const { jobId, platforms } = job.data;
  const c = (await pool.query(
    `SELECT c.title, c.output_url, p.platforms, p.results
     FROM publish_jobs p JOIN conversions c ON c.id = p.conversion_id WHERE p.id=$1`, [jobId])).rows[0];
  if (!c) throw new Error('Yayın işi bulunamadı');

  // Platform hesapları + şifreli tokenlar (sql/social_accounts.sql tablosu)
  const accounts = (await pool.query(
    'SELECT platform, account_ref, token_enc FROM social_accounts WHERE platform = ANY($1)',
    [platforms])).rows;
  const accByPlatform = Object.fromEntries(accounts.map(a => [a.platform, a]));

  const results = c.results || {};
  for (const p of platforms) {
    if (results[p]?.ok) continue;                    // idempotent: başarılı platformu tekrar yayınlama
    try {
      let token = process.env[`TOKEN_${p.toUpperCase()}`] || null;
      if (!token && accByPlatform[p]) token = await unseal(accByPlatform[p].token_enc);
      results[p] = await publish(p, {
        videoUrl: c.output_url,
        title: c.title,
        caption: c.title,
        token,
        account: accByPlatform[p]?.account_ref,
      });
      // Parçalı başarı durumunda ara kayıt (süreç kırılırsa nereden devam edileceğini bilir)
      await pool.query('UPDATE publish_jobs SET results=$1 WHERE id=$2', [JSON.stringify(results), jobId]);
    } catch (e) {
      results[p] = { ok: false, error: e.message };
      await pool.query('UPDATE publish_jobs SET results=$1 WHERE id=$2', [JSON.stringify(results), jobId]);
      throw e;   // BullMQ retry/backoff
    }
  }
  await pool.query("UPDATE publish_jobs SET status='done', results=$1 WHERE id=$2", [JSON.stringify(results), jobId]);
  console.log(`[publish] bitti ${jobId} → ${platforms.filter(p => results[p]?.ok).length}/${platforms.length} platform`);
}, { connection: conn, concurrency: 5 });

console.log('[worker] render + publish (entegre) işçileri hazır');
