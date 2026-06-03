package com.seventhray.contractmanagement;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AssessmentContractApiTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void listContracts_returnsPaginatedResults() throws Exception {
        createContract("Alpha Services", "Operations", "Alice", "DRAFT");
        createContract("Beta NDA", "Legal", "Bob", "REVIEW");

        mockMvc.perform(get("/api/contracts")
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.content.length()").value(greaterThanOrEqualTo(2)))
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(10))
                .andExpect(jsonPath("$.totalElements").value(greaterThanOrEqualTo(2)));
    }

    @Test
    void listContracts_searchMatchesTitleAndOwnerName() throws Exception {
        createContract("Vendor Agreement", "Vendor onboarding", "Priya Sharma", "DRAFT");
        createContract("Support Contract", "Customer support", "Ravi Kumar", "DRAFT");

        mockMvc.perform(get("/api/contracts")
                        .param("search", "priya")
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].ownerName").value("Priya Sharma"));

        mockMvc.perform(get("/api/contracts")
                        .param("search", "support")
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].title").value("Support Contract"));
    }

    @Test
    void listContracts_filtersByStatus() throws Exception {
        createContract("Draft Contract", "Draft item", "Nina", "DRAFT");
        createContract("Approved Contract", "Approved item", "Omar", "APPROVED");

        mockMvc.perform(get("/api/contracts")
                        .param("search", "Approved Contract")
                        .param("status", "APPROVED")
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].status").value("APPROVED"))
                .andExpect(jsonPath("$.content[0].title").value("Approved Contract"));
    }

    @Test
    void getContract_returnsAssessmentDetails() throws Exception {
        String id = createContract("Master Services Agreement", "Annual services terms", "Meera", "DRAFT");

        mockMvc.perform(get("/api/contracts/{id}", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.title").value("Master Services Agreement"))
                .andExpect(jsonPath("$.description").value("Annual services terms"))
                .andExpect(jsonPath("$.ownerName").value("Meera"))
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.createdAt").isNotEmpty())
                .andExpect(jsonPath("$.updatedAt").isNotEmpty());
    }

    @Test
    void getWorkflowHistory_returnsStatusChangesNewestFirst() throws Exception {
        String id = createContract("Workflow Contract", "Status audit", "System", "DRAFT");

        mockMvc.perform(put("/contracts/{id}/status", id)
                        .contentType(APPLICATION_JSON)
                        .content("{\"status\":\"REVIEW\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(put("/contracts/{id}/status", id)
                        .contentType(APPLICATION_JSON)
                        .content("{\"status\":\"APPROVED\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/contracts/{id}/history", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].contractId").value(id))
                .andExpect(jsonPath("$[0].previousStatus").value("REVIEW"))
                .andExpect(jsonPath("$[0].newStatus").value("APPROVED"))
                .andExpect(jsonPath("$[0].changedBy").value("system"))
                .andExpect(jsonPath("$[0].changedAt").isNotEmpty())
                .andExpect(jsonPath("$[1].previousStatus").value("DRAFT"))
                .andExpect(jsonPath("$[1].newStatus").value("REVIEW"));
    }

    private String createContract(String title, String description, String ownerName, String status) throws Exception {
        String body = """
                {
                  "title": "%s",
                  "contractName": "%s",
                  "description": "%s",
                  "ownerName": "%s",
                  "status": "%s"
                }
                """.formatted(title, title, description, ownerName, status);

        MvcResult result = mockMvc.perform(post("/contracts")
                        .contentType(APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
        return json.path("id").asText();
    }
}
