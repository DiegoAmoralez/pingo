#!/usr/bin/env bash
set -euo pipefail

# Daily PostgreSQL backup. Intended for cron:
#   0 3 * * * /opt/pingo/scripts/backup-postgres.sh
#
# Optional S3 upload:
#   AWS_S3_BUCKET=my-bucket AWS_REGION=eu-central-1 ./scripts/backup-postgres.sh

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="$BACKUP_DIR/pingo-$TIMESTAMP.sql.gz"

mkdir -p "$BACKUP_DIR"

if [[ -n "${DATABASE_URL:-}" ]]; then
  pg_dump "$DATABASE_URL" | gzip > "$FILE"
elif command -v docker >/dev/null 2>&1; then
  CONTAINER="${POSTGRES_CONTAINER:-$(docker compose -f "$ROOT_DIR/docker-compose.prod.yml" ps -q postgres)}"
  docker exec -t "$CONTAINER" pg_dump -U "${POSTGRES_USER:-pingo}" "${POSTGRES_DB:-pingo}" | gzip > "$FILE"
else
  echo "Set DATABASE_URL or run inside an environment with Docker." >&2
  exit 1
fi

echo "Wrote $FILE"

if [[ -n "${AWS_S3_BUCKET:-}" ]]; then
  aws s3 cp "$FILE" "s3://${AWS_S3_BUCKET}/pingo/${TIMESTAMP}.sql.gz"
  echo "Uploaded to s3://${AWS_S3_BUCKET}/pingo/${TIMESTAMP}.sql.gz"
fi

find "$BACKUP_DIR" -name 'pingo-*.sql.gz' -mtime "+$RETENTION_DAYS" -delete
