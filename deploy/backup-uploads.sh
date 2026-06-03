#!/usr/bin/env bash
# backup-uploads.sh — Archive the /app/uploads directory
#
# Schedule with cron (daily at 03:00, staggered from DB backup):
#   0 3 * * * /opt/laundry/deploy/backup-uploads.sh >> /var/log/laundry-backup.log 2>&1
#
# For large upload directories consider rsync to a remote storage instead.

set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────
UPLOADS_DIR="/app/uploads"
BACKUP_DIR="/opt/laundry/backups/uploads"
RETENTION_DAYS=14      # Shorter retention for potentially large binary files

# ── Backup ────────────────────────────────────────────────────────────────
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/uploads_${TIMESTAMP}.tar.gz"

echo "[$(date -Iseconds)] Starting uploads backup → $BACKUP_FILE"

tar -czf "$BACKUP_FILE" -C "$(dirname "$UPLOADS_DIR")" "$(basename "$UPLOADS_DIR")"

echo "[$(date -Iseconds)] Backup complete. Size: $(du -sh "$BACKUP_FILE" | cut -f1)"

# ── Retention ─────────────────────────────────────────────────────────────
echo "[$(date -Iseconds)] Removing upload backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "uploads_*.tar.gz" -mtime +$RETENTION_DAYS -delete
echo "[$(date -Iseconds)] Retention cleanup done."
