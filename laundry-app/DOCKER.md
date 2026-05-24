# Docker Deployment Guide

## First-time setup

```bash
# 1. Copy and fill in the environment file
cp .env.example .env
# Edit .env — set real passwords, JWT_SECRET, CORS_ALLOWED_ORIGINS

# 2. Build and start everything
docker compose up -d --build

# 3. Tail logs while the app starts (Flyway runs here, takes ~30-60s)
docker compose logs -f backend
```

The backend is ready when you see:
```
Started LaundryAppApplication in X.XXX seconds
```

## Daily operations

```bash
# Start (no rebuild)
docker compose up -d

# Stop (containers removed, volumes preserved)
docker compose down

# Rebuild after code changes
docker compose up -d --build backend

# View logs
docker compose logs -f backend
docker compose logs -f mysql

# Open a MySQL shell
docker exec -it laundry_mysql mysql -u laundry_user -p laundry-app
```

## Health check

```bash
# Container status (mysql should be "healthy" before backend starts)
docker compose ps

# API health endpoint
curl http://localhost:8080/actuator/health
```

Expected response:
```json
{"status":"UP"}
```

## Uploads persistence

Uploaded images are stored in the `uploads_data` Docker named volume, mounted at `/app/uploads` inside the container. They survive `docker compose down` and `docker compose up` cycles.

```bash
# Inspect the volume
docker volume inspect laundry-app_uploads_data

# Backup uploads to a local tar
docker run --rm \
  -v laundry-app_uploads_data:/data \
  -v $(pwd):/backup \
  busybox tar czf /backup/uploads-backup.tar.gz -C /data .
```

## Resetting the database

```bash
# WARNING: destroys all data
docker compose down -v
docker compose up -d --build
```

## Environment variables reference

| Variable | Required | Description |
|---|---|---|
| `MYSQL_ROOT_PASSWORD` | Yes | MySQL root password (healthcheck only) |
| `MYSQLDATABASE` | Yes | Database name (`laundry-app`) |
| `MYSQLUSER` | Yes | App DB user |
| `MYSQLPASSWORD` | Yes | App DB user password |
| `JWT_SECRET` | Yes | Base64 secret ≥32 bytes (`openssl rand -base64 32`) |
| `CORS_ALLOWED_ORIGINS` | Yes | Comma-separated allowed origins, no trailing slash |
| `SEED_ADMIN_EMAIL` | Optional | First-run admin email; leave blank after first start |
| `SEED_ADMIN_PASSWORD` | Optional | First-run admin password |
| `SEED_ADMIN_NAME` | Optional | First-run admin display name |

## Production checklist

- [ ] `.env` is NOT committed to git
- [ ] `JWT_SECRET` is a fresh random value (not from `.env.example`)
- [ ] `CORS_ALLOWED_ORIGINS` is your real domain, not `localhost`
- [ ] `SEED_ADMIN_*` vars are cleared after first deployment
- [ ] Port `3306` is NOT exposed publicly (remove or firewall it)
- [ ] Uploads volume is included in your backup routine
