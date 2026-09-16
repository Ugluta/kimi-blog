// X (Twitter) — Chunked media upload (3 adım) + Tweet atma
// Yetki: OAuth 2.0 user context (tweet.read, tweet.write, media.write)
// Docs: https://developer.x.com/en/docs/x-api/media
async function uploadChunked(videoBytes, token) {
  // INIT
  const init = await fetch('https://upload.x.com/1.1/media/upload.json?command=INIT&media_type=video/mp4&total_bytes=' + videoBytes.length, {
    method: 'POST', headers: { Authorization: `Bearer ${token}` },
  });
  const { media_id_string } = await init.json();
  if (!init.ok) throw new Error('x INIT ' + init.status);
  // APPEND
  const form = new FormData();
  form.append('media', new Blob([videoBytes]), 'video.mp4');
  const app = await fetch(`https://upload.x.com/1.1/media/upload.json?command=APPEND&media_id=${media_id_string}&segment_index=0`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form,
  });
  if (!app.ok) throw new Error('x APPEND ' + app.status);
  // FINALIZE (durum processing olabilir; üretimde STATUS polling eklenir)
  const fin = await fetch(`https://upload.x.com/1.1/media/upload.json?command=FINALIZE&media_id=${media_id_string}`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}` },
  });
  const finData = await fin.json();
  if (!fin.ok) throw new Error('x FINALIZE ' + fin.status);
  return finData.media_id_string;
}

async function publishX({ videoUrl, caption, token }) {
  const videoBytes = Buffer.from(await (await fetch(videoUrl)).arrayBuffer());
  const mediaId = await uploadChunked(videoBytes, token);
  const res = await fetch('https://api.x.com/2/tweets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ text: (caption || '').slice(0, 280), media: { media_ids: [mediaId] } }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`x tweet ${res.status}: ${JSON.stringify(data)}`);
  return { ok: true, postUrl: `https://x.com/i/status/${data.data.id}`, platformId: data.data.id };
}
module.exports = publishX;
