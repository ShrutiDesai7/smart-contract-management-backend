-- Add users table and indexes to existing database
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(512) NOT NULL,
    role VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Ensure users table has the right structure
CREATE INDEX IF NOT EXISTS idx_contracts_owner_id ON contracts(owner_id);

-- Insert demo users for testing
INSERT INTO users (id, name, email, password_hash, role, created_at)
VALUES 
    ('550e8400-e29b-41d4-a716-446655440001', 'Admin User', 'admin@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5DQpjVWYcPWi2', 'ADMIN', NOW()),
    ('550e8400-e29b-41d4-a716-446655440002', 'Regular User', 'user@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5DQpjVWYcPWi2', 'USER', NOW())
ON CONFLICT (email) DO NOTHING;
