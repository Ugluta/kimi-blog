# SesVizyon — Faz 1 Geliştirme Ortamı

1 milyon kullanıcı mimarisinin **Faz 1** (0–100K kullanıcı) çalışan hali.
Ağır iş (ses→video render + sosyal medya yayını) API'den tamamen ayrık, **asenkron kuyruk hattı** üzerinden çalışır.

## Mimari Akış

```
Tarayıcı (panel :8080)
  → nginx (statik + /api proxy)
    → api :3000  (stateless, yalnızca iş KABUL eder → 202 Accepted)
      → Redis/BullMQ kuyruk
        → worker (FFmpeg render → S3/MinIO) → publish worker (5 platform)
          → PostgreSQL (durum takibi)
```

## Hızlı Başlangıç

```bash
cp .env.example .env          # JWT_SECRET'i değiştir!
docker compose up --build
```

| Arayüz | Adres |
|---|---|
| Yönetim paneli | http://localhost:8080 |
| REST API | http://localhost:3000 |
| MinIO konsolu (S3) | http://localhost:9001 (minioadmin / minioadmin123) |
| Sağlık kontrolü | http://localhost:3000/health |

**Ölçekleme testi:** `docker compose up --scale worker=8` — render kapasitesi 8 katına çıkar, API koduna dokunulmaz.

## API Örnekleri

```bash
# 1. Kayıt
curl -X POST localhost:3000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Deneme","email":"a@b.co","password":"parola123"}'

# 2. Ses yükle → 202 (iş kuyrukta)
curl -X POST localhost:3000/conversions \
  -H "Authorization: Bearer <TOKEN>" \
  -F "audio=@bolum42.mp3" -F "title=Bölüm 42" -F "theme=neon" -F "ratio=9:16"
# → {"id":"...","status":"queued"}

# 3. Durum sorgula (render bitince output_url gelir)
curl localhost:3000/conversions/<ID> -H "Authorization: Bearer <TOKEN>"

# 4. Sosyal medyaya otomatik gönder → 202
curl -X POST localhost:3000/conversions/<ID>/publish \
  -H "Authorization: Bearer <TOKEN>" \
  -H 'Content-Type: application/json' \
  -d '{"platforms":["tiktok","instagram","youtube"]}'

# 5. Yayın sonucu
curl localhost:3000/publish/<JOB_ID> -H "Authorization: Bearer <TOKEN>"
```

Varsayılan admin: `admin@sesvizyon.local` / `Admin1234!` (`ADMIN_PASSWORD` ile değiştirilebilir)

## Güvenlik Notları
- helmet (CSP/HSTS), CORS, istek başına rate-limit (100/dk)
- Şifreler bcrypt(12), JWT 15 dk, dosya yüklemede MIME + boyut doğrulaması
- Sosyal medya token'ları Faz 2'de KMS şifreli kasada tutulacak (şu an simüle)

## Faz 2'ye Geçiş Noktaları (kodda işaretlendi)
1. `worker/src/index.js` → FFmpeg CPU yerine **GPU node pool** (NVIDIA T4/L4)
2. `api` monolith'i **servislere ayır** (auth / billing / cms / publisher)
3. Redis/BullMQ → **Kafka** (çok tüketicili olay akışı)
4. MinIO → S3 + **ClamAV karantina** hattı
5. nginx önüne **CDN + WAF** (Cloudflare)
