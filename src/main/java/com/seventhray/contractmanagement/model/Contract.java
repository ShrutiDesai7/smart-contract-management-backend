package com.seventhray.contractmanagement.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Contract {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String contractName;

    private String originalFileName;

    private String storedFileName;

    private String contentType;

    private Long fileSizeBytes;

    private Instant uploadedAt;

    private String filePath;

    @Lob
    private String extractedText;

    private ContractStatus status;
}
