-- Sosyal medya hesapları: token'lar tokenStore.js ile şifrelenmiş saklanır
-- token_enc alanı "aes:..." (dev) veya "kms:..." (prod, KMS_KEY_ARN ile) formatındadır
CREATE TABLE IF NOT EXISTS social_accounts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('facebook','tiktok','instagram','linkedin','x')),
  account_ref TEXT NOT NULL,          -- fb: page_id | ig: ig-user-id | li: person|organization | tt/x: username
  token_enc TEXT NOT NULL,            -- KMS/AES-GCM şifreli erişim token'ı
  refresh_token_enc TEXT,             -- varsa yenileme token'ı
  scopes TEXT[],                      -- ['video.publish'] gibi
  expires_at TIMESTAMPTZ,             -- token yenileme zamanlayıcısı (Faz 2 worker'ı)
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, platform)
);

-- Token yazma örneği (şifreleme worker'daki tokenStore.seal ile yapılır):
-- INSERT INTO social_accounts(user_id, platform, account_ref, token_enc)
-- VALUES (1, 'facebook', '1234567890', 'kms:AQICA...');
