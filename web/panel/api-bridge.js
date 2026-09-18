/* ============================================================
   API KÖPRÜSÜ — Panel ↔ SesVizyon Backend
   Bütünlük kuralı: API çevrimdışıysa veya giriş yapılmamışsa
   panelin mevcut localStorage demo modu AYNEN çalışmaya devam eder.
   ============================================================ */

const API = {
  get url() { return localStorage.getItem('sv_api_url') || 'http://localhost:3000'; },
  set url(v) { localStorage.setItem('sv_api_url', v); },
  get token() { return localStorage.getItem('sv_jwt'); },
  set token(v) { v ? localStorage.setItem('sv_jwt', v) : localStorage.removeItem('sv_jwt'); },
  async req(path, opts = {}) {
    const isForm = opts.body instanceof FormData;
    const r = await fetch(this.url + path, {
      ...opts,
      headers: {
        Authorization: this.token ? `Bearer ${this.token}` : '',
        ...(isForm ? {} : { 'Content-Type': 'application/json' }),
        ...(opts.headers || {}),
      },
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
    return data;
  },
};
let __apiConvId = null;   // yayın modalının hedeflediği dönüştürme

async function apiOnline() {
  try {
    const c = new AbortController();
    setTimeout(() => c.abort(), 1500);
    return (await fetch(API.url + '/health', { signal: c.signal })).ok;
  } catch { return false; }
}

/* ---------- Giriş modalı ---------- */
function apiAuthModal() {
  openModal(`
    <h3>🔐 API Hesabına Giriş</h3>
    <div class="field"><label>API Sunucusu</label><input id="apiUrl" value="${esc(API.url)}"></div>
    <div class="field"><label>E-posta</label><input id="apiEmail" type="email" placeholder="a@b.co"></div>
    <div class="field"><label>Şifre</label><input id="apiPass" type="password" placeholder="parola123"></div>
    <div style="display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap">
      <button class="btn btn-ghost" onclick="apiRegister()">📝 Kayıt Ol</button>
      <button class="btn btn-primary" onclick="apiLogin()">🔑 Giriş Yap</button>
    </div>
    <div class="sub" style="margin-top:12px">Demo moddan çık: gerçek render kuyruğu + yayın kuyruğu kullanılır.</div>`);
}
async function apiLogin() {
  API.url = $('#apiUrl').value.replace(/\/$/, '');
  try {
    const r = await API.req('/auth/login', { method: 'POST', body: JSON.stringify({ email: $('#apiEmail').value, password: $('#apiPass').value }) });
    API.token = r.token; closeModal(); apiRefreshUI();
    toast(`Hoş geldin ${esc(r.user.name)} — API modu aktif`, 'ok');
  } catch (e) { toast('Giriş başarısız: ' + e.message, 'err'); }
}
async function apiRegister() {
  API.url = $('#apiUrl').value.replace(/\/$/, '');
  try {
    const r = await API.req('/auth/register', { method: 'POST', body: JSON.stringify({ name: $('#apiEmail').value.split('@')[0], email: $('#apiEmail').value, password: $('#apiPass').value }) });
    API.token = r.token; closeModal(); apiRefreshUI();
    toast('Kayıt tamam — API modu aktif', 'ok');
  } catch (e) { toast('Kayıt başarısız: ' + e.message, 'err'); }
}
function apiLogout() { API.token = null; apiRefreshUI(); toast('API modu kapatıldı, demo moda dönüldü'); }

/* ---------- Üst bara durum butonu ---------- */
function apiRefreshUI() {
  let b = $('#apiStatusBtn');
  if (!b) {
    b = document.createElement('button');
    b.id = 'apiStatusBtn';
    b.className = 'btn btn-sm';
    document.querySelector('.top-actions').insertBefore(b, document.querySelector('.top-actions .btn-primary'));
  }
  if (API.token) {
    b.className = 'btn btn-success btn-sm';
    b.textContent = '🟢 API Aktif';
    b.onclick = () => openModal(`<h3>🟢 API Bağlantısı</h3><p style="color:var(--muted);font-size:13px;margin-bottom:16px">Sunucu: <b>${esc(API.url)}</b></p>
      <div style="display:flex;gap:10px;justify-content:flex-end"><button class="btn btn-ghost" onclick="closeModal()">Kapat</button>
      <button class="btn btn-danger" onclick="apiLogout();closeModal()">Çıkış Yap</button></div>`);
  } else {
    b.className = 'btn btn-ghost btn-sm';
    b.textContent = '🔌 API Bağlan';
    b.onclick = apiAuthModal;
  }
  if (currentPage === 'queue') RENDER.queue();
  if (currentPage === 'converter') RENDER.converter();
}

/* ---------- 1) DÖNÜŞTÜRÜCÜ: sunucuya yükleme kartı ---------- */
const _renderConverter = RENDER.converter;
RENDER.converter = function () {
  _renderConverter();
  if (!API.token) return;   // demo mod: mevcut canvas akışı aynen
  $('#page-converter').insertAdjacentHTML('beforeend', `
    <div class="card" style="margin-top:18px;border-color:var(--ok)">
      <h3>☁️ Sunucu Kuyruğuna Gönder (gerçek render)</h3>
      <div class="sub">Ses dosyasını API'ye yükle → FFmpeg işçisine düşer → S3'e çıkar</div>
      <div class="row">
        <div class="field"><label>Ses Dosyası</label><input type="file" id="srvAudio" accept="audio/*"></div>
        <div class="field"><label>Tema</label><select id="srvTheme"><option value="mor">Mor Gece</option><option value="gunes">Gün Batımı</option><option value="okyanus">Okyanus</option><option value="neon">Neon Grid</option></select></div>
        <div class="field"><label>Format</label><select id="srvRatio"><option value="16:9">16:9</option><option value="9:16">9:16 (TikTok)</option><option value="1:1">1:1</option></select></div>
      </div>
      <button class="btn btn-success" onclick="srvUpload()">🚀 Yükle ve Kuyruğa Al</button>
      <div class="progress" id="srvProg" style="display:none"><div style="width:0%"></div></div>
      <div id="srvResult" style="margin-top:14px"></div>
    </div>`);
};

function srvUpload() {
  const f = $('#srvAudio').files[0];
  if (!f) { toast('Ses dosyası seç', 'err'); return; }
  const fd = new FormData();
  fd.append('audio', f);
  fd.append('title', f.name.replace(/\.[^.]+$/, ''));
  fd.append('theme', $('#srvTheme').value);
  fd.append('ratio', $('#srvRatio').value);
  const prog = $('#srvProg'); prog.style.display = 'block';
  const xhr = new XMLHttpRequest();
  xhr.open('POST', API.url + '/conversions');
  xhr.setRequestHeader('Authorization', 'Bearer ' + API.token);
  xhr.upload.onprogress = e => { if (e.lengthComputable) prog.firstElementChild.style.width = (e.loaded / e.total * 100) + '%'; };
  xhr.onload = () => {
    const data = JSON.parse(xhr.responseText || '{}');
    if (xhr.status === 202) {
      __apiConvId = data.id;
      toast(`İş kuyruğa alındı: ${data.id.slice(0, 8)}…`, 'ok');
      pollConversion(data.id);
    } else toast(data.error || 'Yükleme başarısız', 'err');
  };
  xhr.onerror = () => toast('Sunucuya ulaşılamadı', 'err');
  xhr.send(fd);
}

async function pollConversion(id) {
  const box = $('#srvResult');
  const tick = async () => {
    try {
      const c = await API.req('/conversions/' + id);
      const st = { queued: '⏳ Kuyrukta', rendering: '⚙️ Render ediliyor…', done: '✅ Hazır', error: '❌ Hata' }[c.status];
      box.innerHTML = `<div class="perm-item" style="justify-content:space-between">
        <span>${st} — <b>${esc(c.title)}</b>${c.error ? ' (' + esc(c.error) + ')' : ''}</span>
        ${c.status === 'done' ? `<span style="display:flex;gap:8px">
          <a class="btn btn-ghost btn-sm" href="${esc(c.output_url)}" target="_blank">▶ İzle</a>
          <button class="btn btn-primary btn-sm" onclick="__apiConvId='${c.id}';newPublishModal()">🚀 Sosyal Medyaya Gönder</button></span>` : ''}
      </div>`;
      if (c.status === 'queued' || c.status === 'rendering') setTimeout(tick, 2500);
      else if (currentPage === 'queue') RENDER.queue();
    } catch (e) { box.innerHTML = `<span class="tag tag-danger">${esc(e.message)}</span>`; }
  };
  tick();
}

/* ---------- 2) YAYIN MODALI: gerçek API'ye bağla ---------- */
const _submitPublish = window.submitPublish;
window.submitPublish = async function () {
  if (!API.token || !__apiConvId) return _submitPublish();   // demo akış korunur
  const platforms = [...document.querySelectorAll('.qpf:checked')].map(c => c.value);
  if (!platforms.length) { toast('En az bir platform seç', 'err'); return; }
  try {
    const r = await API.req(`/conversions/${__apiConvId}/publish`, {
      method: 'POST', body: JSON.stringify({ platforms }),
    });
    closeModal();
    toast(`🚀 Yayın kuyruğa alındı (${platforms.length} platform)`, 'ok');
    trackPublishJob(r.jobId);
  } catch (e) { toast(e.message, 'err'); }
};

function trackPublishJob(jobId) {
  const jobs = JSON.parse(localStorage.getItem('sv_pub_jobs') || '[]');
  jobs.push({ jobId, at: Date.now() });
  localStorage.setItem('sv_pub_jobs', JSON.stringify(jobs.slice(-20)));
  setTimeout(async () => {
    try {
      const j = await API.req('/publish/' + jobId);
      const okCount = Object.values(j.results || {}).filter(r => r.ok).length;
      toast(`Yayın sonucu: ${okCount}/${j.platforms?.length || '?'} platform başarılı`, okCount ? 'ok' : 'err');
      if (currentPage === 'queue') RENDER.queue();
    } catch { /* retry bir sonraki ziyarette */ }
  }, 20000);
}

/* ---------- 3) KUYRUK SAYFASI: API modunda gerçek liste ---------- */
const _renderQueue = RENDER.queue;
RENDER.queue = async function () {
  if (!API.token) return _renderQueue();   // demo: mevcut localStorage kuyruğu
  try {
    const items = await API.req('/conversions');
    const jobs = JSON.parse(localStorage.getItem('sv_pub_jobs') || '[]');
    $('#page-queue').innerHTML = `
      <div class="page-head"><div><h2>Yayın Kuyruğu <span class="tag tag-ok" style="margin-left:8px">🟢 API</span></h2>
      <p>Gerçek render kuyruğu — FFmpeg worker havuzunda işleniyor.</p></div>
      <button class="btn btn-primary" onclick="go('converter')">🎬 Yeni Video</button></div>
      <div class="card" style="padding:6px 12px">
        ${items.length ? `<table><tr><th>Video</th><th>Durum</th><th>Tarih</th><th></th></tr>
        ${items.map(c => `<tr>
          <td><b>${esc(c.title)}</b></td>
          <td>${{ queued: '<span class="queue-status q-pending">⏳ Kuyrukta</span>', rendering: '<span class="queue-status q-pub">⚙️ Render</span>', done: '<span class="queue-status q-ok">✅ Hazır</span>', error: '<span class="queue-status q-err">❌ Hata</span>' }[c.status]}</td>
          <td style="color:var(--muted)">${new Date(c.created_at).toLocaleString('tr')}</td>
          <td>${c.status === 'done' ? `<button class="btn btn-primary btn-sm" onclick="__apiConvId='${c.id}';newPublishModal()">🚀 Yayınla</button>
              <a class="btn btn-ghost btn-sm" href="${esc(c.output_url)}" target="_blank">▶</a>` : ''}</td>
        </tr>`).join('')}</table>` : '<div class="empty">📭 Henüz iş yok — Dönüştürücü sayfasından yükle.</div>'}
      </div>
      <div class="section-title">Yayın İşleri (son kayıtlar)</div>
      <div class="card" style="padding:6px 12px">
        ${jobs.length ? jobs.slice(-8).reverse().map(j => `<div class="perm-item" style="margin-bottom:6px">
          <b>#${j.jobId.slice(0, 8)}</b> <span style="color:var(--muted);font-size:12px">${new Date(j.at).toLocaleString('tr')} — 20 sn sonra sonuç için sayfayı yenile</span>
          <button class="btn btn-ghost btn-sm" style="margin-left:auto" onclick="apiShowJob('${j.jobId}')">Sonucu Gör</button>
        </div>`).join('') : '<div class="empty">Yayın işi yok.</div>'}
      </div>`;
  } catch (e) {
    API.token = null; apiRefreshUI();
    toast('API oturumu hatalı, demo moda dönüldü', 'err');
    _renderQueue();
  }
};

async function apiShowJob(jobId) {
  try {
    const j = await API.req('/publish/' + jobId);
    const rows = Object.entries(j.results || {}).map(([p, r]) =>
      `<tr><td>${pfIco(p)} ${p}</td><td>${r.ok ? `<span class="tag tag-ok">✅</span> <a href="${esc(r.postUrl)}" target="_blank" style="color:var(--accent)">bağlantı</a>` : `<span class="tag tag-danger">${esc(r.error || 'hata')}</span>`}</td></tr>`).join('');
    openModal(`<h3>🚀 Yayın Sonucu</h3><table>${rows || '<tr><td class="empty">Henüz sonuç yok</td></tr>'}</table>
      <div style="display:flex;justify-content:flex-end;margin-top:14px"><button class="btn btn-ghost" onclick="closeModal()">Kapat</button></div>`, true);
  } catch (e) { toast(e.message, 'err'); }
}

/* ---------- 4) SOSYAL HESAPLAR: token'ı API'ye şifreli kaydet ---------- */
const _doConnect = window.doConnect;
window.doConnect = async function (platform) {
  if (API.token) {
    try {
      await API.req('/social-accounts', {
        method: 'POST',
        body: JSON.stringify({ platform, account_ref: $('#socPage').value || 'me', token: $('#socToken').value || 'demo' }),
      });
      toast('Token API\'ye şifrelendi ve kaydedildi 🔐', 'ok');
    } catch (e) { toast('API kaydı başarısız (yerel kayıt yapıldı): ' + e.message, 'err'); }
  }
  _doConnect(platform);   // yerel demo durumu da güncellensin → panel tutarlı kalır
};

/* ---------- Başlangıç ---------- */
apiRefreshUI();
