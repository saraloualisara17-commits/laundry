package com.wash.laundry_app.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.FileImageOutputStream;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.BufferedInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

@Service
public class FileStorageService {

    private static final java.util.Set<String> ALLOWED_TYPES = java.util.Set.of(
            "image/jpeg", "image/png", "image/webp", "image/gif"
    );

    // ── Thumbnail parameters ─────────────────────────────────────────────────
    // 200 px wide / quality 0.65 → ~10–18 KB JPEG. Used only by the gallery
    // grid view that shows many orders at once. Originals are never modified.
    private static final int THUMB_MAX_WIDTH = 200;
    private static final float THUMB_QUALITY = 0.65f;
    private static final String THUMB_SUFFIX = "_thumb.jpg";

    private final Path fileStorageLocation;

    public FileStorageService(@Value("${file.upload-dir:./uploads}") String uploadDir) {
        this.fileStorageLocation = Paths.get(uploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.fileStorageLocation);
        } catch (Exception ex) {
            throw new RuntimeException("Could not create the directory where the uploaded files will be stored.", ex);
        }
    }

    /**
     * Stores an uploaded image and a 200 px thumbnail next to it.
     *
     * Layout (date-partitioned by upload day):
     *   uploads/2026/06/{uuid}.webp        ← original, untouched
     *   uploads/2026/06/{uuid}_thumb.jpg   ← 200 px JPEG for gallery grids
     *
     * Returns the relative path of the original (e.g. "2026/06/uuid.webp")
     * so callers can build "/uploads/{returned}" URLs.
     *
     * Date partitioning keeps any single directory under a few thousand files,
     * which speeds up filesystem operations (ls, du, tar) once volume grows.
     */
    public String storeFile(MultipartFile file) {
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_TYPES.contains(contentType)) {
            throw new RuntimeException("Type de fichier non autorisé. Seules les images sont acceptées.");
        }

        try (BufferedInputStream bis = new BufferedInputStream(file.getInputStream())) {
            bis.mark(16);
            byte[] header = new byte[12];
            bis.read(header);

            String extension = getImageExtension(header);
            if (extension == null) {
                throw new RuntimeException("Contenu du fichier non valide. L'extension ou le type MIME semble falsifié.");
            }
            bis.reset();

            // ── Build date-partitioned path ──────────────────────────────────
            String datePath = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy/MM"));
            Path dateDir = this.fileStorageLocation.resolve(datePath);
            Files.createDirectories(dateDir);

            String uuid = UUID.randomUUID().toString();
            String fileName = uuid + extension;
            Path originalPath = dateDir.resolve(fileName);

            // ── Save original (bytes copied verbatim — never modified) ──────
            Files.copy(bis, originalPath, StandardCopyOption.REPLACE_EXISTING);

            // ── Generate thumbnail (best-effort; never blocks the upload) ───
            try {
                generateThumbnail(originalPath, dateDir.resolve(uuid + THUMB_SUFFIX));
            } catch (Exception thumbErr) {
                // Thumbnail failure is non-fatal — the original is already saved
                // and clients fall back to the full image if thumb 404s.
                // (Frontend should treat _thumb.jpg as optional, not required.)
            }

            // Return path relative to upload root, with forward slashes for URL use
            return datePath + "/" + fileName;
        } catch (IOException ex) {
            throw new RuntimeException("Could not store file. Please try again!");
        }
    }

    /**
     * Resizes the original to THUMB_MAX_WIDTH preserving aspect ratio, then
     * writes a JPEG at THUMB_QUALITY. JPEG is used (not WebP) because the JDK
     * can encode JPEG natively without any extra dependency or native lib.
     */
    private void generateThumbnail(Path source, Path target) throws IOException {
        BufferedImage src;
        try (InputStream in = Files.newInputStream(source)) {
            src = ImageIO.read(in);
        }
        if (src == null) return; // unsupported format (e.g. WebP without optional reader) — skip silently

        int srcW = src.getWidth();
        int srcH = src.getHeight();
        if (srcW <= 0 || srcH <= 0) return;

        // Preserve aspect ratio; never upscale
        int targetW = Math.min(THUMB_MAX_WIDTH, srcW);
        int targetH = (int) Math.round(srcH * (targetW / (double) srcW));

        // Flatten to RGB so JPEG encoder doesn't choke on alpha channels (PNG/WebP)
        BufferedImage scaled = new BufferedImage(targetW, targetH, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = scaled.createGraphics();
        try {
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            g.drawImage(src, 0, 0, targetW, targetH, null);
        } finally {
            g.dispose();
        }

        // Write JPEG with explicit quality (ImageIO.write defaults to ~0.75)
        ImageWriter writer = ImageIO.getImageWritersByFormatName("jpeg").next();
        try (FileImageOutputStream out = new FileImageOutputStream(target.toFile())) {
            writer.setOutput(out);
            ImageWriteParam params = writer.getDefaultWriteParam();
            params.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
            params.setCompressionQuality(THUMB_QUALITY);
            writer.write(null, new IIOImage(scaled, null, null), params);
        } finally {
            writer.dispose();
        }
    }

    private String getImageExtension(byte[] header) {
        if (header.length < 12) return null;
        if ((header[0] & 0xFF) == 0xFF && (header[1] & 0xFF) == 0xD8 && (header[2] & 0xFF) == 0xFF) return ".jpg";
        if ((header[0] & 0xFF) == 0x89 && (header[1] & 0xFF) == 0x50 && (header[2] & 0xFF) == 0x4E && (header[3] & 0xFF) == 0x47) return ".png";
        if (header[0] == 'G' && header[1] == 'I' && header[2] == 'F' && header[3] == '8') return ".gif";
        if (header[0] == 'R' && header[1] == 'I' && header[2] == 'F' && header[3] == 'F' &&
            header[8] == 'W' && header[9] == 'E' && header[10] == 'B' && header[11] == 'P') return ".webp";
        return null;
    }
}
