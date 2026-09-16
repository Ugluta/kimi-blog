// Instagram Media Publishing API — 2 adımlı: container oluştur → yayınla
// Gereksinim: Reels < 90 sn veya video < 60dk, herkese açık URL, Business/Creator hesap
// Docs: https://developers.facebook.com/docs/instagram-api/reference/ig-user/media
async function publishInstagram({ videoUrl, caption, token, account }) {
  // 1) Media container
  const cRes = await fetch(`https://graph.facebook.com/v21.0/${account}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ video_url: videoUrl, caption, media_type: 'REELS', access_token: token }),
  });
  const cData = await cRes.json();
  if (!cRes.ok) throw new Error(`instagram container ${cRes.status}: ${cData.error?.message}`);
  // 2) Container'ı yayınla (status_code=FINISHED olana kadar beklemek üretimde önerilir)
  const pRes = await fetch(`https://graph.facebook.com/v21.0/${account}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: cData.id, access_token: token }),
  });
  const pData = await pRes.json();
  if (!pRes.ok) throw new Error(`instagram publish ${pRes.status}: ${pData.error?.message}`);
  return { ok: true, postUrl: `https://www.instagram.com/reel/${pData.id}`, platformId: pData.id };
}
module.exports = publishInstagram;
