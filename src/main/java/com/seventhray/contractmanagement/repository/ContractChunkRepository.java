package com.seventhray.contractmanagement.repository;

import com.seventhray.contractmanagement.model.ContractChunk;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ContractChunkRepository extends JpaRepository<ContractChunk, Long> {
    List<ContractChunk> findByContractIdOrderByChunkIndexAsc(UUID contractId);
    long countByContractId(UUID contractId);
    long deleteByContractId(UUID contractId);
}
