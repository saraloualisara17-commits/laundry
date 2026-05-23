package com.wash.laundry_app.config;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/upload")
@RequiredArgsConstructor
public class UploadController {

    private final FileStorageService fileStorageService;

    @PostMapping("/multiple")
    public ResponseEntity<List<String>> uploadMultipleFiles(@RequestParam("files") MultipartFile[] files) {
        if (files.length > 10) {
            return ResponseEntity.badRequest().build();
        }
        
        List<String> fileNames = Arrays.stream(files)
                .map(fileStorageService::storeFile)
                .map(name -> "/uploads/" + name)
                .collect(Collectors.toList());
        
        return ResponseEntity.ok(fileNames);
    }

    @PostMapping("/single")
    public ResponseEntity<Map<String, String>> uploadSingleFile(@RequestParam("file") MultipartFile file) {
        String fileName = fileStorageService.storeFile(file);
        return ResponseEntity.ok(Map.of("imageUrl", "/uploads/" + fileName));
    }
}
