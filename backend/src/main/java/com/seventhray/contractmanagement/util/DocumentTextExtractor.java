package com.seventhray.contractmanagement.util;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;

@Component
public class DocumentTextExtractor {

    public String extractText(Path file, FileType fileType) {
        try (InputStream in = Files.newInputStream(file)) {
            return extractText(in, fileType);
        } catch (IOException e) {
            throw new RuntimeException("Failed to read file for extraction", e);
        }
    }

    public String extractText(InputStream in, FileType fileType) {
        try {
            return switch (fileType) {
                case PDF -> extractPdf(in);
                case DOCX -> extractDocx(in);
            };
        } catch (IOException e) {
            throw new RuntimeException("Failed to extract text", e);
        }
    }

    private String extractPdf(InputStream in) throws IOException {
        try (PDDocument document = Loader.loadPDF(in.readAllBytes())) {
            PDFTextStripper stripper = new PDFTextStripper();
            return stripper.getText(document);
        }
    }

    private String extractDocx(InputStream in) throws IOException {
        try (XWPFDocument document = new XWPFDocument(in);
             XWPFWordExtractor extractor = new XWPFWordExtractor(document)) {
            return extractor.getText();
        }
    }
}
