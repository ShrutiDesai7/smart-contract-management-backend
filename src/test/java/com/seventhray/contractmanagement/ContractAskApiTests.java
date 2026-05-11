package com.seventhray.contractmanagement;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.io.ByteArrayOutputStream;
import java.util.List;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ContractAskApiTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private com.seventhray.contractmanagement.service.OpenAiAnswersService openAiAnswersService;

    @MockBean
    private com.seventhray.contractmanagement.service.OpenAiEmbeddingsService openAiEmbeddingsService;

    @Test
    void askReturnsMatchedAnswer_whenKeywordsPresent() throws Exception {
        when(openAiEmbeddingsService.embedOne(anyString())).thenReturn(new float[]{1f, 0f});
        // Embeddings: return 1 query vector + N chunk vectors.
        when(openAiEmbeddingsService.embedAll(org.mockito.ArgumentMatchers.anyList()))
                .thenAnswer(inv -> {
                    @SuppressWarnings("unchecked")
                    List<String> inputs = (List<String>) inv.getArgument(0);
                    java.util.ArrayList<float[]> v = new java.util.ArrayList<>();
                    for (int i = 0; i < inputs.size(); i++) v.add(new float[]{1f, 0f});
                    return v;
                });
        when(openAiAnswersService.answerFromSnippets(anyString(), anyList()))
                .thenReturn("Answer: Net 30 days.");
        long id = uploadDocx("Payment terms: Net 30 days.\nTermination notice: 15 days.");

        mockMvc.perform(post("/contracts/{id}/ask", id)
                        .contentType(APPLICATION_JSON)
                        .content("{\"question\":\"What are the payment terms?\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.matched").value(true))
                .andExpect(jsonPath("$.answer").value(org.hamcrest.Matchers.startsWith("Answer: ")));
    }

    @Test
    void askSkipsHeadingOnlyLine_andReturnsActualPaymentTermsSentence() throws Exception {
        when(openAiEmbeddingsService.embedOne(anyString())).thenReturn(new float[]{1f, 0f});
        when(openAiEmbeddingsService.embedAll(org.mockito.ArgumentMatchers.anyList()))
                .thenAnswer(inv -> {
                    @SuppressWarnings("unchecked")
                    List<String> inputs = (List<String>) inv.getArgument(0);
                    java.util.ArrayList<float[]> v = new java.util.ArrayList<>();
                    for (int i = 0; i < inputs.size(); i++) v.add(new float[]{1f, 0f});
                    return v;
                });
        when(openAiAnswersService.answerFromSnippets(anyString(), anyList()))
                .thenReturn("Answer: Net 30 days from invoice date.");
        long id = uploadDocx("PAYMENT TERMS\nNet 30 days from invoice date.\nOther clause.");

        mockMvc.perform(post("/contracts/{id}/ask", id)
                        .contentType(APPLICATION_JSON)
                        .content("{\"question\":\"what are payment terms\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.matched").value(true))
                .andExpect(jsonPath("$.answer").value(org.hamcrest.Matchers.containsString("Net 30")));
    }

    @Test
    void askDoesNotReturnEntireDocument_whenTextIsOneLongBlob() throws Exception {
        when(openAiEmbeddingsService.embedOne(anyString())).thenReturn(new float[]{1f, 0f});
        when(openAiEmbeddingsService.embedAll(org.mockito.ArgumentMatchers.anyList()))
                .thenAnswer(inv -> {
                    @SuppressWarnings("unchecked")
                    List<String> inputs = (List<String>) inv.getArgument(0);
                    java.util.ArrayList<float[]> v = new java.util.ArrayList<>();
                    // Make first vector the query; rest can be anything non-zero.
                    for (int i = 0; i < inputs.size(); i++) v.add(new float[]{1f, 0f});
                    return v;
                });
        when(openAiAnswersService.answerFromSnippets(anyString(), anyList()))
                .thenAnswer(inv -> {
                    @SuppressWarnings("unchecked")
                    List<String> snippets = (List<String>) inv.getArgument(1);
                    // Ensure we never send the full blob; service should pass only short snippets.
                    org.junit.jupiter.api.Assertions.assertTrue(snippets.size() <= 5, "Too many snippets");
                    for (String s : snippets) {
                        org.junit.jupiter.api.Assertions.assertTrue(s.length() <= 320, "Snippet too long: " + s.length());
                    }
                    return "Answer: INR 50000 per month";
                });
        String longBlob =
                "This employment agreement is made between parties and sets out terms and conditions " +
                "including salary INR 50000 per month and other benefits and obligations " +
                "confidentiality applies to all information and termination requires notice period 30 days " +
                "working hours are 9 to 6 and leave policy includes 12 days annual leave " +
                "this sentence continues without clear punctuation so extraction must stay short ".repeat(10);

        long id = uploadDocx(longBlob);

        MvcResult res = mockMvc.perform(post("/contracts/{id}/ask", id)
                        .contentType(APPLICATION_JSON)
                        .content("{\"question\":\"What is the salary?\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.matched").value(true))
                .andExpect(jsonPath("$.answer").value(org.hamcrest.Matchers.startsWith("Answer: ")))
                .andReturn();

        String answer = objectMapper.readTree(res.getResponse().getContentAsString()).path("answer").asText();
        // Keep answers short; never return whole contract text.
        org.junit.jupiter.api.Assertions.assertTrue(answer.length() <= 240, "Answer too long: " + answer.length());
    }

    @Test
    void askReturnsMatchedFalse_whenNoRelevantAnswerFound() throws Exception {
        when(openAiEmbeddingsService.embedOne(anyString())).thenReturn(new float[]{1f, 0f});
        when(openAiEmbeddingsService.embedAll(org.mockito.ArgumentMatchers.anyList()))
                .thenAnswer(inv -> {
                    @SuppressWarnings("unchecked")
                    List<String> inputs = (List<String>) inv.getArgument(0);
                    java.util.ArrayList<float[]> v = new java.util.ArrayList<>();
                    for (int i = 0; i < inputs.size(); i++) v.add(new float[]{1f, 0f});
                    return v;
                });
        when(openAiAnswersService.answerFromSnippets(anyString(), anyList()))
                .thenReturn("Answer: Not found in contract");
        long id = uploadDocx("This agreement covers confidentiality only.");

        mockMvc.perform(post("/contracts/{id}/ask", id)
                        .contentType(APPLICATION_JSON)
                        .content("{\"question\":\"What is the salary?\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.matched").value(false))
                .andExpect(jsonPath("$.answer").value("Answer: Not found in contract"));
    }

    @Test
    void askReturns404_whenContractNotFound() throws Exception {
        mockMvc.perform(post("/contracts/{id}/ask", 999999)
                        .contentType(APPLICATION_JSON)
                        .content("{\"question\":\"Anything\"}"))
                .andExpect(status().isNotFound());
    }

    @Test
    void askReturnsNotFound_whenExtractedTextEmpty() throws Exception {
        // Create contract without extractedText using existing JSON create endpoint.
        MvcResult created = mockMvc.perform(post("/contracts")
                        .contentType(APPLICATION_JSON)
                        .content("{\"contractName\":\"Empty Text\",\"status\":\"DRAFT\"}"))
                .andExpect(status().isOk())
                .andReturn();

        long id = objectMapper.readTree(created.getResponse().getContentAsString()).path("id").asLong();

        mockMvc.perform(post("/contracts/{id}/ask", id)
                        .contentType(APPLICATION_JSON)
                        .content("{\"question\":\"What is this?\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.matched").value(false))
                .andExpect(jsonPath("$.answer").value("Answer: Not found in contract"));
    }

    private long uploadDocx(String text) throws Exception {
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

        return objectMapper.readTree(upload.getResponse().getContentAsString()).path("id").asLong();
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
