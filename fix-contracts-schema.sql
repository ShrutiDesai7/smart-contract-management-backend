-- Fix contracts table schema
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS owner_id UUID;

-- Create the foreign key constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_contract_owner'
    ) THEN
        ALTER TABLE contracts
            ADD CONSTRAINT fk_contract_owner
            FOREIGN KEY (owner_id)
            REFERENCES users(id)
            ON DELETE SET NULL;
    END IF;
END $$;

-- Create index on owner_id for better query performance
CREATE INDEX IF NOT EXISTS idx_contracts_owner_id ON contracts(owner_id);

-- Ensure comment column exists on workflow_history
ALTER TABLE workflow_history ADD COLUMN IF NOT EXISTS comment TEXT;
CREATE INDEX IF NOT EXISTS idx_workflow_history_contract_id ON workflow_history(contract_id);
CREATE INDEX IF NOT EXISTS idx_workflow_history_changed_at ON workflow_history(changed_at);

-- Ensure contract_reports table exists
CREATE TABLE IF NOT EXISTS contract_reports (
    id UUID PRIMARY KEY,
    contract_id UUID NOT NULL UNIQUE,
    summary TEXT NOT NULL,
    key_terms JSONB NOT NULL,
    risk_level VARCHAR(50) NOT NULL,
    risk_points JSONB NOT NULL,
    important_dates JSONB NOT NULL,
    obligations JSONB NOT NULL,
    generated_by VARCHAR(50) NOT NULL,
    generated_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_contract_report_contract
        FOREIGN KEY (contract_id)
        REFERENCES contracts(id)
        ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_contract_reports_contract_id ON contract_reports(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_reports_risk_level ON contract_reports(risk_level);
