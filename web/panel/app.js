/* ============ SesVizyon — SaaS Yönetim Paneli ============ */
const LS_KEY = 'sesvizyon_v1';

const DEFAULT_STATE = {
  settings: {
    siteName: 'SesVizyon', siteDesc: 'Ses dosyalarınızı saniyeler içinde videoya dönüştürün ve tüm sosyal medyada yayınlayın.',
    logoText: '🎧 SesVizyon', supportEmail: 'destek@sesvizyon.com', smtpHost: 'smtp.sesvizyon.com', smtpPort: '587',
    seoTitle: 'SesVizyon | Ses\'ten Video\'ya Otomatik Yayın', seoKeywords: 'ses video, podcast video, sosyal medya otomasyon',
    maintenance: false, registration: true, apiTimeout: 30, watermark: true, maxFileMB: 200
  },
  theme: { preset: 'mor', primary: '#6c5ce7', accent: '#00cec9', light: false },
  plans: [
    { id: 1, name: 'Başlangıç', price: 0, period: 'ay', videos: 5, platforms: 2, hd: false, watermark: true, color: '#8b93b8', popular: false, active: true },
    { id: 2, name: 'Pro', price: 149, period: 'ay', videos: 100, platforms: 5, hd: true, watermark: false, color: '#6c5ce7', popular: true, active: true },
    { id: 3, name: 'Kurumsal', price: 499, period: 'ay', videos: 9999, platforms: 5, hd: true, watermark: false, color: '#00cec9', popular: false, active: true }
  ],
  roles: [
    { id: 1, name: 'Yönetici', color: '#ff7675', perms: ['dashboard','converter','queue','plans','users','ads','cms','social','settings','theme'] },
    { id: 2, name: 'Editör', color: '#fdcb6e', perms: ['dashboard','converter','queue','cms','social'] },
    { id: 3, name: 'Üye', color: '#55efc4', perms: ['dashboard','converter','queue'] }
  ],
  users: [
    { id: 1, name: 'Ahmet Yılmaz', email: 'ahmet@sesvizyon.com', roleId: 1, planId: 3, status: 'active', joined: '2026-01-14' },
    { id: 2, name: 'Elif Kaya', email: 'elif@ornek.com', roleId: 2, planId: 2, status: 'active', joined: '2026-03-02' },
    { id: 3, name: 'Mehmet Demir', email: 'mehmet@ornek.com', roleId: 3, planId: 1, status: 'active', joined: '2026-05-21' },
    { id: 4, name: 'Zeynep Şahin', email: 'zeynep@ornek.com', roleId: 3, planId: 2, status: 'suspended', joined: '2026-06-30' }
  ],
  ads: [
    { id: 1, title: 'Podcast Ekipmanları %40 İndirim', text: 'Profesyonel mikrofon setleri', placement: 'sidebar', bg: 'linear-gradient(135deg,#e17055,#e84393)', active: true, clicks: 342, views: 8120 },
    { id: 2, title: 'Pro Plan\'a Geç', text: 'Filigransız HD video yayınla', placement: 'topbar', bg: 'linear-gradient(135deg,#6c5ce7,#00cec9)', active: true, clicks: 187, views: 5400 },
    { id: 3, title: 'Kurumsal Eğitim', text: 'Ekibiniz için toplu lisans', placement: 'footer', bg: 'linear-gradient(135deg,#0984e3,#00cec9)', active: false, clicks: 45, views: 1200 }
  ],
  contents: [
    { id: 1, type: 'duyuru', title: 'TikTok API Entegrasyonu Yayında', body: 'Artık videolarınız TikTok hesabınıza doğrudan yüklenebiliyor.', date: '2026-09-08', status: 'published' },
    { id: 2, type: 'blog', title: 'Ses\'ten Videoya: 2026 Rehberi', body: 'Podcast bölümlerinizi görsel içeriğe dönüştürmenin yolları.', date: '2026-09-05', status: 'published' },
    { id: 3, type: 'duyuru', title: 'Sistem Bakımı — 15 Eylül', body: '02:00-04:00 arası planlı bakım yapılacaktır.', date: '2026-09-15', status: 'draft' }
  ],
  socials: [
    { platform: 'facebook', name: 'Facebook', page: '', connected: false, token: '', auto: false },
    { platform: 'tiktok', name: 'TikTok', page: '', connected: false, token: '', auto: false },
    { platform: 'instagram', name: 'Instagram', page: '', connected: false, token: '', auto: false },
    { platform: 'linkedin', name: 'LinkedIn', page: '', connected: false, token: '', auto: false },
    { platform: 'x', name: 'X (Twitter)', page: '', connected: false, token: '', auto: false }
  ],
  queue: [],
  currentUserId: 1
};

let S;
try { S = JSON.parse(localStorage.getItem(LS_KEY)) || structuredClone(DEFAULT_STATE); }
catch { S = structuredClone(DEFAULT_STATE); }
const save = () => localStorage.setItem(LS_KEY, JSON.stringify(S));
save();

/* ---------- helpers ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => Date.now() + Math.floor(Math.random() * 999);
const me = () => S.users.find(u => u.id === S.currentUserId);
const myRole = () => S.roles.find(r => r.id === me().roleId);
const can = perm => myRole().perms.includes(perm);
const roleOf = id => S.roles.find(r => r.id === id) || S.roles[2];
const planOf = id => S.plans.find(p => p.id === id) || S.plans[0];

function toast(msg, type = '') {
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.innerHTML = msg;
  $('#toasts').appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = '.4s'; setTimeout(() => t.remove(), 400); }, 3400);
}
function openModal(html, wide = false) {
  $('#modalBox').className = 'modal' + (wide ? ' wide' : '');
  $('#modalBox').innerHTML = html;
  $('#modalBg').classList.add('open');
}
function closeModal() { $('#modalBg').classList.remove('open'); }

/* ---------- navigation ---------- */
const PAGES = [
  { id: 'dashboard', ico: '📊', label: 'Gösterge Paneli', perm: 'dashboard' },
  { id: 'converter', ico: '🎬', label: 'Ses → Video', perm: 'converter' },
  { id: 'queue', ico: '🚀', label: 'Yayın Kuyruğu', perm: 'queue' },
  { label: 'YÖNETİM' },
  { id: 'plans', ico: '💳', label: 'Abonelik Planları', perm: 'plans' },
  { id: 'users', ico: '👥', label: 'Üyeler & Roller', perm: 'users' },
  { id: 'ads', ico: '📢', label: 'Reklam Modülü', perm: 'ads' },
  { id: 'cms', ico: '📝', label: 'İçerik & Duyurular', perm: 'cms' },
  { label: 'ENTEGRASYON' },
  { id: 'social', ico: '🔗', label: 'Sosyal Medya Hesapları', perm: 'social' },
  { label: 'SİSTEM' },
  { id: 'settings', ico: '⚙️', label: 'Site Ayarları', perm: 'settings' },
  { id: 'theme', ico: '🎨', label: 'Tema Yönetimi', perm: 'theme' }
];

function renderNav() {
  const nav = $('#nav');
  nav.innerHTML = '';
  PAGES.forEach(p => {
    if (p.label) {
      const d = document.createElement('div');
      d.className = 'nav-label';
      d.textContent = p.label;
      nav.appendChild(d);
      return;
    }
    const ok = can(p.perm);
    const el = document.createElement('div');
    el.className = 'nav-item' + (ok ? '' : ' locked');
    const ico = document.createElement('span');
    ico.className = 'ico';
    ico.textContent = p.ico;
    el.appendChild(ico);
    el.appendChild(document.createTextNode(p.label));
    if (ok) el.addEventListener('click', () => go(p.id));
    else el.addEventListener('click', () => toast('Bu modüle erişim yetkiniz yok', 'err'));
    nav.appendChild(el);
  });
}

let currentPage = 'dashboard';
function go(id) {
  if (!can(PAGES.find(p => p.id === id).perm)) { toast('Bu modüle erişim yetkiniz yok', 'err'); return; }
  currentPage = id;
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  $(`#page-${id}`)?.classList.add('active');
  const p = PAGES.find(x => x.id === id);
  $('#pageTitle').textContent = p.label;
  RENDER[id]?.();
  document.querySelectorAll('.nav-item').forEach(n => { if (n.textContent.includes(p.label)) n.classList.add('active'); });
}

/* ---------- CSS theme uygula ---------- */
function applyTheme() {
  const r = document.documentElement.style;
  r.setProperty('--primary', S.theme.primary);
  r.setProperty('--accent', S.theme.accent);
  r.setProperty('--primary2', S.theme.primary + 'cc');
  document.body.classList.toggle('light', !!S.theme.light);
  const t = $('#themeToggle');
  if (t) t.textContent = S.theme.light ? '☀️' : '🌙';
}
function toggleLight() {
  S.theme.light = !S.theme.light;
  save(); applyTheme();
  toast(S.theme.light ? '☀️ Açık tema aktif' : '🌙 Koyu tema aktif', 'ok');
}

/* ---------- RENDER dispatch (sayfalar HTML olarak içerikte) ---------- */
const RENDER = {};

function buildPages() {
  $('#content').innerHTML = `
    <div class="page" id="page-dashboard"></div>
    <div class="page" id="page-converter"></div>
    <div class="page" id="page-queue"></div>
    <div class="page" id="page-plans"></div>
    <div class="page" id="page-users"></div>
    <div class="page" id="page-ads"></div>
    <div class="page" id="page-cms"></div>
    <div class="page" id="page-social"></div>
    <div class="page" id="page-settings"></div>
    <div class="page" id="page-theme"></div>`;
}

/* ================= DASHBOARD ================= */
RENDER.dashboard = () => {
  const published = S.queue.filter(q => q.status === 'published').length;
  const connected = S.socials.filter(s => s.connected).length;
  const revenue = S.users.reduce((a, u) => a + (planOf(u.planId).price || 0), 0);
  $('#page-dashboard').innerHTML = `
    <div class="page-head">
      <div><h2>Hoş geldin, ${esc(me().name.split(' ')[0])} 👋</h2>
      <p>${esc(myRole().name)} rolüyle giriş yaptın. Bugün ${S.queue.filter(q => q.status !== 'published').length} bekleyen yayın var.</p></div>
      <button class="btn btn-primary" onclick="go('converter')">🎬 Yeni Video Oluştur</button>
    </div>
    <div class="bento">
      <div class="stat-card"><div class="lbl">Toplam Video</div><div class="val">${S.queue.length}</div><div class="tr up">▲ %12 bu ay</div></div>
      <div class="stat-card"><div class="lbl">Yayınlanan</div><div class="val">${published}</div><div class="tr up">▲ %8 bu ay</div></div>
      <div class="stat-card"><div class="lbl">Bağlı Hesap</div><div class="val">${connected}/5</div><div class="tr ${connected ? 'up' : 'down'}">${connected ? 'Aktif' : 'Bağlantı yok'}</div></div>
      <div class="stat-card"><div class="lbl">Tahmini Gelir</div><div class="val">₺${revenue}</div><div class="tr up">▲ %15 bu ay</div></div>
    </div>

    <div class="section-title">Hızlı İşlemler</div>
    <div class="grid grid-3">
      <div class="card" style="cursor:pointer" onclick="go('converter')"><h3>🎧 Ses Yükle</h3><div class="sub">Podcast, müzik veya sesli mesajını videoya çevir</div></div>
      <div class="card" style="cursor:pointer" onclick="go('social')"><h3>🔗 Hesap Bağla</h3><div class="sub">5 platforma tek tıkla bağlan</div></div>
      <div class="card" style="cursor:pointer" onclick="go('queue')"><h3>🚀 Yayın Kuyruğu</h3><div class="sub">Planlanmış otomatik paylaşımları yönet</div></div>
    </div>

    <div class="section-title">Son Yayınlar</div>
    <div class="card" style="padding:6px 12px">
      ${S.queue.length ? `<table><tr><th>Video</th><th>Platformlar</th><th>Durum</th><th>Tarih</th></tr>
        ${S.queue.slice(-5).reverse().map(q => `<tr><td><b>${esc(q.title)}</b></td><td>${q.platforms.map(pfIco).join(' ')}</td><td>${queueBadge(q)}</td><td style="color:var(--muted)">${q.date}</td></tr>`).join('')}</table>`
      : `<div class="empty">Henüz yayın yok. İlk videonu oluştur! 🎬</div>`}
    </div>

    <div class="section-title">Aktif Reklamlar</div>
    <div class="grid grid-3">
      ${S.ads.filter(a => a.active).map(a => `
        <div class="card" style="padding:14px">
          <div class="ad-preview" style="background:${a.bg}">${esc(a.title)}</div>
          <div style="display:flex;justify-content:space-between;margin-top:10px;font-size:12px;color:var(--muted)">
            <span>👁 ${a.views}</span><span>🖱 ${a.clicks}</span><span class="tag tag-ok"><span class="dot"></span>Yayında</span>
          </div>
        </div>`).join('') || '<div class="empty">Aktif reklam yok.</div>'}
    </div>`;
};

const pfIco = p => ({ facebook: '📘', tiktok: '🎵', instagram: '📸', linkedin: '💼', x: '𝕏' }[p] || p);
const queueBadge = q => ({
  pending: '<span class="queue-status q-pending">⏳ Planlandı</span>',
  publishing: '<span class="queue-status q-pub">📤 Yayınlanıyor</span>',
  published: '<span class="queue-status q-ok">✅ Yayınlandı</span>',
  error: '<span class="queue-status q-err">❌ Hata</span>'
}[q.status]);

/* ================= SES → VİDEO DÖNÜŞTÜRÜCÜ ================= */
const VIZ_THEMES = [
  { id: 'mor', name: 'Mor Gece', bg: ['#0f0c29', '#302b63', '#24243e'], bars: ['#6c5ce7', '#a29bfe', '#00cec9'] },
  { id: 'gunes', name: 'Gün Batımı', bg: ['#ff512f', '#dd2476', '#1a1a2e'], bars: ['#ffd32a', '#ff9f43', '#fff'] },
  { id: 'okyanus', name: 'Okyanus', bg: ['#000428', '#004e92', '#000428'], bars: ['#00cec9', '#55efc4', '#81ecec'] },
  { id: 'neon', name: 'Neon Grid', bg: ['#0a0a0a', '#1a1a1a', '#0a0a0a'], bars: ['#00ff9d', '#00d2ff', '#ff00c8'] }
];
let conv = { file: null, audioBuf: null, vizTheme: VIZ_THEMES[0], title: '', recording: false, videoUrl: null };

RENDER.converter = () => {
  $('#page-converter').innerHTML = `
    <div class="page-head"><div><h2>Ses → Video Dönüştürücü</h2>
    <p>MP3, WAV, OGG dosyanı yükle, görsel temanı seç; video hazır olsun. Tarayıcında tamamen çevrimdışı işlenir.</p></div></div>
    <div class="grid" style="grid-template-columns:1fr 1.1fr">
      <div>
        <div class="card">
          <h3>1. Ses Dosyası</h3>
          <div class="sub">Maks. ${S.settings.maxFileMB} MB • MP3 / WAV / OGG / M4A</div>
          <div class="drop" id="drop" onclick="document.getElementById('fileInp').click()">
            <div class="big">🎧</div>
            <b>Dosyayı buraya sürükle</b> veya seçmek için tıkla
            <input type="file" id="fileInp" accept="audio/*" style="display:none" onchange="onAudioFile(this.files[0])">
          </div>
          <div id="fileInfo" style="margin-top:12px;font-size:13px;color:var(--muted)"></div>
        </div>
        <div class="card" style="margin-top:18px">
          <h3>2. Görsel Tema</h3>
          <div class="sub">Dalga formu animasyonunun stili</div>
          <div class="theme-pick" id="vizPick">
            ${VIZ_THEMES.map((t, i) => `<div class="tp ${i === 0 ? 'sel' : ''}" style="background:linear-gradient(135deg,${t.bg[0]},${t.bg[1]},${t.bg[2]})" onclick="pickViz(${i})"><span>${t.name}</span></div>`).join('')}
          </div>
          <div class="field" style="margin-top:16px"><label>Video Başlığı</label>
          <input id="vTitle" placeholder="Örn: Bölüm 42 — Yapay Zeka Sohbeti" oninput="conv.title=this.value"></div>
          <div class="row">
            <div class="field"><label>Kare Oranı</label><select id="vRatio"><option value="16:9">16:9 (YouTube/LinkedIn)</option><option value="9:16">9:16 (TikTok/Reels)</option><option value="1:1">1:1 (Instagram/X)</option></select></div>
            <div class="field"><label>Bitrate</label><select id="vBit"><option value="5000000">HD (5 Mbps)</option><option value="2500000">Standart (2.5 Mbps)</option></select></div>
          </div>
          <button class="btn btn-primary" id="btnRender" style="width:100%" onclick="renderVideo()" disabled>🎬 Videoyu Oluştur</button>
          <div class="progress" id="convProg" style="display:none"><div style="width:0%"></div></div>
        </div>
      </div>
      <div>
        <div class="card">
          <h3>Önizleme</h3>
          <div class="sub">Canlı dalga formu animasyonu</div>
          <canvas class="viz" id="vizCanvas" width="960" height="540"></canvas>
          <div id="vizHint" class="empty" style="padding:18px">Ses dosyası yüklendiğinde animasyon başlar.</div>
        </div>
        <div class="card" style="margin-top:18px;${conv.videoUrl ? '' : 'display:none'}" id="resultCard">
          <h3>✅ Video Hazır!</h3>
          <div class="sub">İndirebilir veya doğrudan sosyal medyaya planlayabilirsin.</div>
          <video id="resultVid" controls></video>
          <div style="display:flex;gap:10px;margin-top:14px">
            <a class="btn btn-success" id="dlLink" download="sesvizyon-video.webm">⬇ İndir (WEBM)</a>
            <button class="btn btn-primary" onclick="goQueueWithVideo()">🚀 Sosyal Medyaya Gönder</button>
          </div>
        </div>
      </div>
    </div>`;
  initVizLoop();
};

function pickViz(i) {
  conv.vizTheme = VIZ_THEMES[i];
  document.querySelectorAll('#vizPick .tp').forEach((el, j) => el.classList.toggle('sel', i === j));
}

async function onAudioFile(file) {
  if (!file) return;
  if (file.size > S.settings.maxFileMB * 1024 * 1024) { toast(`Dosya ${S.settings.maxFileMB} MB sınırını aşıyor`, 'err'); return; }
  conv.file = file;
  $('#fileInfo').innerHTML = `📁 <b>${esc(file.name)}</b> — ${(file.size / 1048576).toFixed(1)} MB`;
  $('#vizHint').style.display = 'none';
  try {
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    conv.audioBuf = await ac.decodeAudioData(await file.arrayBuffer());
    $('#btnRender').disabled = false;
    toast(`Ses yüklendi: ${conv.audioBuf.duration.toFixed(1)} sn`, 'ok');
    if (!$('#vTitle').value) { $('#vTitle').value = file.name.replace(/\.[^.]+$/, ''); conv.title = $('#vTitle').value; }
  } catch (e) { toast('Ses dosyası okunamadı: ' + e.message, 'err'); }
}

/* canlı animasyon döngüsü */
let vizAnim = null;
function initVizLoop() {
  cancelAnimationFrame(vizAnim);
  const cv = $('#vizCanvas'); if (!cv) return;
  const ctx = cv.getContext('2d');
  let t = 0;
  const draw = () => {
    if (!document.getElementById('vizCanvas')) return;
    const t2 = conv.vizTheme, W = cv.width, H = cv.height;
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, t2.bg[0]); g.addColorStop(.5, t2.bg[1]); g.addColorStop(1, t2.bg[2]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const N = 96, bw = W / N;
    const hasAudio = !!conv.audioBuf;
    const data = hasAudio ? conv.audioBuf.getChannelData(0) : null;
    for (let i = 0; i < N; i++) {
      let amp;
      if (hasAudio) {
        const idx = Math.floor(i / N * data.length);
        let sum = 0; const win = Math.floor(data.length / N);
        for (let j = 0; j < Math.min(win, 500); j += 10) sum += Math.abs(data[idx + j] || 0);
        amp = Math.min(1, (sum / Math.min(win, 500) / 0.25) * (0.75 + 0.25 * Math.sin(t / 14 + i * .35)));
      } else {
        amp = 0.18 + 0.13 * Math.sin(t / 16 + i * .3) * Math.cos(t / 23 + i * .12);
      }
      const h = Math.max(6, amp * H * 0.72);
      const grad = ctx.createLinearGradient(0, H / 2 - h / 2, 0, H / 2 + h / 2);
      grad.addColorStop(0, t2.bars[i % 3]); grad.addColorStop(1, t2.bars[(i + 1) % 3]);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(i * bw + bw * .22, H / 2 - h / 2, bw * .56, h, 8);
      ctx.fill();
    }
    // başlık
    ctx.fillStyle = 'rgba(255,255,255,.92)';
    ctx.font = '700 34px Inter,sans-serif'; ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 12;
    ctx.fillText(conv.title || (hasAudio ? conv.file?.name || '' : 'SesVizyon'), W / 2, 66);
    ctx.font = '500 17px Inter,sans-serif'; ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.fillText(hasAudio ? '♪ ' + (conv.file?.name || '') + ' — ' + conv.audioBuf.duration.toFixed(0) + ' sn' : 'Önizleme modu', W / 2, H - 32);
    t++;
    vizAnim = requestAnimationFrame(draw);
  };
  draw();
}

/* canvas kaydı → webm video */
async function renderVideo() {
  if (!conv.audioBuf || conv.recording) return;
  conv.recording = true;
  const btn = $('#btnRender'); btn.disabled = true; btn.textContent = '⏳ İşleniyor...';
  const prog = $('#convProg'); prog.style.display = 'block';
  const cv = $('#vizCanvas');
  const ratio = $('#vRatio').value;
  const dims = { '16:9': [1280, 720], '9:16': [720, 1280], '1:1': [960, 960] }[ratio];
  cv.width = dims[0]; cv.height = dims[1];
  const stream = cv.captureStream(30);
  // sesi MediaStream'e ekle
  const ac = new (window.AudioContext || window.webkitAudioContext)();
  const dest = ac.createMediaStreamDestination();
  const src = ac.createBufferSource(); src.buffer = conv.audioBuf;
  src.connect(dest); src.start();
  dest.stream.getAudioTracks().forEach(tr => stream.addTrack(tr));

  const rec = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9,opus', videoBitsPerSecond: +$('#vBit').value });
  const chunks = [];
  rec.ondataavailable = e => chunks.push(e.data);
  const done = new Promise(res => rec.onstop = res);
  rec.start(200);
  const durMs = conv.audioBuf.duration * 1000;
  const startT = Date.now();
  const tick = setInterval(() => {
    const p = Math.min(100, (Date.now() - startT) / durMs * 100);
    prog.firstElementChild.style.width = p + '%';
  }, 250);
  await new Promise(r => setTimeout(r, durMs));
  rec.stop(); src.stop(); ac.close(); clearInterval(tick);
  prog.firstElementChild.style.width = '100%';
  await done;
  const blob = new Blob(chunks, { type: 'video/webm' });
  if (conv.videoUrl) URL.revokeObjectURL(conv.videoUrl);
  conv.videoUrl = URL.createObjectURL(blob);
  conv.videoBlob = blob;
  $('#resultCard').style.display = 'block';
  $('#resultVid').src = conv.videoUrl;
  $('#dlLink').href = conv.videoUrl;
  btn.textContent = '🎬 Videoyu Oluştur'; btn.disabled = false;
  conv.recording = false;
  toast(`Video hazır! ${(blob.size / 1048576).toFixed(1)} MB WEBM`, 'ok');
  setTimeout(() => $('#resultCard').scrollIntoView({ behavior: 'smooth' }), 300);
}

function goQueueWithVideo() { go('queue'); }

/* ================= YAYIN KUYRUĞU ================= */
RENDER.queue = () => {
  const connected = S.socials.filter(s => s.connected);
  $('#page-queue').innerHTML = `
    <div class="page-head"><div><h2>Yayın Kuyruğu</h2><p>Videolarını platformlara anında veya planlanmış saatte otomatik gönder.</p></div>
      <button class="btn btn-primary" onclick="newPublishModal()" ${connected.length ? '' : 'disabled title="Önce sosyal hesap bağlayın"'}>🚀 Yeni Otomatik Yayın</button></div>
    ${connected.length === 0 ? `<div class="card" style="border-color:var(--warn)"><b>⚠️ Henüz bağlı sosyal medya hesabı yok.</b> <a href="#" onclick="go('social');return false" style="color:var(--primary2)">Hesap bağlamak için buraya tıkla →</a></div>` : ''}
    <div class="card" style="margin-top:18px;padding:6px 12px">
      ${S.queue.length ? `<table><tr><th></th><th>Video</th><th>Platformlar</th><th>Zamanlama</th><th>Durum</th><th></th></tr>
      ${S.queue.slice().reverse().map(q => `<tr>
        <td><div class="avatar-s" style="background:linear-gradient(135deg,${q.color || '#6c5ce7'},#00cec9)">🎬</div></td>
        <td><b>${esc(q.title)}</b><br><small style="color:var(--muted)">${q.duration || ''}</small></td>
        <td>${q.platforms.map(pfIco).join(' ')}</td>
        <td style="color:var(--muted);font-size:12.5px">${q.date}<br>${q.scheduled || 'Hemen'}</td>
        <td>${queueBadge(q)}${q.status === 'publishing' ? '<div class="progress" style="width:90px;margin-top:5px"><div style="width:' + q.pct + '%"></div></div>' : ''}</td>
        <td><button class="btn btn-danger btn-sm" onclick="delQueue(${q.id})">Sil</button></td>
      </tr>`).join('')}</table>`
      : `<div class="empty">📭 Kuyruk boş. Bir video oluştur ve otomatik yayınlamaya başla!</div>`}
    </div>`;
};

function newPublishModal() {
  const connected = S.socials.filter(s => s.connected);
  const title = conv.title || 'Yeni Video';
  openModal(`
    <h3>🚀 Otomatik Yayın Planla</h3>
    <div class="field"><label>Video Başlığı</label><input id="qTitle" value="${esc(title)}"></div>
    <div class="field"><label>Platformlar</label>
      <div class="perm-grid">${connected.map(s => `
        <label class="perm-item" style="text-transform:none;letter-spacing:0;color:var(--text)">
          <input type="checkbox" class="qpf" value="${s.platform}" checked> ${pfIco(s.platform)} ${s.name} <small style="color:var(--muted)">@${esc(s.page || 'hesap')}</small>
        </label>`).join('')}</div></div>
    <div class="row">
      <div class="field"><label>Tarih</label><input type="date" id="qDate" value="${new Date().toISOString().slice(0, 10)}"></div>
      <div class="field"><label>Saat (boş = hemen)</label><input type="time" id="qTime"></div>
    </div>
    <div class="field"><label>Açıklama / Etiketler</label><textarea id="qDesc" rows="2" placeholder="#podcast #yapayzeka ..."></textarea></div>
    <div style="display:flex;gap:10px;justify-content:flex-end">
      <button class="btn btn-ghost" onclick="closeModal()">Vazgeç</button>
      <button class="btn btn-primary" onclick="submitPublish()">Kuyruğa Ekle 🚀</button>
    </div>`, true);
}

function submitPublish() {
  const platforms = [...document.querySelectorAll('.qpf:checked')].map(c => c.value);
  if (!platforms.length) { toast('En az bir platform seç', 'err'); return; }
  const q = {
    id: uid(),
    title: $('#qTitle').value || 'Adsız Video',
    platforms,
    date: $('#qDate').value,
    scheduled: $('#qTime').value,
    desc: $('#qDesc').value,
    status: $('#qTime').value ? 'pending' : 'publishing',
    pct: 0,
    color: conv.vizTheme ? '#6c5ce7' : '#00cec9',
    duration: conv.audioBuf ? conv.audioBuf.duration.toFixed(0) + ' sn' : ''
  };
  S.queue.push(q); save(); closeModal();
  toast(`🚀 "${q.title}" kuyruğa eklendi (${platforms.length} platform)`, 'ok');
  if (q.status === 'publishing') simulatePublish(q.id);
  RENDER.queue();
}

function simulatePublish(id) {
  const q = S.queue.find(x => x.id === id);
  if (!q) return;
  const timer = setInterval(() => {
    q.pct = Math.min(100, (q.pct || 0) + Math.random() * 22);
    if (q.pct >= 100) {
      q.status = 'published'; clearInterval(timer);
      toast(`✅ "${q.title}" ${q.platforms.map(p => ({ facebook: 'Facebook', tiktok: 'TikTok', instagram: 'Instagram', linkedin: 'LinkedIn', x: 'X' }[p])).join(', ')}'ta yayınlandı!`, 'ok');
    }
    save();
    if (currentPage === 'queue') RENDER.queue();
    if (currentPage === 'dashboard') RENDER.dashboard();
  }, 900);
}

function delQueue(id) {
  S.queue = S.queue.filter(q => q.id !== id); save(); RENDER.queue(); toast('Kuyruktan silindi', 'ok');
}

/* ================= ABONELİK PLANLARI ================= */
RENDER.plans = () => {
  $('#page-plans').innerHTML = `
    <div class="page-head"><div><h2>Abonelik Planları</h2><p>Ücretli ve ücretsiz planları, limitleriyle birlikte yönet.</p></div>
      <button class="btn btn-primary" onclick="planModal()">＋ Yeni Plan</button></div>
    <div class="grid grid-3">
      ${S.plans.map(p => `
      <div class="card plan-card ${p.popular ? 'pop' : ''}">
        ${p.popular ? '<div class="pop-badge">POPÜLER</div>' : ''}
        <div style="display:flex;justify-content:space-between;align-items:center">
          <h3 style="color:${p.color}">${esc(p.name)}</h3>
          <label class="switch"><input type="checkbox" ${p.active ? 'checked' : ''} onchange="togglePlan(${p.id})"><span class="slider-t"></span></label>
        </div>
        <div class="plan-price">₺${p.price}<small>/${p.period}</small></div>
        <ul class="plan-feat">
          <li>✅ <b>${p.videos >= 9999 ? 'Sınırsız' : p.videos}</b> video / ay</li>
          <li>✅ <b>${p.platforms}</b> platform bağlantısı</li>
          <li>${p.hd ? '✅' : '❌'} <b>${p.hd ? 'HD kalite' : 'Standart kalite'}</b></li>
          <li>${p.watermark ? '⚠️ <b>Filigranlı</b>' : '✅ <b>Filigransız</b>'}</li>
        </ul>
        <div style="display:flex;gap:8px">
          <button class="btn btn-ghost btn-sm" style="flex:1" onclick="planModal(${p.id})">✏️ Düzenle</button>
          <button class="btn btn-danger btn-sm" onclick="delPlan(${p.id})">🗑</button>
        </div>
      </div>`).join('')}
    </div>`;
};

function togglePlan(id) { const p = planOf(id); p.active = !p.active; save(); toast(`"${p.name}" planı ${p.active ? 'aktif' : 'pasif'}`, 'ok'); }
function delPlan(id) { S.plans = S.plans.filter(p => p.id !== id); save(); RENDER.plans(); toast('Plan silindi', 'ok'); }

function planModal(id) {
  const p = id ? planOf(id) : { name: '', price: 0, period: 'ay', videos: 10, platforms: 2, hd: false, watermark: true, color: '#6c5ce7', popular: false };
  openModal(`
    <h3>${id ? '✏️ Planı Düzenle' : '＋ Yeni Abonelik Planı'}</h3>
    <div class="row">
      <div class="field"><label>Plan Adı</label><input id="pName" value="${esc(p.name)}" placeholder="Pro, Premium..."></div>
      <div class="field"><label>Fiyat (₺)</label><input id="pPrice" type="number" value="${p.price}"></div>
    </div>
    <div class="row">
      <div class="field"><label>Video Limiti / ay</label><input id="pVideos" type="number" value="${p.videos}"></div>
      <div class="field"><label>Platform Sayısı</label><input id="pPlats" type="number" value="${p.platforms}"></div>
    </div>
    <div class="row">
      <div class="field"><label>Tema Rengi</label><input id="pColor" type="color" value="${p.color}"></div>
      <div class="field" style="display:flex;gap:18px;align-items:flex-end;padding-bottom:4px">
        <label class="perm-item" style="margin:0"><input type="checkbox" id="pHD" ${p.hd ? 'checked' : ''}> HD Kalite</label>
        <label class="perm-item" style="margin:0"><input type="checkbox" id="pWM" ${p.watermark ? 'checked' : ''}> Filigran</label>
        <label class="perm-item" style="margin:0"><input type="checkbox" id="pPop" ${p.popular ? 'checked' : ''}> Popüler</label>
      </div>
    </div>
    <div style="display:flex;gap:10px;justify-content:flex-end">
      <button class="btn btn-ghost" onclick="closeModal()">Vazgeç</button>
      <button class="btn btn-primary" onclick="savePlan(${id || 0})">💾 Kaydet</button>
    </div>`);
}

function savePlan(id) {
  const data = {
    name: $('#pName').value || 'Yeni Plan', price: +$('#pPrice').value || 0,
    videos: +$('#pVideos').value || 0, platforms: +$('#pPlats').value || 1,
    hd: $('#pHD').checked, watermark: $('#pWM').checked, popular: $('#pPop').checked,
    color: $('#pColor').value, period: 'ay', active: true
  };
  if (id) Object.assign(planOf(id), data);
  else S.plans.push({ id: uid(), ...data });
  save(); closeModal(); RENDER.plans(); toast('Plan kaydedildi ✓', 'ok');
}

/* ================= ÜYELER & ROLLER ================= */
RENDER.users = () => {
  $('#page-users').innerHTML = `
    <div class="page-head"><div><h2>Üyeler & Roller</h2><p>Kullanıcıları, aboneliklerini ve rol bazlı izinleri yönet.</p></div>
      <button class="btn btn-primary" onclick="userModal()">＋ Yeni Üye</button></div>
    <div class="grid" style="grid-template-columns:1.5fr 1fr">
      <div class="card" style="padding:6px 12px">
        <table><tr><th>Üye</th><th>Rol</th><th>Plan</th><th>Durum</th><th></th></tr>
        ${S.users.map(u => { const r = roleOf(u.roleId), p = planOf(u.planId); return `<tr>
          <td><div style="display:flex;align-items:center;gap:10px"><div class="avatar-s" style="background:${r.color}">${esc(u.name[0])}</div><div><b>${esc(u.name)}</b><br><small style="color:var(--muted)">${esc(u.email)}</small></div></div></td>
          <td><span class="tag" style="background:${r.color}22;color:${r.color}">${esc(r.name)}</span></td>
          <td>${esc(p.name)} <small style="color:var(--muted)">₺${p.price}/ay</small></td>
          <td>${u.status === 'active' ? '<span class="tag tag-ok"><span class="dot"></span>Aktif</span>' : '<span class="tag tag-danger"><span class="dot"></span>Duraklatıldı</span>'}</td>
          <td style="white-space:nowrap">
            <button class="btn btn-ghost btn-sm" onclick="userModal(${u.id})">✏️</button>
            <button class="btn btn-danger btn-sm" onclick="toggleUser(${u.id})">${u.status === 'active' ? '⏸' : '▶'}</button>
          </td></tr>`; }).join('')}</table>
      </div>
      <div>
        ${S.roles.map(r => `
        <div class="card" style="margin-bottom:14px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
            <h3><span style="color:${r.color}">●</span> ${esc(r.name)}</h3>
            <button class="btn btn-ghost btn-sm" onclick="roleModal(${r.id})">✏️ İzinler</button>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:6px">
            ${r.perms.map(p => `<span class="tag tag-info">${PAGES.find(x => x.id === p)?.label || p}</span>`).join('')}
          </div>
          <div style="margin-top:10px;font-size:12px;color:var(--muted)">${S.users.filter(u => u.roleId === r.id).length} kullanıcı</div>
        </div>`).join('')}
        <button class="btn btn-ghost" style="width:100%" onclick="roleModal(0)">＋ Yeni Rol Oluştur</button>
      </div>
    </div>`;
};

function toggleUser(id) { const u = S.users.find(x => x.id === id); u.status = u.status === 'active' ? 'suspended' : 'active'; save(); RENDER.users(); }
function userModal(id) {
  const u = id ? S.users.find(x => x.id === id) : { name: '', email: '', roleId: 3, planId: 1 };
  openModal(`
    <h3>${id ? '✏️ Üyeyi Düzenle' : '＋ Yeni Üye'}</h3>
    <div class="field"><label>Ad Soyad</label><input id="uName" value="${esc(u.name)}"></div>
    <div class="field"><label>E-posta</label><input id="uEmail" type="email" value="${esc(u.email)}"></div>
    <div class="row">
      <div class="field"><label>Rol</label><select id="uRole">${S.roles.map(r => `<option value="${r.id}" ${r.id === u.roleId ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}</select></div>
      <div class="field"><label>Abonelik Planı</label><select id="uPlan">${S.plans.map(p => `<option value="${p.id}" ${p.id === u.planId ? 'selected' : ''}>${esc(p.name)} — ₺${p.price}</option>`).join('')}</select></div>
    </div>
    <div style="display:flex;gap:10px;justify-content:flex-end">
      <button class="btn btn-ghost" onclick="closeModal()">Vazgeç</button>
      <button class="btn btn-primary" onclick="saveUser(${id || 0})">💾 Kaydet</button>
    </div>`);
}
function saveUser(id) {
  const d = { name: $('#uName').value, email: $('#uEmail').value, roleId: +$('#uRole').value, planId: +$('#uPlan').value };
  if (id) Object.assign(S.users.find(x => x.id === id), d);
  else S.users.push({ id: uid(), ...d, status: 'active', joined: new Date().toISOString().slice(0, 10) });
  save(); closeModal(); RENDER.users(); toast('Üye kaydedildi ✓', 'ok');
}

function roleModal(id) {
  const r = id ? roleOf(id) : { name: '', color: '#55efc4', perms: [] };
  const allPerms = PAGES.filter(p => p.id).map(p => ({ id: p.id, label: p.label }));
  openModal(`
    <h3>${id ? '✏️ Rol İzinleri' : '＋ Yeni Rol'}</h3>
    <div class="row">
      <div class="field"><label>Rol Adı</label><input id="rName" value="${esc(r.name)}"></div>
      <div class="field"><label>Renk</label><input id="rColor" type="color" value="${r.color}"></div>
    </div>
    <div class="field"><label>Modül İzinleri</label>
      <div class="perm-grid">${allPerms.map(p => `
        <label class="perm-item" style="text-transform:none;letter-spacing:0;color:var(--text)">
          <input type="checkbox" class="rperm" value="${p.id}" ${r.perms.includes(p.id) ? 'checked' : ''}> ${p.label}
        </label>`).join('')}</div></div>
    <div style="display:flex;gap:10px;justify-content:flex-end">
      <button class="btn btn-ghost" onclick="closeModal()">Vazgeç</button>
      <button class="btn btn-primary" onclick="saveRole(${id || 0})">💾 Kaydet</button>
    </div>`, true);
}
function saveRole(id) {
  const perms = [...document.querySelectorAll('.rperm:checked')].map(c => c.value);
  if (!perms.includes('dashboard')) perms.unshift('dashboard');
  const d = { name: $('#rName').value || 'Rol', color: $('#rColor').value, perms };
  if (id) Object.assign(roleOf(id), d);
  else S.roles.push({ id: uid(), ...d });
  save(); closeModal(); renderNav(); RENDER.users(); toast('Rol kaydedildi ✓', 'ok');
}

function switchUserModal() {
  openModal(`
    <h3>👤 Kullanıcı Değiştir (demo)</h3>
    <p style="color:var(--muted);font-size:13px;margin-bottom:16px">Rol ve izinlerin nasıl çalıştığını görmek için farklı bir kullanıcıyla giriş yap.</p>
    ${S.users.map(u => { const r = roleOf(u.roleId); return `
      <div class="perm-item" style="margin-bottom:8px;cursor:pointer;${u.id === S.currentUserId ? 'border-color:var(--primary);background:rgba(108,92,231,.1)' : ''}" onclick="switchUser(${u.id})">
        <div class="avatar-s" style="background:${r.color};width:30px;height:30px">${esc(u.name[0])}</div>
        <div style="flex:1"><b style="font-size:13.5px">${esc(u.name)}</b> <span class="tag" style="background:${r.color}22;color:${r.color};margin-left:6px">${esc(r.name)}</span><br><small style="color:var(--muted)">${esc(u.email)}</small></div>
        ${u.id === S.currentUserId ? '✓' : ''}
      </div>`; }).join('')}`);
}
function switchUser(id) {
  S.currentUserId = id; save(); closeModal();
  const u = me(), r = roleOf(u.roleId);
  $('#ucName').textContent = u.name; $('#ucRole').textContent = r.name; $('#ucAvatar').textContent = u.name[0];
  renderNav();
  if (!can(PAGES.find(p => p.id === currentPage).perm)) currentPage = 'dashboard';
  go(currentPage);
  toast(`${r.name} olarak giriş yapıldı`, 'ok');
}

/* ================= REKLAM MODÜLÜ ================= */
const PLACEMENTS = { topbar: 'Üst Bar', sidebar: 'Yan Menü', infeed: 'Akış İçi', footer: 'Alt Bilgi', popup: 'Pop-up' };
RENDER.ads = () => {
  $('#page-ads').innerHTML = `
    <div class="page-head"><div><h2>Reklam Modülü</h2><p>Banner reklamları oluştur, konumlandır ve performansını izle.</p></div>
      <button class="btn btn-primary" onclick="adModal()">＋ Yeni Reklam</button></div>
    <div class="grid grid-3">
      ${S.ads.map(a => `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
          <span class="tag ${a.active ? 'tag-ok' : 'tag-muted'}"><span class="dot"></span>${a.active ? 'Yayında' : 'Pasif'}</span>
          <label class="switch"><input type="checkbox" ${a.active ? 'checked' : ''} onchange="toggleAd(${a.id})"><span class="slider-t"></span></label>
        </div>
        <div class="ad-preview" style="background:${a.bg}"><div>${esc(a.title)}<br><small style="font-weight:400;opacity:.85">${esc(a.text)}</small></div></div>
        <div class="ad-slot">📍 ${PLACEMENTS[a.placement]}</div>
        <div style="display:flex;justify-content:space-between;margin-top:14px;font-size:12.5px;color:var(--muted)">
          <span>👁 Görüntülenme: <b style="color:var(--text)">${a.views.toLocaleString('tr')}</b></span>
          <span>🖱 Tıklama: <b style="color:var(--text)">${a.clicks.toLocaleString('tr')}</b></span>
          <span>CTR: <b style="color:var(--accent)">%${(a.clicks / a.views * 100).toFixed(1)}</b></span>
        </div>
        <div style="display:flex;gap:8px;margin-top:14px">
          <button class="btn btn-ghost btn-sm" style="flex:1" onclick="adModal(${a.id})">✏️ Düzenle</button>
          <button class="btn btn-danger btn-sm" onclick="delAd(${a.id})">🗑</button>
        </div>
      </div>`).join('')}
    </div>`;
};

function toggleAd(id) { const a = S.ads.find(x => x.id === id); a.active = !a.active; save(); toast(`Reklam ${a.active ? 'yayına alındı' : 'durduruldu'}`, 'ok'); }
function delAd(id) { S.ads = S.ads.filter(a => a.id !== id); save(); RENDER.ads(); toast('Reklam silindi', 'ok'); }
function adModal(id) {
  const a = id ? S.ads.find(x => x.id === id) : { title: '', text: '', placement: 'sidebar', bg: 'linear-gradient(135deg,#6c5ce7,#00cec9)', active: true, clicks: 0, views: 0 };
  openModal(`
    <h3>${id ? '✏️ Reklamı Düzenle' : '＋ Yeni Reklam'}</h3>
    <div class="field"><label>Reklam Başlığı</label><input id="aTitle" value="${esc(a.title)}"></div>
    <div class="field"><label>Alt Metin / Slogan</label><input id="aText" value="${esc(a.text)}"></div>
    <div class="field"><label>Yerleşim Konumu</label><select id="aPlace">${Object.entries(PLACEMENTS).map(([k, v]) => `<option value="${k}" ${a.placement === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
    <div class="field"><label>Renk Teması</label>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${['linear-gradient(135deg,#6c5ce7,#00cec9)', 'linear-gradient(135deg,#e17055,#e84393)', 'linear-gradient(135deg,#0984e3,#55efc4)', 'linear-gradient(135deg,#2d3436,#636e72)', 'linear-gradient(135deg,#fdcb6e,#e17055)'].map(g => `
        <div class="color-dot agrad ${a.bg === g ? 'sel' : ''}" data-bg="${g}" style="background:${g}" onclick="pickGrad(this)"></div>`).join('')}
      </div></div>
    <div class="ad-preview" id="aPrev" style="background:${a.bg}">${esc(a.title) || 'Reklam önizleme'}</div>
    <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px">
      <button class="btn btn-ghost" onclick="closeModal()">Vazgeç</button>
      <button class="btn btn-primary" onclick="saveAd(${id || 0})">💾 Kaydet</button>
    </div>`);
}
function pickGrad(el) { document.querySelectorAll('.agrad').forEach(d => d.classList.remove('sel')); el.classList.add('sel'); $('#aPrev').style.background = el.dataset.bg; }
function saveAd(id) {
  const bg = document.querySelector('.agrad.sel')?.dataset.bg || 'linear-gradient(135deg,#6c5ce7,#00cec9)';
  const d = { title: $('#aTitle').value || 'Reklam', text: $('#aText').value, placement: $('#aPlace').value, bg };
  if (id) Object.assign(S.ads.find(x => x.id === id), d);
  else S.ads.push({ id: uid(), ...d, active: true, clicks: 0, views: 0 });
  save(); closeModal(); RENDER.ads(); toast('Reklam kaydedildi ✓', 'ok');
}

/* ================= İÇERİK & DUYURULAR (CMS) ================= */
RENDER.cms = () => {
  const types = { duyuru: ['📢', 'tag-warn'], blog: ['📝', 'tag-info'], sayfa: ['📄', 'tag-muted'] };
  $('#page-cms').innerHTML = `
    <div class="page-head"><div><h2>İçerik Yönetimi</h2><p>Duyurular, blog yazıları ve statik sayfaları yönet.</p></div>
      <button class="btn btn-primary" onclick="cmsModal()">＋ Yeni İçerik</button></div>
    <div class="card" style="padding:6px 12px">
      ${S.contents.length ? `<table><tr><th>İçerik</th><th>Tür</th><th>Tarih</th><th>Durum</th><th></th></tr>
      ${S.contents.slice().reverse().map(c => `<tr>
        <td><b>${esc(c.title)}</b><br><small style="color:var(--muted)">${esc(c.body.slice(0, 70))}${c.body.length > 70 ? '…' : ''}</small></td>
        <td><span class="tag ${types[c.type][1]}">${types[c.type][0]} ${c.type}</span></td>
        <td style="color:var(--muted)">${c.date}</td>
        <td>${c.status === 'published' ? '<span class="tag tag-ok"><span class="dot"></span>Yayında</span>' : '<span class="tag tag-muted"><span class="dot"></span>Taslak</span>'}</td>
        <td style="white-space:nowrap">
          <button class="btn btn-ghost btn-sm" onclick="toggleCms(${c.id})">${c.status === 'published' ? '⏸ Yayından Al' : '📤 Yayınla'}</button>
          <button class="btn btn-ghost btn-sm" onclick="cmsModal(${c.id})">✏️</button>
          <button class="btn btn-danger btn-sm" onclick="delCms(${c.id})">🗑</button>
        </td></tr>`).join('')}</table>` : '<div class="empty">Henüz içerik yok.</div>'}
    </div>`;
};
function toggleCms(id) { const c = S.contents.find(x => x.id === id); c.status = c.status === 'published' ? 'draft' : 'published'; save(); RENDER.cms(); }
function delCms(id) { S.contents = S.contents.filter(c => c.id !== id); save(); RENDER.cms(); toast('İçerik silindi', 'ok'); }
function cmsModal(id) {
  const c = id ? S.contents.find(x => x.id === id) : { type: 'duyuru', title: '', body: '', status: 'draft' };
  openModal(`
    <h3>${id ? '✏️ İçeriği Düzenle' : '＋ Yeni İçerik'}</h3>
    <div class="row">
      <div class="field"><label>Tür</label><select id="cType"><option value="duyuru" ${c.type === 'duyuru' ? 'selected' : ''}>📢 Duyuru</option><option value="blog" ${c.type === 'blog' ? 'selected' : ''}>📝 Blog Yazısı</option><option value="sayfa" ${c.type === 'sayfa' ? 'selected' : ''}>📄 Statik Sayfa</option></select></div>
      <div class="field"><label>Yayın Tarihi</label><input id="cDate" type="date" value="${c.date || new Date().toISOString().slice(0, 10)}"></div>
    </div>
    <div class="field"><label>Başlık</label><input id="cTitle" value="${esc(c.title)}"></div>
    <div class="field"><label>İçerik</label><textarea id="cBody" rows="5">${esc(c.body)}</textarea></div>
    <div style="display:flex;gap:10px;justify-content:flex-end">
      <button class="btn btn-ghost" onclick="closeModal()">Vazgeç</button>
      <button class="btn btn-ghost" onclick="saveCms(${id || 0},'draft')">📝 Taslak Kaydet</button>
      <button class="btn btn-primary" onclick="saveCms(${id || 0},'published')">📤 Yayınla</button>
    </div>`);
}
function saveCms(id, status) {
  const d = { type: $('#cType').value, title: $('#cTitle').value || 'Başlıksız', body: $('#cBody').value, date: $('#cDate').value, status };
  if (id) Object.assign(S.contents.find(x => x.id === id), d);
  else S.contents.push({ id: uid(), ...d });
  save(); closeModal(); RENDER.cms(); toast(status === 'published' ? 'İçerik yayınlandı 🎉' : 'Taslak kaydedildi', 'ok');
}

/* ================= SOSYAL MEDYA HESAPLARI ================= */
const SC_CLASS = { facebook: 'sc-fb', tiktok: 'sc-tt', instagram: 'sc-ig', linkedin: 'sc-in', x: 'sc-x' };
const SC_LOGO = { facebook: 'f', tiktok: '♪', instagram: '📸', linkedin: 'in', x: '𝕏' };
RENDER.social = () => {
  const conn = S.socials.filter(s => s.connected).length;
  $('#page-social').innerHTML = `
    <div class="page-head"><div><h2>Sosyal Medya Hesapları</h2><p>Hesaplarını bağla; videoların otomatik olarak tüm platformlara gönderilsin.</p></div>
      <span class="tag ${conn ? 'tag-ok' : 'tag-muted'}" style="font-size:13px;padding:8px 16px"><span class="dot"></span>${conn}/5 hesap bağlı</span></div>
    <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr))">
      ${S.socials.map(s => `
      <div class="card social-card">
        <div class="ic ${SC_CLASS[s.platform]}">${SC_LOGO[s.platform]}</div>
        <div><h3>${s.name}</h3>
        <div class="sub" style="margin:4px 0 0">${s.connected ? `@${esc(s.page)}` : 'Bağlı değil'}</div></div>
        ${s.connected ? `<span class="tag tag-ok"><span class="dot"></span>Aktif Bağlantı</span>` : `<span class="tag tag-muted">OAuth bekleniyor</span>`}
        ${s.connected ? `
        <div style="display:flex;gap:8px;width:100%">
          <button class="btn btn-ghost btn-sm" style="flex:1" onclick="connectModal('${s.platform}')">↻ Yenile</button>
          <button class="btn btn-danger btn-sm" style="flex:1" onclick="disconnectSocial('${s.platform}')">Bağlantıyı Kes</button>
        </div>
        <label style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--muted);text-transform:none;letter-spacing:0;margin:0;cursor:pointer">
          <input type="checkbox" style="width:auto" ${s.auto ? 'checked' : ''} onchange="toggleAuto('${s.platform}')"> Otomatik yayınla
        </label>` : `
        <button class="btn btn-primary btn-sm" style="width:100%" onclick="connectModal('${s.platform}')">🔗 Hesabı Bağla</button>`}
      </div>`).join('')}
    </div>
    <div class="card" style="margin-top:20px">
      <h3>🔐 API Erişim Anahtarları</h3>
      <div class="sub">Platform geliştirici konsollarından aldığın anahtarları gir (gerçek yayın için gerekli).</div>
      <div class="grid grid-2">
        ${S.socials.map(s => `<div class="field" style="margin-bottom:12px"><label>${s.name} API Key</label>
          <input placeholder="••••••••••••" value="${esc(s.token ? '••••••••' + s.token.slice(-4) : '')}" onchange="setToken('${s.platform}',this.value)"></div>`).join('')}
      </div>
      <small style="color:var(--muted)">🔒 Anahtarlar yalnızca bu tarayıcıda saklanır. Gerçek üretimde sunucu tarafında şifrelenerek tutulmalıdır.</small>
    </div>`;
};

function connectModal(platform) {
  const s = S.socials.find(x => x.platform === platform);
  openModal(`
    <h3>🔗 ${s.name} ile Bağlan</h3>
    <div style="text-align:center;padding:10px 0 18px">
      <div class="avatar-s ${SC_CLASS[platform]}" style="width:64px;height:64px;font-size:28px;border-radius:20px;margin:0 auto 10px">${SC_LOGO[platform]}</div>
      <b>${s.name} OAuth 2.0 yetkilendirmesi</b>
      <p style="color:var(--muted);font-size:12.5px;margin-top:6px">Hesabınıza video yükleme izni verilecektir. Demo modda simüle edilir.</p>
    </div>
    <div class="field"><label>${s.name} Kullanıcı Adı / Sayfa</label><input id="socPage" placeholder="ornek: sesvizyon" value="${esc(s.page)}"></div>
    <div class="field"><label>Erişim Token'ı (opsiyonel)</label><input id="socToken" placeholder="auto-generate" value="${esc(s.token)}"></div>
    <div style="display:flex;gap:10px;justify-content:flex-end">
      <button class="btn btn-ghost" onclick="closeModal()">Vazgeç</button>
      <button class="btn btn-primary" onclick="doConnect('${platform}')">✅ Yetkilendir ve Bağla</button>
    </div>`);
}
function doConnect(platform) {
  const s = S.socials.find(x => x.platform === platform);
  s.page = $('#socPage').value || 'hesabim';
  s.token = $('#socToken').value || 'tok_' + Math.random().toString(36).slice(2, 12);
  s.connected = true; s.auto = true;
  save(); closeModal(); RENDER.social();
  toast(`${s.name} hesabı bağlandı! @${s.page}`, 'ok');
}
function disconnectSocial(platform) {
  const s = S.socials.find(x => x.platform === platform);
  s.connected = false; s.token = ''; s.auto = false;
  save(); RENDER.social(); toast(`${s.name} bağlantısı kesildi`, 'ok');
}
function toggleAuto(platform) { const s = S.socials.find(x => x.platform === platform); s.auto = !s.auto; save(); toast(`${s.name} otomatik yayın: ${s.auto ? 'AÇIK' : 'KAPALI'}`, 'ok'); }
function setToken(platform, val) { const s = S.socials.find(x => x.platform === platform); s.token = val; save(); toast(`${s.name} API anahtarı güncellendi`, 'ok'); }

/* ================= GELİŞMİŞ SİTE AYARLARI ================= */
RENDER.settings = () => {
  const st = S.settings;
  $('#page-settings').innerHTML = `
    <div class="page-head"><div><h2>Gelişmiş Site Ayarları</h2><p>Genel, e-posta, SEO ve sistem parametrelerini yapılandır.</p></div>
      <button class="btn btn-primary" onclick="saveSettings()">💾 Tümünü Kaydet</button></div>
    <div class="grid grid-2">
      <div class="card">
        <h3>🏠 Genel Ayarlar</h3><div class="sub">Temel site bilgileri</div>
        <div class="field"><label>Site Adı</label><input id="stName" value="${esc(st.siteName)}"></div>
        <div class="field"><label>Logo Metni</label><input id="stLogo" value="${esc(st.logoText)}"></div>
        <div class="field"><label>Site Açıklaması</label><textarea id="stDesc" rows="2">${esc(st.siteDesc)}</textarea></div>
        <div class="field"><label>Destek E-posta</label><input id="stMail" type="email" value="${esc(st.supportEmail)}"></div>
        <div class="row">
          <div class="field"><label style="display:flex;gap:8px;align-items:center;text-transform:none"><input type="checkbox" id="stMaint" style="width:auto" ${st.maintenance ? 'checked' : ''}> Bakım Modu</label></div>
          <div class="field"><label style="display:flex;gap:8px;align-items:center;text-transform:none"><input type="checkbox" id="stReg" style="width:auto" ${st.registration ? 'checked' : ''}> Yeni Üyelik Açık</label></div>
        </div>
      </div>
      <div class="card">
        <h3>🔍 SEO Ayarları</h3><div class="sub">Arama motoru optimizasyonu</div>
        <div class="field"><label>SEO Başlığı</label><input id="stSeoT" value="${esc(st.seoTitle)}"></div>
        <div class="field"><label>Anahtar Kelimeler</label><input id="stSeoK" value="${esc(st.seoKeywords)}"></div>
        <div class="field"><label>SMTP Sunucu</label><input id="stSmtp" value="${esc(st.smtpHost)}"></div>
        <div class="row">
          <div class="field"><label>SMTP Port</label><input id="stPort" value="${esc(st.smtpPort)}"></div>
          <div class="field"><label>API Zaman Aşımı (sn)</label><input id="stTimeout" type="number" value="${st.apiTimeout}"></div>
        </div>
      </div>
      <div class="card">
        <h3>🎬 Video İşleme</h3><div class="sub">Dönüştürücü kısıtları</div>
        <div class="field"><label>Maks. Dosya Boyutu (MB)</label><input id="stMaxMB" type="number" value="${st.maxFileMB}"></div>
        <label style="display:flex;gap:10px;align-items:center;text-transform:none;letter-spacing:0;color:var(--text);cursor:pointer">
          <input type="checkbox" id="stWM" style="width:auto" ${st.watermark ? 'checked' : ''}> Videolara "SesVizyon" filigranı ekle
        </label>
      </div>
      <div class="card">
        <h3>⚠️ Tehlikeli Bölge</h3><div class="sub">Geri alınamaz işlemler</div>
        <p style="font-size:13px;color:var(--muted);margin-bottom:14px">Tüm verileri (planlar, üyeler, içerikler, ayarlar) fabrika ayarlarına döndürür.</p>
        <button class="btn btn-danger" onclick="resetAll()">🗑 Fabrika Ayarlarına Sıfırla</button>
      </div>
    </div>`;
};
function saveSettings() {
  Object.assign(S.settings, {
    siteName: $('#stName').value, logoText: $('#stLogo').value, siteDesc: $('#stDesc').value,
    supportEmail: $('#stMail').value, maintenance: $('#stMaint').checked, registration: $('#stReg').checked,
    seoTitle: $('#stSeoT').value, seoKeywords: $('#stSeoK').value, smtpHost: $('#stSmtp').value, smtpPort: $('#stPort').value,
    apiTimeout: +$('#stTimeout').value, maxFileMB: +$('#stMaxMB').value, watermark: $('#stWM').checked
  });
  save(); toast('Ayarlar kaydedildi ✓', 'ok');
}
function resetAll() {
  openModal(`<h3>⚠️ Emin misin?</h3><p style="color:var(--muted);font-size:13.5px;margin-bottom:18px">TÜM veriler silinip fabrika ayarları yüklenecek. Bu işlem geri alınamaz!</p>
    <div style="display:flex;gap:10px;justify-content:flex-end">
      <button class="btn btn-ghost" onclick="closeModal()">Vazgeç</button>
      <button class="btn btn-danger" onclick="localStorage.removeItem(LS_KEY);location.reload()">Evet, Sıfırla</button>
    </div>`);
}

/* ================= TEMA YÖNETİMİ ================= */
const PRESETS = {
  mor: { name: 'Mor Rüya', primary: '#6c5ce7', accent: '#00cec9', bg: 'linear-gradient(135deg,#6c5ce7,#00cec9)' },
  okyanus: { name: 'Okyanus', primary: '#0984e3', accent: '#00cec9', bg: 'linear-gradient(135deg,#0984e3,#00cec9)' },
  gunbatimi: { name: 'Gün Batımı', primary: '#e17055', accent: '#fdcb6e', bg: 'linear-gradient(135deg,#e17055,#fdcb6e)' },
  orman: { name: 'Orman', primary: '#00b894', accent: '#55efc4', bg: 'linear-gradient(135deg,#00b894,#55efc4)' },
  gece: { name: 'Gece Mavisi', primary: '#3742fa', accent: '#70a1ff', bg: 'linear-gradient(135deg,#3742fa,#70a1ff)' },
  kirmizi: { name: 'Ruby', primary: '#e84393', accent: '#ff7675', bg: 'linear-gradient(135deg,#e84393,#ff7675)' }
};
RENDER.theme = () => {
  $('#page-theme').innerHTML = `
    <div class="page-head"><div><h2>Tema Yönetimi</h2><p>Panelin renk kimliğini hazır temalardan seç veya kendi paletini oluştur.</p></div>
      <button class="btn btn-primary" onclick="saveTheme()">💾 Temayı Uygula</button></div>
    <div class="card">
      <h3>🎨 Hazır Temalar</h3><div class="sub">Tek tıkla bütün paneli yenile</div>
      <div class="grid grid-3">
        ${Object.entries(PRESETS).map(([k, p]) => `
        <div class="theme-swatch ${S.theme.preset === k ? 'sel' : ''}" style="background:${p.bg}" onclick="pickPreset('${k}')">
          <b>${p.name}</b>
        </div>`).join('')}
      </div>
    </div>
    <div class="card" style="margin-top:18px">
      <h3>🖌 Özel Renk Paleti</h3><div class="sub">Birincil ve vurgu rengini serbestçe seç</div>
      <div class="row" style="max-width:520px">
        <div class="field"><label>Birincil Renk</label><input type="color" id="thPrimary" value="${S.theme.primary}" oninput="liveTheme()"></div>
        <div class="field"><label>Vurgu Rengi</label><input type="color" id="thAccent" value="${S.theme.accent}" oninput="liveTheme()"></div>
      </div>
      <div class="section-title" style="margin-top:20px">Canlı Önizleme</div>
      <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center">
        <button class="btn btn-primary">Birincil Buton</button>
        <span class="tag tag-info">Etiket Örneği</span>
        <span class="tag tag-ok"><span class="dot"></span>Durum</span>
        <div class="progress" style="width:180px;margin:0"><div style="width:65%"></div></div>
      </div>
    </div>`;
};
function pickPreset(k) {
  S.theme = { preset: k, primary: PRESETS[k].primary, accent: PRESETS[k].accent };
  applyTheme(); save(); RENDER.theme(); toast(`"${PRESETS[k].name}" teması uygulandı`, 'ok');
}
function liveTheme() {
  S.theme.primary = $('#thPrimary').value; S.theme.accent = $('#thAccent').value; S.theme.preset = 'custom';
  applyTheme();
}
function saveTheme() { S.theme.primary = $('#thPrimary').value; S.theme.accent = $('#thAccent').value; save(); toast('Tema kaydedildi ✓', 'ok'); }

/* ================= INIT ================= */
document.addEventListener('dragover', e => e.preventDefault());
document.addEventListener('drop', e => {
  e.preventDefault();
  const f = e.dataTransfer?.files?.[0];
  if (f && currentPage === 'converter' && f.type.startsWith('audio')) onAudioFile(f);
});
applyTheme();
buildPages();
renderNav();
$('#ucName').textContent = me().name;
$('#ucRole').textContent = roleOf(me().roleId).name;
$('#ucAvatar').textContent = me().name[0];
go('dashboard');
