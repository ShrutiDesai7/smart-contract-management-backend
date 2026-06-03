package com.seventhray.contractmanagement.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.annotations.JdbcTypeCode;

import java.sql.Types;
import java.time.Instant;
import java.util.UUID;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(
        name = "contracts",
        indexes = {
                @Index(name = "idx_contract_status", columnList = "status"),
                @Index(name = "idx_contract_owner_name", columnList = "owner_name"),
                @Index(name = "idx_contract_created_at", columnList = "created_at")
        }
)
public class Contract {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(nullable = false, updatable = false)
    private UUID id;

    private String title;

    @JdbcTypeCode(Types.LONGVARCHAR)
    @Column(columnDefinition = "TEXT")
    private String description;

    private String contractName;

    private String originalFileName;

    private String storedFileName;

    private String contentType;

    private Long fileSizeBytes;

    @Column(name = "owner_name")
    private String ownerName;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    private Instant uploadedAt;

    private String filePath;

    @JdbcTypeCode(Types.LONGVARCHAR)
    @Column(columnDefinition = "TEXT")
    private String extractedText;

    private ContractStatus status;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        if (createdAt == null) {
            createdAt = uploadedAt != null ? uploadedAt : now;
        }
        if (updatedAt == null) {
            updatedAt = now;
        }
        if ((title == null || title.isBlank()) && contractName != null && !contractName.isBlank()) {
            title = contractName;
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
        if ((title == null || title.isBlank()) && contractName != null && !contractName.isBlank()) {
            title = contractName;
        }
    }
}
