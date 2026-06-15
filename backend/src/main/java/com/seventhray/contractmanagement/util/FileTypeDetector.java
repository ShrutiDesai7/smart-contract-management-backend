package com.seventhray.contractmanagement.util;

import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.util.Locale;

@Component
public class FileTypeDetector {

    public FileType detect(MultipartFile file) {
        String name = file == null ? null : file.getOriginalFilename();
        if (name == null) {
            throw new IllegalArgumentException("File name is required");
        }

        String lower = name.toLowerCase(Locale.ROOT).trim();
        if (lower.endsWith(".pdf")) {
            return FileType.PDF;
        }
        if (lower.endsWith(".docx")) {
            return FileType.DOCX;
        }
        throw new IllegalArgumentException("Only PDF and DOCX files are allowed");
    }
}

