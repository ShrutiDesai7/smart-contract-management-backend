package com.seventhray.contractmanagement.model;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.Locale;

@Converter(autoApply = true)
public class ContractStatusConverter implements AttributeConverter<ContractStatus, String> {

    @Override
    public String convertToDatabaseColumn(ContractStatus attribute) {
        return attribute == null ? null : attribute.name();
    }

    @Override
    public ContractStatus convertToEntityAttribute(String dbData) {
        if (dbData == null) {
            return null;
        }

        String normalized = dbData.trim();
        if (normalized.isEmpty()) {
            return null;
        }

        normalized = normalized.toUpperCase(Locale.ROOT);
        return ContractStatus.valueOf(normalized);
    }
}

