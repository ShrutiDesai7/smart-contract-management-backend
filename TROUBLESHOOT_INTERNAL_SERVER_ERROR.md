# Internal Server Error - "Loading contract records" Fix

## Quick Diagnosis Checklist

- [ ] Is PostgreSQL running?
- [ ] Does database `contract_management` exist?
- [ ] Are the tables created in the database?
- [ ] Are the API endpoints accessible?

## Steps to Fix

### Step 1: Verify PostgreSQL is Running

**Windows (PowerShell)**:
```powershell
# Check if PostgreSQL service is running
Get-Service | ? {$_.Name -like "*postgre*"}

# Or use pg_isready
pg_isready -h localhost -p 5432
```

**macOS/Linux**:
```bash
pg_isready -h localhost -p 5432
```

Expected output: `accepting connections`

---

### Step 2: Create the Database

If the database doesn't exist, create it:

```powershell
psql -U postgres
```

Then in psql:
```sql
CREATE DATABASE contract_management;
\q
```

Or use the setup script:
```powershell
psql -U postgres -f setup-database.sql
```

---

### Step 3: Verify Database Tables

Check if tables exist:

```powershell
psql -U postgres -d contract_management -c "\dt"
```

Expected output:
```
             List of relations
 Schema |      Name       | Type  | Owner
--------+-----------------+-------+-------
 public | contract_chunk  | table | postgres
 public | contracts       | table | postgres
 public | workflow_history| table | postgres
```

If tables are missing, Spring Boot will create them on next startup.

---

### Step 4: Verify PostgreSQL Credentials

The backend uses these default credentials:
- **Host**: `localhost`
- **Port**: `5432`
- **Database**: `contract_management`
- **Username**: `postgres`
- **Password**: `root`

If your PostgreSQL password is different, update `src/main/resources/application.yaml`:

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/contract_management
    username: postgres
    password: YOUR_PASSWORD_HERE  # Change this
```

---

### Step 5: Start the Backend

```powershell
./mvnw spring-boot:run
```

**Watch the console for**:
- ✓ `Hibernated initialized` - JPA initialized
- ✓ `contract_management` URL with successful connection
- ✓ No error messages about tables or schema

---

### Step 6: Test the API

Once backend is running on `http://localhost:8080`, test:

```powershell
# List contracts
curl http://localhost:8080/api/contracts?page=0&size=10

# You should get a response like:
# {"content":[...],"page":0,"size":10,"totalElements":3,"totalPages":1,"first":true,"last":true}
```

---

## Common Error Messages & Fixes

### Error: `ERROR: database "contract_management" does not exist`
**Fix**: Run `psql -U postgres -c "CREATE DATABASE contract_management;"`

---

### Error: `org.postgresql.util.PSQLException: Connection refused`
**Fix**: 
1. Verify PostgreSQL is running: `pg_isready -h localhost`
2. Check if port 5432 is correct in application.yaml
3. Restart PostgreSQL service

---

### Error: `password authentication failed for user "postgres"`
**Fix**: Update the password in `application.yaml` to match your PostgreSQL password

---

### Error: `ERROR: role "postgres" does not exist`
**Fix**: Create the user: `psql -U postgres -c "CREATE ROLE postgres WITH LOGIN SUPERUSER;"`

---

## Verify Everything Works

Once the backend is running, the frontend should work:

```powershell
cd frontend-next
npm install
npm run dev
```

Then navigate to `http://localhost:3000` and try loading contracts.

---

## Still Having Issues?

1. **Check Backend Logs**: Look at terminal where you ran `./mvnw spring-boot:run` for detailed error messages
2. **Verify All Requirements Met**:
   - PostgreSQL 12+ installed and running
   - Port 5432 is accessible
   - No firewall blocking localhost connections
3. **Check Database Connectivity**:
   ```powershell
   psql -h localhost -U postgres -d contract_management -c "SELECT COUNT(*) FROM contracts;"
   ```

If you see a count or empty result, the connection is working!
