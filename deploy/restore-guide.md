# Disaster Recovery Guide — Laundry App

## Prerequisites

- SSH access to the VPS
- MySQL client tools installed
- Backup files available in `/opt/laundry/backups/`

---

## 1. Restore the Database

### Find the backup to restore
```bash
ls -lh /opt/laundry/backups/db/
```

### Stop the application (prevents writes during restore)
```bash
sudo systemctl stop laundry
```

### Drop and recreate the database
```bash
mysql -u root -p -e "DROP DATABASE IF EXISTS laundry_prod; CREATE DATABASE laundry_prod CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

### Restore from a backup file
```bash
# Replace the filename with the backup you want to restore
BACKUP_FILE="/opt/laundry/backups/db/laundry_prod_20250601_020000.sql.gz"

zcat "$BACKUP_FILE" | mysql -u root -p laundry_prod
```

### Re-grant permissions to the application user
```bash
mysql -u root -p -e "GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, DROP, INDEX, REFERENCES ON laundry_prod.* TO 'laundry_app'@'localhost'; FLUSH PRIVILEGES;"
```

### Restart the application
```bash
sudo systemctl start laundry
sudo systemctl status laundry
```

---

## 2. Restore Uploaded Files

### Find the backup to restore
```bash
ls -lh /opt/laundry/backups/uploads/
```

### Stop the application
```bash
sudo systemctl stop laundry
```

### Clear current uploads and restore
```bash
BACKUP_FILE="/opt/laundry/backups/uploads/uploads_20250601_030000.tar.gz"

sudo rm -rf /app/uploads
sudo tar -xzf "$BACKUP_FILE" -C /
sudo chown -R laundry:laundry /app/uploads
```

### Restart the application
```bash
sudo systemctl start laundry
```

---

## 3. Full Server Migration

If moving to a new VPS:

1. On the old server:
   ```bash
   /opt/laundry/deploy/backup-db.sh
   /opt/laundry/deploy/backup-uploads.sh
   ```

2. Transfer backups to new server:
   ```bash
   scp -r /opt/laundry/backups/ user@NEW_SERVER:/opt/laundry/backups/
   scp /opt/laundry/laundry-app.jar user@NEW_SERVER:/opt/laundry/
   ```

3. On the new server, run `deploy/mysql-setup.sql`, then follow sections 1 and 2 above.

4. Copy and fill in `/opt/laundry/laundry.env` (use the template from `deploy/laundry.env.template`).

5. Install the systemd service and Nginx config from `deploy/`.

6. Update DNS to point to the new server IP.

---

## 4. Verify Recovery

After restore, run the following health checks:

```bash
# Application health
curl -s http://localhost:8080/actuator/health | python3 -m json.tool

# Recent application logs
sudo journalctl -u laundry -n 100 --no-pager

# Database connectivity
mysql -u laundry_app -p laundry_prod -e "SELECT COUNT(*) as total_orders FROM commandes;"
```

Expected: health endpoint returns `{"status":"UP"}`.
