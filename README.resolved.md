# Contract Management (Spring Boot + Next.js + PostgreSQL)

A contract management system with intelligent Q&A capabilities.

## Features

- Upload contracts (PDF/DOCX)
- Store file + extracted text
- Update status: `DRAFT -> REVIEW -> APPROVED`
- Ask questions about contracts (offline/offline-first, evidence-backed)
- Track workflow history

## Tech Stack

- **Backend**: Java 17, Spring Boot, Spring Web, Spring Data JPA
- **Parsing**: PDFBox (PDF), Apache POI (DOCX)
- **Database**: PostgreSQL (local dev), H2 (tests)
- **Frontend**: Next.js (recommended), lives in `frontend/`

## Assumptions (during development)

- PostgreSQL is installed and running locally.
- The PostgreSQL credentials in `backend/src/main/resources/application.yaml` match your local setup (password default commonly set to `root`).
- Schema/data are expected to be created on first backend startup (and/or via the provided SQL scripts).
- Q&A is **offline/offline-first**: contract text is chunked and indexed locally; answers are composed from retrieved chunks.
- Frontend talks to the backend through normal HTTP calls (dev proxy behavior depends on the Next.js setup).

---

## Setup Instructions

### 1) Prerequisites

- Java 17+
- Node.js 18+ (20+ recommended)
- PostgreSQL 12+ (for local dev)
- Maven (via the included `./mvnw` wrapper)

### 2) Configure database

1. Ensure PostgreSQL is running.
2. Create the database:

```powershell
psql -U postgres
```

Then:

```sql
CREATE DATABASE contract_management;
```

Or run the provided script:

```powershell
psql -U postgres -f setup-database.sql
```

3. Verify the connection settings in:

- `src/main/resources/application.yaml`

Example expected values:

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/contract_management
    username: postgres
    password: root
```

If your password is different, update it.

---

## Quick Start

### How to Run the Backend

1. From the project root:

```powershell
cd backend
./mvnw spring-boot:run
```

2. Backend runs on:

- `http://localhost:8080`

Notes:
- On first run, Spring may create and populate tables using `schema.sql` / `data.sql` depending on your configuration.

### Q&A configuration / API key

If your environment requires the OpenAI-backed flow, configure `OPENAI_API_KEY`.

- `src/main/resources/HELP.md` documents how to set it via environment variables.

(If `OPENAI_API_KEY` is not configured, the backend may return an error when the OpenAI-backed path is required.)

---

## How to Run the Frontend

This project includes a Next.js frontend in `frontend/`.

1. Install dependencies and start dev server:

```powershell
cd frontend
npm install
npm run dev
```

2. Frontend runs on:

- `http://localhost:3000`

---

## API Endpoints (quick reference)

Base path: `/api/contracts`

- **Upload**: `POST /api/contracts/upload` (multipart form: `contractName`, `file`)
- **List**: `GET /api/contracts`
- **Fetch by id**: `GET /api/contracts/{id}`
- **Update status**: `PUT /api/contracts/{id}/status` with JSON `{ "status": "REVIEW" }`
- **Ask**: `POST /api/contracts/{id}/ask` with JSON `{ "question": "..." }`
- **Reindex all**: `POST /api/contracts/reindex`

---

## How to Execute Tests

From the project root:

```powershell
./mvnw test
```
backend testing :
```powershell
cd backend
.\mvnw.cmd test
```


---

## Troubleshooting

### Internal Server Error when loading contracts

1. Confirm PostgreSQL is running:

```powershell
psql -U postgres -c "SELECT version();"
```

2. Confirm the DB exists:

```powershell
psql -U postgres -c "\l" | findstr contract_management
```

3. Confirm tables exist:

```powershell
psql -U postgres -d contract_management -c "\dt"
```

4. Check backend logs.

5. Recreate the database (if needed):

```powershell
psql -U postgres -c "DROP DATABASE IF EXISTS contract_management;"
psql -U postgres -f setup-database.sql
./mvnw spring-boot:run
```

### Upload fails with 413 / size errors

Adjust:

- `spring.servlet.multipart.max-file-size`
- `spring.servlet.multipart.max-request-size`

in `src/main/resources/application.yaml`.

---

## Example curl

Upload:

```bash
curl -F "contractName=My NDA" -F "file=@/path/to/file.pdf" http://localhost:8080/api/contracts/upload
```

Ask:

```bash
curl -H "Content-Type: application/json" -d "{\"question\":\"What are the payment terms?\"}" http://localhost:8080/api/contracts/1/ask
```

