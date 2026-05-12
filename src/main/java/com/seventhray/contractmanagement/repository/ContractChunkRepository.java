package com.seventhray.contractmanagement.repository;

import com.seventhray.contractmanagement.model.ContractChunk;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ContractChunkRepository extends JpaRepository<ContractChunk, Long> {
    List<ContractChunk> findByContractIdOrderByChunkIndexAsc(Long contractId);
    long countByContractId(Long contractId);
    long deleteByContractId(Long contractId);
}
