package com.seventhray.contractmanagement.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;

import java.sql.Types;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(
        name = "contract_chunk",
        indexes = {
                @Index(name = "idx_contract_chunk_contract_id", columnList = "contract_id")
        }
)
public class ContractChunk {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "contract_id", nullable = false)
    private Contract contract;

    private Integer chunkIndex;

    @Lob
    @JdbcTypeCode(Types.LONGVARCHAR)
    @Column(nullable = false)
    private String chunkText;

    @JdbcTypeCode(Types.BINARY)
    @Column(nullable = false, columnDefinition = "BYTEA")
    private byte[] embedding;
}
