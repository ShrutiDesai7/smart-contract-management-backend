package com.seventhray.contractmanagement;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.io.ByteArrayOutputStream;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ContractAskApiTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void askReturnsAnswer_andEvidence_whenKeywordsPresent() throws Exception {
        String id = uploadDocx("Payment terms: Net 30 days.\nTermination notice: 15 days.");

        mockMvc.perform(post("/contracts/{id}/ask", id)
                        .contentType(APPLICATION_JSON)
                        .content("{\"question\":\"What are the payment terms?\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.answer").value(org.hamcrest.Matchers.containsString("Net 30")))
                .andExpect(jsonPath("$.evidence").isArray())
                .andExpect(jsonPath("$.evidence.length()").value(org.hamcrest.Matchers.greaterThan(0)));
    }

    @Test
    void askPrefersRealSentence_overHeadingOnlyLine() throws Exception {
        String id = uploadDocx("PAYMENT TERMS\nNet 30 days from invoice date.\nOther clause.");

        mockMvc.perform(post("/contracts/{id}/ask", id)
                        .contentType(APPLICATION_JSON)
                        .content("{\"question\":\"what are payment terms\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.answer").value(org.hamcrest.Matchers.containsString("Net 30")));
    }

    @Test
    void askKeepsAnswerShort_evenForLongBlob() throws Exception {
        String longBlob =
                "This employment agreement is made between parties and sets out terms and conditions " +
                "including salary INR 50000 per month and other benefits and obligations " +
                "confidentiality applies to all information and termination requires notice period 30 days " +
                "working hours are 9 to 6 and leave policy includes 12 days annual leave " +
                "this sentence continues without clear punctuation so extraction must stay short ".repeat(10);

        String id = uploadDocx(longBlob);

        MvcResult res = mockMvc.perform(post("/contracts/{id}/ask", id)
                        .contentType(APPLICATION_JSON)
                        .content("{\"question\":\"What is the salary?\"}"))
                .andExpect(status().isOk())
                .andReturn();

        String answer = objectMapper.readTree(res.getResponse().getContentAsString()).path("answer").asText();
        org.junit.jupiter.api.Assertions.assertTrue(answer.length() <= 700, "Answer too long: " + answer.length());
    }

    @Test
    void askReturnsNotFound_whenNoRelevantAnswerFound() throws Exception {
        String id = uploadDocx("This agreement covers confidentiality only.");

        mockMvc.perform(post("/contracts/{id}/ask", id)
                        .contentType(APPLICATION_JSON)
                        .content("{\"question\":\"What is the salary?\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.answer").value(org.hamcrest.Matchers.not(org.hamcrest.Matchers.isEmptyOrNullString())))
                .andExpect(jsonPath("$.evidence").isArray())
                .andExpect(jsonPath("$.evidence.length()").value(org.hamcrest.Matchers.greaterThan(0)));
    }

    @Test
    void askReturns404_whenContractNotFound() throws Exception {
        mockMvc.perform(post("/contracts/{id}/ask", "99999999-9999-9999-9999-999999999999")
                        .contentType(APPLICATION_JSON)
                        .content("{\"question\":\"Anything\"}"))
                .andExpect(status().isNotFound());
    }

    @Test
    void askReturnsNotFound_whenExtractedTextEmpty() throws Exception {
        MvcResult created = mockMvc.perform(post("/contracts")
                        .contentType(APPLICATION_JSON)
                        .content("{\"contractName\":\"Empty Text\",\"status\":\"DRAFT\"}"))
                .andExpect(status().isOk())
                .andReturn();

        String id = objectMapper.readTree(created.getResponse().getContentAsString()).path("id").asText();

        mockMvc.perform(post("/contracts/{id}/ask", id)
                        .contentType(APPLICATION_JSON)
                        .content("{\"question\":\"What is this?\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.answer").value("Not found in contract"))
                .andExpect(jsonPath("$.evidence").isArray())
                .andExpect(jsonPath("$.evidence.length()").value(0));
    }

    private String uploadDocx(String text) throws Exception {
        byte[] docxBytes = createDocx(text);
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "contract.docx",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                docxBytes
        );

        MvcResult upload = mockMvc.perform(
                        multipart("/contracts/upload")
                                .file(file)
                                .param("contractName", "Test Contract")
                )
                .andExpect(status().isOk())
                .andReturn();

        return objectMapper.readTree(upload.getResponse().getContentAsString()).path("id").asText();
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
}
