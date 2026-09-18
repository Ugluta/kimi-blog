#!/bin/sh
set -e
TS=$(date +%Y%m%d-%H%M 2>/dev/null || date +%Y%m%d-%H%M)
BACKUP_DIR="/backups/$TS"
mkdir -p "$BACKUP_DIR"

echo "[backup] Postgres dump..."
PGPASSWORD="$DB_PASS" pg_dump -h postgres -U sesvizyon sesvizyon | gzip > "$BACKUP_DIR/db.sql.gz"

echo "[backup] MinIO medya arsivi..."
tar czf "$BACKUP_DIR/media.tar.gz" -C /miniodata . 2>/dev/null || echo "[backup] media bos, atlandi"

find /backups -maxdepth 1 -type d -name "20*" -mtime +14 -exec rm -rf {} + 2>/dev/null || true
echo "[backup] tamam: $BACKUP_DIR"
