// Facebook / Meta Graph API v21 — Sayfa videosu yükleme
// Yetki: pages_manage_posts + pages_read_engagement (page access token gerekli)
// Docs: https://developers.facebook.com/docs/graph-api/reference/page/videos
async function publishFacebook({ videoUrl, title, caption, token, account }) {
  const params = new URLSearchParams({
    file_url: videoUrl,              // herkese açık URL (CloudFront/S3 presigned)
    title,
    description: caption || title,
    access_token: token,
  });
  const res = await fetch(`https://graph.facebook.com/v21.0/${account}/videos`, {
    method: 'POST', body: params,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`facebook ${res.status}: ${data.error?.message || JSON.stringify(data)}`);
  // video id → kalıcı bağlantı (Faz 3'te post id'sinden permalink çekilebilir)
  return { ok: true, postUrl: `https://www.facebook.com/watch/?v=${data.id}`, platformId: data.id };
}
module.exports = publishFacebook;
