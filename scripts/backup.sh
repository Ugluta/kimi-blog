#!/bin/sh
# SesVizyon yedekleme: Postgres dump + MinIO medya snapshot
# Çalıştırma: docker compose --profile backup run backup
# Ya da sunucuda cron: 0 3 * * * cd /opt/sesvizyon && docker compose --profile backup run --rm backup

set -e
TS=$(date +%Y%m%d-%H%M)
BACKUP_DIR="/backups/$TS"
mkdir -p "$BACKUP_DIR"

echo "[backup] Postgres dump..."
PGPASSWORD="$DB_PASS" pg_dump -h postgres -U sesvizyon sesvizyon \
  | gzip > "$BACKUP_DIR/db.sql.gz"

echo "[backup] MinIO medya snapshot..."
mc alias set local http://minio:9000 "$S3_ACCESS" "$S3_SECRET"
mc mirror --overwrite local/sesvizyon-media "$BACKUP_DIR/media"

# 14 günden eski yedekleri sil
find /backups -maxdepth 1 -type d -mtime +14 -exec rm -rf {} + 2>/dev/null || true

echo "[backup] tamam: $BACKUP_DIR"
