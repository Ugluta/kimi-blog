// Token Kasası — Faz 2 mimarisi: KMS şifrelemesi
//   ÜRETİMDE: AWS KMS (terraform'daki token_vault anahtarı) ile şifrele
//   GELİŞTİRME: AES-256-GCM + JWT_SECRET türevi anahtar (KMS yoksa)
// Token asla düz metin saklanmaz, asla loglanmaz.
const crypto = require('crypto');

const hasKMS = !!process.env.KMS_KEY_ARN;
let kmsClient = null;
if (hasKMS) {
  const { KMSClient, EncryptCommand, DecryptCommand } = require('@aws-sdk/client-kms');
  kmsClient = new KMSClient({ region: process.env.AWS_REGION || 'eu-central-1' });
}

// Dev anahtarı: JWT_SECRET'den türetilir (uzunluk garantisi için SHA-256)
const devKey = crypto.createHash('sha256').update(process.env.JWT_SECRET || 'dev').digest();

async function seal(token) {
  if (hasKMS) {
    const r = await kmsClient.send(new EncryptCommand({ KeyId: process.env.KMS_KEY_ARN, Plaintext: Buffer.from(token) }));
    return 'kms:' + r.CiphertextBlob.toString('base64');
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', devKey, iv);
  const enc = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return 'aes:' + iv.toString('base64') + ':' + cipher.getAuthTag().toString('base64') + ':' + enc.toString('base64');
}

async function unseal(stored) {
  if (stored.startsWith('kms:')) {
    const r = await kmsClient.send(new DecryptCommand({ CiphertextBlob: Buffer.from(stored.slice(4), 'base64') }));
    return r.Plaintext.toString('utf8');
  }
  const [, iv, tag, data] = stored.split(':');
  const decipher = crypto.createDecipheriv('aes-256-gcm', devKey, Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8');
}

module.exports = { seal, unseal, hasKMS };
