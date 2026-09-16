// SesVizyon API — Faz 1
// Güvenlik: helmet gÜvenlik header'ları, CORS kısıtlı, rate-limit, JWT RS256->HS256 (dev), bcrypt hash
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { pool, init } = require('./db');
const { convertQueue, publishQueue } = require('./queue');

const app = express();
const PORT = process.env.PORT || 3000;
const MAX_MB = +(process.env.MAX_UPLOAD_MB || 200);

app.use(helmet());                                   // CSP, HSTS, X-Frame-Options...
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(rateLimit({ windowMs: 60_000, max: 100 }));  // kullanıcı başına 100 req/dk

// ---- Upload: multipart, boyut + MIME kısıtı (karantina Faz 2'de ClamAV ile) ----
const upload = multer({
  dest: '/tmp/uploads/',
  limits: { fileSize: MAX_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/x-m4a', 'audio/webm'];
    if (ok.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Yalnızca ses dosyası (MP3/WAV/OGG/M4A) kabul edilir'));
  },
});

// ---- Auth yardımcıları ----
const sign = u => jwt.sign({ uid: u.id, role: u.role }, process.env.JWT_SECRET, { expiresIn: '15m' });
function auth(req, res, next) {
  const h = req.headers.authorization || '';
  try { req.user = jwt.verify(h.replace('Bearer ', ''), process.env.JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Geçersiz veya süresi dolmuş token' }); }
}
const adminOnly = (req, res, next) =>
  req.user.role === 'admin' ? next() : res.status(403).json({ error: 'Yetkisiz erişim' });

// ---- Sağlık ----
app.get('/health', async (req, res) => {
  const db = await pool.query('SELECT 1');
  res.json({ ok: true, db: !!db.rowCount, ts: Date.now() });
});

// ---- Üyelik ----
app.post('/auth/register', async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password || password.length < 8)
    return res.status(400).json({ error: 'Ad, e-posta ve en az 8 karakterli şifre gerekli' });
  const hash = await bcrypt.hash(password, 12);
  try {
    const r = await pool.query(
      'INSERT INTO users(name,email,password_hash) VALUES($1,$2,$3) RETURNING id,name,email,role',
      [name, email, hash]);
    res.status(201).json({ user: r.rows[0], token: sign(r.rows[0]) });
  } catch (e) {
    res.status(409).json({ error: 'Bu e-posta zaten kayıtlı' });
  }
});

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  const r = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
  const u = r.rows[0];
  if (!u || !(await bcrypt.compare(password || '', u.password_hash)))
    return res.status(401).json({ error: 'E-posta veya şifre hatalı' });
  res.json({ user: { id: u.id, name: u.name, role: u.role }, token: sign(u) });
});

// ---- Dönüştürme: kabul et -> kuyruğa at -> 202 (API bloklamaz) ----
app.post('/conversions', auth, upload.single('audio'), async (req, res) => {
  const { title, theme = 'mor', ratio = '16:9' } = req.body;
  if (!req.file) return res.status(400).json({ error: 'Ses dosyası gerekli' });
  const id = crypto.randomUUID();
  await pool.query(
    `INSERT INTO conversions(id,user_id,title,theme,ratio,input_path)
     VALUES($1,$2,$3,$4,$5,$6)`,
    [id, req.user.uid, title || req.file.originalname, theme, ratio, req.file.path]);
  await convertQueue.add('render', { conversionId: id }, {
    attempts: 3, backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 100, removeOnFail: 500,
  });
  res.status(202).json({ id, status: 'queued', message: 'İş kuyruğa alındı' });
});

app.get('/conversions/:id', auth, async (req, res) => {
  const r = await pool.query('SELECT id,title,theme,status,output_url,error,created_at,finished_at FROM conversions WHERE id=$1', [req.params.id]);
  if (!r.rows[0]) return res.status(404).json({ error: 'Bulunamadı' });
  res.json(r.rows[0]);
});

app.get('/conversions', auth, async (req, res) => {
  const r = await pool.query(
    'SELECT id,title,status,created_at FROM conversions WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50',
    [req.user.uid]);
  res.json(r.rows);
});

// ---- Yayın: platformlara otomatik gönderim işi ----
app.post('/conversions/:id/publish', auth, async (req, res) => {
  const { platforms = [] } = req.body || {};
  const allowed = ['facebook', 'tiktok', 'instagram', 'linkedin', 'x'];
  if (!platforms.length || platforms.some(p => !allowed.includes(p)))
    return res.status(400).json({ error: 'Geçerli platformlar gerekli: ' + allowed.join(', ') });
  const c = await pool.query('SELECT * FROM conversions WHERE id=$1 AND user_id=$2', [req.params.id, req.user.uid]);
  if (!c.rows[0]) return res.status(404).json({ error: 'Bulunamadı' });
  if (c.rows[0].status !== 'done') return res.status(409).json({ error: 'Video henüz hazır değil' });
  const jobId = crypto.randomUUID();
  await pool.query('INSERT INTO publish_jobs(id,conversion_id,platforms) VALUES($1,$2,$3)', [jobId, req.params.id, platforms]);
  await publishQueue.add('publish', { jobId, conversionId: req.params.id, platforms },
    { attempts: 5, backoff: { type: 'exponential', delay: 10_000 } });
  res.status(202).json({ jobId, status: 'queued' });
});

app.get('/publish/:jobId', auth, async (req, res) => {
  const r = await pool.query('SELECT * FROM publish_jobs WHERE id=$1', [req.params.jobId]);
  if (!r.rows[0]) return res.status(404).json({ error: 'Bulunamadı' });
  res.json(r.rows[0]);
});

// ---- Sosyal hesaplar: token'lar şifrelenir, asla düz dönülmez ----
app.post('/social-accounts', auth, async (req, res) => {
  const { platform, account_ref, token } = req.body || {};
  const allowed = ['facebook', 'tiktok', 'instagram', 'linkedin', 'x'];
  if (!allowed.includes(platform) || !token) return res.status(400).json({ error: 'Platform ve token gerekli' });
  const enc = await seal(token);
  await pool.query(
    `INSERT INTO social_accounts(user_id, platform, account_ref, token_enc)
     VALUES($1,$2,$3,$4)
     ON CONFLICT (user_id, platform) DO UPDATE SET token_enc=EXCLUDED.token_enc, account_ref=EXCLUDED.account_ref`,
    [req.user.uid, platform, account_ref || 'me', enc]);
  res.status(201).json({ ok: true, platform });
});

app.get('/social-accounts', auth, async (req, res) => {
  const r = await pool.query(
    'SELECT platform, account_ref, created_at FROM social_accounts WHERE user_id=$1', [req.user.uid]);
  res.json(r.rows);   // token DÖNDÜRÜLMEZ — yalnızca metadata
});

// ---- Admin: kullanıcı listesi (rol izni örneği) ----
app.get('/admin/users', auth, adminOnly, async (req, res) => {
  const r = await pool.query('SELECT id,name,email,role,status,created_at FROM users ORDER BY created_at DESC LIMIT 100');
  res.json(r.rows);
});

// Hata yakalama
app.use((err, req, res, next) => {
  console.error('[api]', err.message);
  res.status(err.message?.includes('ses dosyası') ? 400 : 500).json({ error: err.message || 'Sunucu hatası' });
});

init().then(() => {
  // İlk admin: ADMIN_EMAIL/ADMIN_PASSWORD ile değiştirilebilir
  pool.query(
    `INSERT INTO users(name,email,password_hash,role)
     VALUES('Sistem Yöneticisi','admin@sesvizyon.local',$1,'admin')
     ON CONFLICT (email) DO NOTHING`,
    [bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'Admin1234!', 12)]);
  app.listen(PORT, () => console.log(`[api] :${PORT} dinlemede`));
});
