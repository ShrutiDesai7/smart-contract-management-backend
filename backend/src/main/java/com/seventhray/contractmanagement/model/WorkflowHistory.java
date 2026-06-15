package com.seventhray.contractmanagement.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.UuidGenerator;

import java.time.Instant;
import java.util.UUID;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(
        name = "workflow_history",
        indexes = {
                @Index(name = "idx_workflow_history_contract_id", columnList = "contract_id"),
                @Index(name = "idx_workflow_history_changed_at", columnList = "changed_at")
        }
)
public class WorkflowHistory {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "contract_id", nullable = false)
    private Contract contract;

    @Column(name = "previous_status")
    private ContractStatus previousStatus;

    @Column(name = "new_status", nullable = false)
    private ContractStatus newStatus;

    @Column(name = "changed_by")
    private String changedBy;

    @Column(name = "changed_at", nullable = false)
    private Instant changedAt;

    @PrePersist
    void onCreate() {
        if (changedAt == null) {
            changedAt = Instant.now();
        }
    }
}
