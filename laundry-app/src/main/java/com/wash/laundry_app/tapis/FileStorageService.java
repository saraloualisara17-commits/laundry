package com.wash.laundry_app.tapis;

import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import java.io.BufferedInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
public class FileStorageService {

    private final Path fileStorageLocation;

    public FileStorageService() {
        this.fileStorageLocation = Paths.get("uploads").toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.fileStorageLocation);
        } catch (Exception ex) {
            throw new RuntimeException("Could not create the directory where the uploaded files will be stored.", ex);
        }
    }

    private static final java.util.Set<String> ALLOWED_TYPES = java.util.Set.of(
            "image/jpeg", "image/png", "image/webp", "image/gif"
    );

    public String storeFile(MultipartFile file) {
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_TYPES.contains(contentType)) {
            throw new FileStorageException("Type de fichier non autorisé. Seules les images sont acceptées.");
        }
        
        try (BufferedInputStream bis = new BufferedInputStream(file.getInputStream())) {
            bis.mark(16);
            byte[] header = new byte[12];
            bis.read(header);
            
            String extension = getImageExtension(header);
            if (extension == null) {
                throw new FileStorageException("Contenu du fichier non valide. L'extension ou le type MIME semble falsifié.");
            }
            bis.reset(); // Rewind the stream after validation

            String fileName = UUID.randomUUID().toString() + extension;

            Path targetLocation = this.fileStorageLocation.resolve(fileName);
            Files.copy(bis, targetLocation, StandardCopyOption.REPLACE_EXISTING);

            return fileName;
        } catch (IOException ex) {
            // Do not log the arbitrary original filename in the exception message for safety
            throw new FileStorageException("Could not store file. Please try again!");
        }
    }

    private String getImageExtension(byte[] header) {
        if (header.length < 12) return null;
        
        // JPEG (FF D8 FF)
        if ((header[0] & 0xFF) == 0xFF && (header[1] & 0xFF) == 0xD8 && (header[2] & 0xFF) == 0xFF) return ".jpg";
        // PNG (89 50 4E 47)
        if ((header[0] & 0xFF) == 0x89 && (header[1] & 0xFF) == 0x50 && (header[2] & 0xFF) == 0x4E && (header[3] & 0xFF) == 0x47) return ".png";
        // GIF (GIF8)
        if (header[0] == 'G' && header[1] == 'I' && header[2] == 'F' && header[3] == '8') return ".gif";
        // WebP (RIFF .... WEBP)
        if (header[0] == 'R' && header[1] == 'I' && header[2] == 'F' && header[3] == 'F' &&
            header[8] == 'W' && header[9] == 'E' && header[10] == 'B' && header[11] == 'P') return ".webp";
            
        return null;
    }
}
