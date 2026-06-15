package com.seventhray.contractmanagement.util;

import java.nio.file.Path;

public record StoredFile(
        String originalFileName,
        String storedFileName,
        String contentType,
        long sizeBytes,
        Path absolutePath
) {
}

