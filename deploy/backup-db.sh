#!/usr/bin/env bash
# backup-db.sh — Full MySQL dump of the laundry_prod database
#
# Schedule with cron (daily at 02:00):
#   0 2 * * * /opt/laundry/deploy/backup-db.sh >> /var/log/laundry-backup.log 2>&1
#
# Requirements:
#   - MySQL client tools installed (mysqldump)
#   - ~/.my.cnf or environment variables set for authentication
#   - BACKUP_DIR writable by the user running this script

set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────
DB_NAME="laundry_prod"
DB_USER="laundry_app"
DB_HOST="127.0.0.1"
DB_PORT="3306"
BACKUP_DIR="/opt/laundry/backups/db"
RETENTION_DAYS=30

# Read password from env file so it never appears in process list
if [[ -f /opt/laundry/laundry.env ]]; then
    # shellcheck disable=SC1091
    source /opt/laundry/laundry.env
fi
DB_PASS="${SPRING_DATASOURCE_PASSWORD:-}"

if [[ -z "$DB_PASS" ]]; then
    echo "[$(date -Iseconds)] ERROR: SPRING_DATASOURCE_PASSWORD is not set" >&2
    exit 1
fi

# ── Backup ────────────────────────────────────────────────────────────────
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql.gz"

echo "[$(date -Iseconds)] Starting database backup → $BACKUP_FILE"

MYSQL_PWD="$DB_PASS" mysqldump \
    --host="$DB_HOST" \
    --port="$DB_PORT" \
    --user="$DB_USER" \
    --single-transaction \
    --routines \
    --triggers \
    --set-gtid-purged=OFF \
    "$DB_NAME" | gzip -9 > "$BACKUP_FILE"

echo "[$(date -Iseconds)] Backup complete. Size: $(du -sh "$BACKUP_FILE" | cut -f1)"

# ── Retention ─────────────────────────────────────────────────────────────
echo "[$(date -Iseconds)] Removing backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -mtime +$RETENTION_DAYS -delete
echo "[$(date -Iseconds)] Retention cleanup done."
