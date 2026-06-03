package com.seventhray.contractmanagement;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.io.ByteArrayOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ContractUploadApiTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    @Test
    void uploadDocx_createsContract_savesFile_andExtractsText() throws Exception {
        String expectedText = "Hello Contract";
        byte[] docxBytes = createDocx(expectedText);

        MockMultipartFile file = new MockMultipartFile(
                "file",
                "nda.docx",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                docxBytes
        );

        MvcResult upload = mockMvc.perform(
                        multipart("/contracts/upload")
                                .file(file)
                                .param("contractName", "NDA - ACME")
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").isString())
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.originalFileName").value("nda.docx"))
                .andReturn();

        String id = objectMapper.readTree(upload.getResponse().getContentAsString()).path("id").asText();

        MvcResult fetched = mockMvc.perform(get("/contracts/{id}", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.contractName").value("NDA - ACME"))
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.originalFileName").value("nda.docx"))
                .andExpect(jsonPath("$.filePath").isNotEmpty())
                .andExpect(jsonPath("$.extractedText").isNotEmpty())
                .andReturn();

        var fetchedJson = objectMapper.readTree(fetched.getResponse().getContentAsString());
        String filePath = fetchedJson.path("filePath").asText();
        assertThat(filePath).isNotBlank();
        assertThat(Files.exists(Path.of(filePath))).isTrue();

        String extractedText = fetchedJson.path("extractedText").asText();
        assertThat(extractedText).contains(expectedText);
    }

    @Test
    void uploadPdf_createsContract_andSavesFile() throws Exception {
        byte[] pdfBytes = createPdf("Sample PDF text");
        MockMultipartFile file = new MockMultipartFile("file", "contract.pdf", "application/pdf", pdfBytes);

        MvcResult upload = mockMvc.perform(
                        multipart("/contracts/upload")
                                .file(file)
                                .param("contractName", "PDF Contract")
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").isString())
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.originalFileName").value("contract.pdf"))
                .andReturn();

        String id = objectMapper.readTree(upload.getResponse().getContentAsString()).path("id").asText();

        MvcResult fetched = mockMvc.perform(get("/contracts/{id}", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.filePath").isNotEmpty())
                .andReturn();

        String filePath = objectMapper.readTree(fetched.getResponse().getContentAsString()).path("filePath").asText();
        assertThat(Files.exists(Path.of(filePath))).isTrue();
    }

    @Test
    void uploadRejectsUnsupportedFileType() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "notes.txt", MediaType.TEXT_PLAIN_VALUE, "hi".getBytes());

        mockMvc.perform(
                        multipart("/contracts/upload")
                                .file(file)
                                .param("contractName", "Bad File")
                )
                .andExpect(status().isBadRequest());
    }

    @Test
    void uploadRequiresContractName() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "contract.pdf", "application/pdf", createPdf("x"));

        mockMvc.perform(multipart("/contracts/upload").file(file))
                .andExpect(status().isBadRequest());
    }

    private static byte[] createDocx(String text) throws Exception {
        try (XWPFDocument doc = new XWPFDocument();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            XWPFParagraph p = doc.createParagraph();
            p.createRun().setText(text);
            doc.write(out);
            return out.toByteArray();
        }
    }

    private static byte[] createPdf(String text) throws Exception {
        try (PDDocument doc = new PDDocument();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDPage page = new PDPage();
            doc.addPage(page);
            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                cs.beginText();
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 12);
                cs.newLineAtOffset(50, 700);
                cs.showText(text);
                cs.endText();
            }
            doc.save(out);
            return out.toByteArray();
        }
    }

    // JSON parsing is handled via Jackson ObjectMapper to avoid Windows path escaping issues.
}
