# Contract Management System

SaaS-style contract management module built with **Next.js**, **Java Spring Boot**, and **PostgreSQL**. It lets users view, search, filter, paginate, upload, and inspect contracts with workflow history.

## Tech Stack

- **Frontend**: Next.js + TypeScript (`frontend-next/`)
- **Backend**: Java 17 + Spring Boot
- **Database**: PostgreSQL
- **Tests**: JUnit/MockMvc for backend, Vitest + Testing Library for frontend

## Features

- Contracts dashboard
  - Contract title
  - Owner
  - Status
  - Created date
  - Search box
  - Status filter
  - Pagination
  - Loading, error, and empty states
- Contract details page
  - Contract metadata
  - Workflow history
- REST APIs
  - `GET /api/contracts`
  - `GET /api/contracts/{id}`
  - `GET /api/contracts/{id}/history`
- PostgreSQL database schema
  - `contracts`
  - `workflow_history`
  - `contract_chunk`
  - Primary keys, foreign keys, and indexes
- Optional upload and Q&A support
  - `POST /api/contracts/upload`
  - `POST /api/contracts/{id}/ask`

Legacy `/contracts` endpoints are also supported for backward compatibility, but the assessment/frontend APIs use `/api/contracts`.

## Prerequisites

- Java 17+
- Node.js 18+ or 20+
- PostgreSQL 12+
- PowerShell on Windows

## PostgreSQL Setup

Start PostgreSQL first. Then run the setup script from the project root.

If `psql` works from PowerShell:

```powershell
psql -U postgres -f setup-database.sql
```

If `psql` is not recognized, use the full PostgreSQL path:

```powershell
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -f setup-database.sql
```

The script creates the `contract_management` database and required tables. If you see messages like `already exists` or `relation already exists, skipping`, that is fine.

The backend uses these defaults from `src/main/resources/application.yaml`:

```yaml
spring:
  datasource:
    url: ${DATABASE_URL:jdbc:postgresql://localhost:5432/contract_management}
    username: ${DATABASE_USERNAME:postgres}
    password: ${DATABASE_PASSWORD:root}
```

If your PostgreSQL password is not `root`, set `DATABASE_PASSWORD` before running the backend:

```powershell
$env:DATABASE_PASSWORD="your_postgres_password"
```

## Run Backend

From the project root:

```powershell
.\mvnw.cmd spring-boot:run
```

Backend runs at:

```text
http://localhost:8080
```

## Run Frontend

Open a second terminal:

```powershell
cd frontend-next
npm install
npm run dev
```

Frontend runs at:

```text
http://localhost:3000
```

Open `http://localhost:3000` in your browser.

## API Reference

### List Contracts

```http
GET /api/contracts
```

Supports:

- `page`
- `size`
- `search`
- `status`

Examples:

```text
GET /api/contracts?page=0&size=10
GET /api/contracts?status=REVIEW
GET /api/contracts?search=vendor
```

### Get Contract Details

```http
GET /api/contracts/{id}
```

### Get Workflow History

```http
GET /api/contracts/{id}/history
```

### Upload Contract

```http
POST /api/contracts/upload
```

Multipart fields:

- `contractName`
- `file`

### Update Contract Status

```http
PUT /api/contracts/{id}/status
```

Body:

```json
{ "status": "REVIEW" }
```

Valid status flow:

```text
DRAFT -> REVIEW -> APPROVED
```

## Testing

### Backend

From the project root:

```powershell
.\mvnw.cmd test
```

Expected result:

```text
BUILD SUCCESS
```

### Frontend

From `frontend-next/`:

```powershell
npm test
npm run lint
npm run build
```

## Database Troubleshooting

### `psql` is not recognized

Use the full path:

```powershell
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d contract_management
```

Or add this folder to Windows PATH:

```text
C:\Program Files\PostgreSQL\16\bin
```

### Old schema causes UUID/BIGINT errors

If you see errors like:

```text
operator does not exist: uuid = bigint
```

your existing PostgreSQL tables were created with older column types. Recreate the affected tables:

```powershell
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d contract_management -c "DROP TABLE IF EXISTS contract_chunk;"
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d contract_management -c "DROP TABLE IF EXISTS workflow_history;"
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -f setup-database.sql
```

Verify column types:

```powershell
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d contract_management -c "SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_name IN ('contracts', 'workflow_history', 'contract_chunk') ORDER BY table_name, ordinal_position;"
```

Important expected types:

```text
contracts.id                  uuid
workflow_history.id           uuid
workflow_history.contract_id  uuid
contract_chunk.contract_id    uuid
contract_chunk.embedding      bytea
```

### Upload fails with size errors

Adjust these values in `src/main/resources/application.yaml`:

```yaml
spring:
  servlet:
    multipart:
      max-file-size: 10MB
      max-request-size: 10MB
```

## Assumptions Made During Development

- PostgreSQL is available locally and the database is named `contract_management`.
- Database setup is performed manually using `setup-database.sql`.
- The backend uses environment variables for database overrides: `DATABASE_URL`, `DATABASE_USERNAME`, and `DATABASE_PASSWORD`.
- The frontend communicates with the backend through `/api/contracts`; Next.js rewrites proxy these requests to the Spring Boot backend.
- Valid contract statuses are `DRAFT`, `REVIEW`, and `APPROVED`.
- Valid workflow transition order is `DRAFT -> REVIEW -> APPROVED`.
- Authentication and authorization are outside the scope of this module.
- Uploaded files are stored locally in the `uploads/` directory.
