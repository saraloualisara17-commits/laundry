# Migration: Local Disk Uploads → Cloudflare R2

Use this when local disk storage becomes painful (slow backups, approaching 50–100 GB,
or planning a second app server). **Don't migrate before you need to** — local disk is
fine for the first 6–12 months.

## Why Cloudflare R2

- **$0/mo egress** (critical for image-heavy apps — AWS S3 charges $0.09/GB)
- **$0.015/GB storage** (~$1.50/mo for 100 GB)
- **S3-compatible API** — works with the AWS SDK, `aws-cli`, `rclone`, `s3cmd`
- **Free tier**: 10 GB storage + 1M Class A ops/mo + 10M Class B ops/mo
- Cloudflare CDN auto-attached for global delivery

## Prerequisites

1. **Cloudflare account** with R2 enabled (one-time signup at dash.cloudflare.com)
2. **R2 bucket created**: e.g. `laundry-uploads`
3. **R2 API token** with `Object Read & Write` permissions
4. **`rclone` installed on the VPS**:
   ```bash
   curl https://rclone.org/install.sh | sudo bash
   ```
5. **App is stopped** during the cutover (otherwise new uploads land on disk and get missed)

---

## Phase 1 — Sync existing files (app keeps running)

This phase can run while the app is live. It copies all current uploads to R2
without removing anything from disk. You'll do this first to verify everything works.

### 1.1 Configure rclone

```bash
rclone config
```

Choose:
- `n` for new remote
- name: `r2`
- Storage: `Cloudflare R2` (option number varies, search "R2")
- `access_key_id`: from your R2 API token
- `secret_access_key`: from your R2 API token
- `endpoint`: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`
- region: `auto`
- Leave the rest default

### 1.2 First sync (read-only — does not delete from disk)

```bash
# Dry-run first to see what would happen
rclone sync /app/uploads r2:laundry-uploads --progress --dry-run

# If it looks correct, run for real
rclone sync /app/uploads r2:laundry-uploads --progress \
    --transfers 16 \
    --checkers 32 \
    --fast-list
```

On a 4 GB VPS with 50 GB of uploads on residential bandwidth, expect ~30–60 minutes.

### 1.3 Verify

```bash
# Count files on both sides — must match
find /app/uploads -type f | wc -l
rclone size r2:laundry-uploads
```

Spot-check that a few images load correctly via R2 — using a temporary public URL
or `rclone link`:
```bash
rclone link r2:laundry-uploads/2026/06/SOME_UUID.webp
```

---

## Phase 2 — Make the bucket publicly readable

R2 buckets are private by default. To serve images directly to browsers/mobile,
expose them through a custom domain (recommended) or a public bucket URL.

### Option A — Custom domain (recommended)

In the Cloudflare dashboard:
1. **R2 → your bucket → Settings → Custom Domains → Connect Domain**
2. Use a subdomain like `images.yourdomain.com`
3. Cloudflare auto-provisions TLS and CDN

Your image URLs become: `https://images.yourdomain.com/2026/06/uuid.webp`

### Option B — Public bucket URL

R2 → Settings → Public Access → Allow Public Access. URLs become:
`https://pub-<HASH>.r2.dev/2026/06/uuid.webp`

Works fine but exposes Cloudflare's R2 host name to clients.

---

## Phase 3 — Switch the app to read from R2

The app currently stores `imageUrl = "2026/06/uuid.webp"` in the database and the
frontend builds the URL as `/uploads/2026/06/uuid.webp`. To switch:

### 3.1 Add a base URL property

In `application-prod.properties`:
```properties
app.uploads.public-base-url=https://images.yourdomain.com
```

In dev, leave it pointing to the local handler:
```properties
app.uploads.public-base-url=/uploads
```

### 3.2 Inject it where URLs are returned to the frontend

Any service that returns image URLs (e.g. `OrderImageDTO` mapping, `UploadController`)
should prefix the stored relative path with this base URL.

Example in `UploadController`:
```java
@Value("${app.uploads.public-base-url:/uploads}")
private String publicBaseUrl;

// then:
return ResponseEntity.ok(Map.of("imageUrl", publicBaseUrl + "/" + fileName));
```

### 3.3 Switch FileStorageService to write to R2

Replace the local-disk `Files.copy()` with the AWS S3 SDK pointing at R2. The
S3 SDK is S3-compatible with R2 — just override the endpoint URL.

Add to `pom.xml`:
```xml
<dependency>
    <groupId>software.amazon.awssdk</groupId>
    <artifactId>s3</artifactId>
    <version>2.28.16</version>
</dependency>
```

Then `FileStorageService.storeFile()` does:
```java
s3Client.putObject(
    PutObjectRequest.builder()
        .bucket("laundry-uploads")
        .key(datePath + "/" + fileName)
        .contentType(contentType)
        .build(),
    RequestBody.fromInputStream(bis, file.getSize())
);
```

Thumbnail logic stays the same — just write the thumbnail bytes to R2 with a
`PutObjectRequest` instead of `Files.write()`.

---

## Phase 4 — Final cutover sync

Once the new code is deployed and verified:

```bash
# Stop the app to freeze new uploads
sudo systemctl stop laundry

# Final sync to catch anything written since Phase 1
rclone sync /app/uploads r2:laundry-uploads --progress --transfers 16

# Verify count matches
find /app/uploads -type f | wc -l
rclone size r2:laundry-uploads

# Start the app
sudo systemctl start laundry
```

After 1–2 weeks of confirmed successful R2 operation, you can archive and remove
the local `/app/uploads` directory:

```bash
# Archive locally just in case
sudo tar -czf /opt/laundry/uploads-pre-r2-archive.tar.gz /app/uploads

# Then delete
sudo rm -rf /app/uploads
```

---

## Rollback plan

If something goes wrong after cutover:
1. `sudo systemctl stop laundry`
2. Revert the application JAR to the version that reads from local disk
3. The local `/app/uploads` directory is still intact (you only deleted it
   in the very last step) — restart and you're back to the prior state
4. Investigate and retry the migration

The migration is **non-destructive** until the final `rm -rf /app/uploads`.
Don't run that step until you have at least a week of zero-issue R2 operation.

---

## Cost estimate

For a Moroccan laundry running ~100 orders/day with ~7 photos/order at 150 KB each:

| Year | Storage on R2 | Monthly cost |
|---|---|---|
| 1 | ~38 GB | **$0.57/mo** |
| 2 | ~77 GB | **$1.16/mo** |
| 3 | ~115 GB | **$1.73/mo** |

Egress is free — even if mobile users download 10 TB/mo (they won't), the cost is $0.
Class A operations (uploads): ~2,100 ops/day = 63K/mo → free tier covers it.
Class B operations (reads): ~50K/day = 1.5M/mo → free tier covers it.

Compare to local disk: a VPS upgrade from 80 GB → 160 GB SSD typically costs
+$5/mo, plus you keep paying for backup space and bandwidth.
