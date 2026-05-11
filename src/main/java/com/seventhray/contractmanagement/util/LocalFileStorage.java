package com.seventhray.contractmanagement.util;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Component
public class LocalFileStorage {

    private final Path uploadRoot;

    public LocalFileStorage(@Value("${app.upload-dir:uploads}") String uploadDir) {
        this.uploadRoot = Paths.get(uploadDir).toAbsolutePath().normalize();
    }

    public StoredFile store(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is required");
        }

        String originalFileName = sanitize(file.getOriginalFilename());
        String storedFileName = UUID.randomUUID() + "-" + originalFileName;

        try {
            Files.createDirectories(uploadRoot);
            Path target = uploadRoot.resolve(storedFileName).normalize();
            if (!target.startsWith(uploadRoot)) {
                throw new IllegalArgumentException("Invalid file path");
            }

            try (InputStream in = file.getInputStream()) {
                Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
            }

            return new StoredFile(
                    originalFileName,
                    storedFileName,
                    file.getContentType(),
                    file.getSize(),
                    target
            );
        } catch (IOException e) {
            throw new RuntimeException("Failed to store file", e);
        }
    }

    private String sanitize(String name) {
        if (name == null || name.isBlank()) {
            return "uploaded-file";
        }
        String cleaned = name.replace("\\", "/");
        int lastSlash = cleaned.lastIndexOf('/');
        if (lastSlash >= 0) {
            cleaned = cleaned.substring(lastSlash + 1);
        }
        cleaned = cleaned.replaceAll("[^a-zA-Z0-9._-]", "_");
        if (cleaned.isBlank()) {
            return "uploaded-file";
        }
        return cleaned;
    }
}

