// TikTok Content Posting API v2 — PULL_FROM_URL modu (video URL'sinden çeker)
// Yetki: video.publish scope, access token; yalnızca özel hesaba değil herkese açık hesaba
// Docs: https://developers.tiktok.com/doc/content-posting-api-get-started
async function publishTiktok({ videoUrl, title, caption, token }) {
  const res = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=UTF-8', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      post_info: { title, description: caption || '' },
      source_info: { source: 'PULL_FROM_URL', video_url: videoUrl },
    }),
  });
  const data = await res.json();
  if (data.error?.code !== 'ok') throw new Error(`tiktok: ${data.error?.message || JSON.stringify(data)}`);
  return { ok: true, postUrl: 'https://www.tiktok.com/@user', platformId: data.data?.publish_id };
}
module.exports = publishTiktok;
