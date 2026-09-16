# SesVizyon — Kendi Sunucunda Üretim (On-Premise)

AWS'siz, tamamen kendi donanımınızda çalışan sürüm. Tüm servisler (Postgres, Redis, MinIO, API, Worker, Panel, İzleme) tek `docker compose` ile ayağa kalkar.

## Kurulum (10 dakika)

```bash
# 1. Sunucuya kopyala
scp sesvizyon-onprem.zip root@SUNUCU:/opt/ && ssh root@SUNUCU
cd /opt && unzip sesvizyon-onprem.zip -d sesvizyon && cd sesvizyon

# 2. Ayarları gir
cp .env.example .env && nano .env
# DOMAIN: gerçek domain (TLS otomatik — Let's Encrypt, 80/443 açık olmalı)
# DB_PASS, JWT_SECRET, S3_SECRET: güçlü değerler (openssl rand -base64 48)

# 3. SQL şemasını işle (ilk kurulumda bir kez)
docker compose -f docker-compose.prod.yml up -d postgres redis minio minio-init
docker compose -f docker-compose.prod.yml exec -T postgres psql -U sesvizyon sesvizyon < sql/social_accounts.sql

# 4. Her şeyi başlat
docker compose -f docker-compose.prod.yml up -d --build

# 5. Yedek cron'u
echo "0 3 * * * cd /opt/sesvizyon && docker compose -f docker-compose.prod.yml --profile backup run --rm backup" | crontab -
```

## Erişim
| Servis | Adres |
|---|---|
| Panel | `https://DOMAIN` |
| API | `https://api.DOMAIN` |
| Video dosyaları (platformların çektiği) | `https://media.DOMAIN/...` |
| Grafana (yerel ağdan) | `https://grafana.DOMAIN` |
| MinIO konsolu | `ssh -L 9001:localhost:9001 root@SUNUCU` → localhost:9001 |

## Donanım Boyutlandırma (kendi sunucun için)

| Kullanıcı Ölçeği | Sunucu | worker replikası |
|---|---|---|
| 0 – 50K | 8 vCPU / 32GB / 500GB NVMe | 2 |
| 50K – 200K | 16 vCPU / 64GB / 2TB NVMe | 4 |
| 200K – 500K | 32 vCPU / 128GB / 4TB NVMe + GPU (RTX A4000) | 8 |
| 500K – 1M | **k3s kümesi** (3+ sunucu) — aşağıya bak | 16+ |

**Ölçekleme tek komut:** `docker compose up -d --scale worker=8 --scale api=6`

1M kullanıcıya tek sunucuyla devam etmek isterseniz: NVMe şart, ayrıca `k3s` yoluna geçin (aşağıda).

## 1M Hedefi İçin k3s Yol Haritası (kendi sunucu çiftliği)

```
[edge]  1 sunucu: Caddy + Grafana          (4 vCPU / 8GB)
[data]  1 sunucu: Postgres + Redis + MinIO (16 vCPU / 64GB / büyük disk)
[compute] 2-3 sunucu: API pod'ları         (8 vCPU / 32GB her biri)
[render]  1-2 sunucu: worker pod'ları      (32 vCPU + NVIDIA GPU)
```
1. `curl -sfL https://get.k3s.io | sh -` (edge sunucusunda server, diğerlerinde agent)
2. Faz 2 zip'indeki `k8s/*.yaml` manifest'leri aynen kullanılır — sadece secret'lardaki endpoint'leri kendi sunucu IP'lerine çevir
3. AWS'e özel parçalar on-prem karşılığı: S3→MinIO, RDS→yerel Postgres, KMS→`tokenStore.js` AES-GCM (zaten dev modda çalışıyor)

## Güvenlik (on-prem notlar)
- Dışarıya yalnızca Caddy açık (80/443); Postgres/Redis/MinIO internal ağda
- Caddy otomatik TLS + HSTS + CSP + rate-limit başlıkları sağlar
- Sosyal medya token'ları `tokenStore.js` ile AES-256-GCM şifreli (KMS yoksa dev anahtarı — üretimde anahtarı `.env`'den değil, sunucudaki korumalı dosyadan okutun)
- Yedekler `/opt/sesvizyon/backups/` — sunucu dışına kopyalayın (rsync/rsnapshot)

## Sık Karşılaşılanlar
- **Platformlar videoyu çekemiyor:** `PUBLIC_BASE_URL` değeri `https://media.DOMAIN` olmalı ve media subdomain DNS'i sunucuyu göstermeli
- **TLS alınamıyor:** 80/443 açık mı, DNS A kaydı doğru mu kontrol et (Caddy log: `docker compose logs caddy`)
- **Render yavaş:** CPU'da FFmpeg; GPU sunucusunda `--gpus all` + worker imajına CUDA FFmpeg — Faz 3 konusu
