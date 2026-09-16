// Publisher fabrikası — bütünlük kuralı:
//   • Platform env'de token varsa GERÇEK API çağrılır
//   • Yoksa Faz 1'deki demo davranış korunur (iş akışı/DB şeması değişmez)
//   • Hata → throw → BullMQ retry/backoff tetikler (mimariyle aynı)
const publishers = {
  facebook: require('./facebook'),
  tiktok: require('./tiktok'),
  instagram: require('./instagram'),
  linkedin: require('./linkedin'),
  x: require('./x'),
};

function tokenFor(platform) {
  return process.env[`TOKEN_${platform.toUpperCase()}`] || null;
}

async function publish(platform, payload) {
  const real = publishers[platform];
  const token = tokenFor(platform);

  if (real && token) {
    // Hesap hedefi: env'de yoksa platform varsayılanı
    const target = process.env[`ACCOUNT_${platform.toUpperCase()}`] ||
      (platform === 'linkedin' ? 'person' : 'me');
    return real({ ...payload, token, account: target });
  }

  // ---- DEMO MODU (Faz 1 davranışı birebir aynı) ----
  await new Promise(r => setTimeout(r, 1500));
  return { ok: true, postUrl: `https://${platform}.com/p/${Math.random().toString(36).slice(2, 10)}`, simulated: true };
}

module.exports = { publish };
