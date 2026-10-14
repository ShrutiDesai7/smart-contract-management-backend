#!/usr/bin/env python3
"""
Script to fix database schema issues for Contract Management System
"""
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend-python'))

try:
    from app.database import db
    
    print("=" * 60)
    print("FIXING DATABASE SCHEMA")
    print("=" * 60)
    
    with db() as conn:
        # 1. Check and add owner_id column to contracts
        print("\n1. Checking owner_id column in contracts table...")
        result = conn.execute("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'contracts' AND column_name = 'owner_id'
        """).fetchall()
        
        if not result:
            print("   -> Adding owner_id column...")
            conn.execute('ALTER TABLE contracts ADD COLUMN owner_id UUID')
            print("   [OK] Column added")
        else:
            print("   [OK] Column already exists")
        
        # 2. Check and add foreign key constraint
        print("\n2. Checking foreign key constraint...")
        result = conn.execute("""
            SELECT constraint_name FROM information_schema.table_constraints
            WHERE table_name = 'contracts' AND constraint_name = 'fk_contract_owner'
        """).fetchall()
        
        if not result:
            print("   -> Adding foreign key constraint...")
            try:
                conn.execute('''ALTER TABLE contracts
                    ADD CONSTRAINT fk_contract_owner
                    FOREIGN KEY (owner_id)
                    REFERENCES users(id)
                    ON DELETE SET NULL''')
                print("   [OK] Constraint added")
            except Exception as e:
                if "already exists" in str(e):
                    print("   [OK] Constraint already exists")
                else:
                    raise
        else:
            print("   [OK] Constraint already exists")
        
        # 3. Check and create index
        print("\n3. Checking index on owner_id...")
        result = conn.execute("""
            SELECT indexname FROM pg_indexes 
            WHERE tablename = 'contracts' AND indexname = 'idx_contracts_owner_id'
        """).fetchall()
        
        if not result:
            print("   -> Creating index...")
            conn.execute('CREATE INDEX idx_contracts_owner_id ON contracts(owner_id)')
            print("   [OK] Index created")
        else:
            print("   [OK] Index already exists")

        # 4. Check and add comment column to workflow_history
        print("\n4. Checking comment column in workflow_history table...")
        result = conn.execute("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'workflow_history' AND column_name = 'comment'
        """).fetchall()
        if not result:
            print("   -> Adding comment column...")
            conn.execute('ALTER TABLE workflow_history ADD COLUMN comment TEXT')
            print("   [OK] Comment column added")
        else:
            print("   [OK] Comment column already exists")

        # 5. Check and create contract_reports table
        print("\n5. Checking contract_reports table...")
        conn.execute("""
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
        """)
        print("   [OK] contract_reports table verified")
        
        # 6. Verify users table
        print("\n6. Verifying users table...")
        result = conn.execute("SELECT COUNT(*) as count FROM users").fetchone()
        user_count = result['count']
        print(f"   [OK] Users table exists with {user_count} users")
        
        # 7. Verify contracts table
        print("\n7. Verifying contracts table...")
        result = conn.execute("SELECT COUNT(*) as count FROM contracts").fetchone()
        contract_count = result['count']
        print(f"   [OK] Contracts table exists with {contract_count} contracts")
        
    print("\n" + "=" * 60)
    print("DATABASE SCHEMA FIXED SUCCESSFULLY")
    print("=" * 60)
    print("\nRestart the backend server to apply changes.")
    print("The issue should now be resolved!")
    
except Exception as e:
    print(f"\nERROR: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
