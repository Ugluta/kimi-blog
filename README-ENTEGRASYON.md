# Sosyal Medya Entegrasyonu — Kurulum Kılavuzu

Bu paket, Faz 1 projesine **bozulmayan (non-breaking)** şekilde gerçek platform API'lerini ekler.

## Değişen / Eklenenler
| Dosya | Durum |
|---|---|
| `worker/src/index.js` | Güncellendi — render bölümü **değişmedi**, yalnızca publish işçisi entegre oldu |
| `worker/src/publishers/` | Yeni — 5 platform (facebook, instagram, tiktok, linkedin, x) |
| `worker/src/tokenStore.js` | Yeni — KMS/AES-GCM token kasası |
| `sql/social_accounts.sql` | Yeni — hesap/token tablosu |

## Çalışma Mantığı (bütünlük kuralı)
1. Platform için `TOKEN_<PLATFORM>` env'i veya DB'de şifreli token varsa → **gerçek API çağrısı**
2. Yoksa → Faz 1'in demo davranışı (aynı DB sonuç formatı: `{ok, postUrl}`)
3. Hata → throw → BullMQ retry/backoff (mimari değişmedi)
4. `results[p].ok` olan platform tekrar yayınlanmaz → **idempotent**, kaldığı yerden devam

## Kurulum

```bash
# 1. Tabloyu ekle
docker compose exec postgres psql -U sesvizyon -d sesvizyon -f /dev/stdin < sql/social_accounts.sql

# 2. Platform token'larını bağla (yöntem A: env — en hızlı test)
# docker-compose.yml api/worker servislerine ekle:
#   TOKEN_FACEBOOK=EAAB...       ACCOUNT_FACEBOOK=<page-id>
#   TOKEN_TIKTOK=act.xxx         (ACCOUNT gerekmez)
#   TOKEN_INSTAGRAM=EAAB...      ACCOUNT_INSTAGRAM=<ig-user-id>
#   TOKEN_LINKEDIN=AQXN...       ACCOUNT_LINKEDIN=person (veya organization:123)
#   TOKEN_X=AAAA...

docker compose up --build
```

Yöntem B (üretim): token'ı `tokenStore.seal()` ile şifreleyip `social_accounts` tablosuna yaz.

## Platform Gereksinimleri (gerçek hesapla test için)
| Platform | Geliştirici Adımı |
|---|---|
| Facebook | Meta App → Page access token (`pages_manage_posts`) |
| Instagram | Aynı Meta App, IG Business hesabı FB sayfasına bağlı (`instagram_content_publish`) |
| TikTok | Developer Portal → Content Posting API erişimi (`video.publish`) |
| LinkedIn | App → `w_member_social` veya `w_organization_social` |
| X | Developer Portal → Elevated access, OAuth 2.0 (`tweet.write`, `media.write`) |

**Not:** Tüm platformlar videoyu **herkese açık URL'den** çeker (pull_from_url). MinIO'nun `localhost` URL'i dışarıdan erişilemez → gerçek testte S3 bucket'ı + CloudFront veya geçici public tunnel (ngrok) gerekir.

## Üretimde (Faz 2)
- `KMS_KEY_ARN` verildiğinde token şifreleme otomatik AWS KMS'e geçer (terraform'daki `token_vault` anahtarı)
- Token yenileme: `expires_at` yaklaşınca refresh worker tetiklenir (Faz 2 backlog)
- 200 MB üstü videolar için X tarafında chunked upload zaten uygulanmış durumda; Facebook/IG `file_url` sınırına takılırsa multipart upload'a geçiş Faz 3
