// LinkedIn — 2 adımlı: video asset kaydı + upload → paylaşım
// Yetki: w_member_social (kişisel) veya w_organization_social (şirket sayfası)
// Docs: https://learn.microsoft.com/linkedin/marketing/community-management/shares/videos
async function publishLinkedin({ videoUrl, title, caption, token, account }) {
  // 1) Asset kaydı + presigned upload URL al
  const reg = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      registerUploadRequest: {
        owner: `urn:li:${account}`,          // örn: urn:li:person veya urn:li:organization
        recipes: ['urn:li:digitalmediaRecipe:feedshare-video'],
        serviceRelationships: [{ identifier: 'urn:li:userGeneratedContent', relationshipType: 'OWNER' }],
      },
    }),
  });
  const regData = await reg.json();
  if (!reg.ok) throw new Error(`linkedin register ${reg.status}: ${JSON.stringify(regData)}`);
  const asset = regData.value.asset;
  const uploadUrl = regData.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;

  // 2) Videoyu presigned URL'e yükle (byte-range PUT)
  const video = await fetch(videoUrl);
  const up = await fetch(uploadUrl, { method: 'PUT', body: video.body, headers: { 'Content-Type': 'video/mp4' } });
  if (!up.ok) throw new Error(`linkedin upload ${up.status}`);

  // 3) Feed'de paylaş
  const share = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      author: `urn:li:${account}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: caption || title },
          shareMediaCategory: 'VIDEO',
          media: [{ status: 'READY', media: asset, title: { text: title } }],
        },
      },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
    }),
  });
  const shareData = await share.json();
  if (!share.ok) throw new Error(`linkedin share ${share.status}: ${shareData.message || JSON.stringify(shareData)}`);
  return { ok: true, postUrl: `https://www.linkedin.com/feed/update/${shareData.id}/`, platformId: shareData.id };
}
module.exports = publishLinkedin;
