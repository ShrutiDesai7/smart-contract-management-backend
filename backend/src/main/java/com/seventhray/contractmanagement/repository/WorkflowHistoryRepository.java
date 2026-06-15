package com.seventhray.contractmanagement.repository;

import com.seventhray.contractmanagement.model.WorkflowHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface WorkflowHistoryRepository extends JpaRepository<WorkflowHistory, UUID> {
    List<WorkflowHistory> findByContractIdOrderByChangedAtDesc(UUID contractId);
}
