# Contract Management System (Spring Boot + Next.js + PostgreSQL)

SaaS-style contract management with **searchable contract dashboards** and **workflow history**. Assessment APIs are exposed under **`/api/contracts`**.

> Note: the evaluation module in this repository primarily focuses on listing/searching contracts and viewing workflow history. The Q&A endpoints are also available in the same `/api/contracts` namespace and are described for completeness.


> Backward compatibility: legacy upload/Q&A endpoints are preserved; evaluation/assessment APIs are organized under `/api/contracts`.

---

## Project Overview

This system helps businesses manage:

- Contract documents (upload + metadata)
- Contract lifecycle status: `DRAFT → REVIEW → APPROVED`
- Workflow/audit trail (status change history)
- Contract discovery (pagination + search + filters)
- Retrieval-based Q&A using chunking
- (Legacy) Q&A endpoints are preserved for backward compatibility


---




---

## Features

- **Upload contracts** (PDF/DOCX) via `POST /api/contracts/upload`
- **Extract text** and build **chunked retrieval indexes**
- **Retrieval-based Q&A using chunking** via `POST /api/contracts/{id}/ask`
  - Returns `answer` plus **retrieved evidence snippets**
- **Workflow history**
  - Update status: `PUT /api/contracts/{id}/status`
  - View audit trail: `GET /api/contracts/{id}/history`
- **Contract search** (interview-ready evaluation API)
  - Pagination, title search, owner search, status filtering

---

## Tech Stack

- **Frontend**: Next.js + TypeScript (submission in `frontend-next/`)
- **Backend**: Java 17 + Spring Boot (Spring Web, Spring Data JPA)
- **Database**: PostgreSQL (H2 in tests)
- **Document parsing**: PDFBox (PDF), Apache POI (DOCX)

---

## System Architecture

### Backend flow: upload → storage → chunking → Q&A → workflow history

1. **Upload**
   - `POST /api/contracts/upload`
   - Creates a contract record and stores the uploaded file

2. **Storage**
   - Uploaded files are stored in the backend upload directory (`app.upload-dir`, default `uploads/`).
   - Durable processing artifacts (e.g., extracted text/chunks as defined in the data model) are persisted in **PostgreSQL**.

3. **Chunking + indexing**
   - Extracted contract text is split into chunks.
   - Chunks are encoded/indexed to support **retrieval-based Q&A using chunking**.

4. **Retrieval-based Q&A**
   - `POST /api/contracts/{id}/ask`
   - The backend retrieves relevant chunks for the question.
   - The response includes the composed `answer` and **evidence snippets**.

5. **Workflow history**
   - `PUT /api/contracts/{id}/status` updates the contract status.
   - Each transition is recorded in `workflow_history` and exposed via `GET /api/contracts/{id}/history`.

### PostgreSQL: persistent storage role

PostgreSQL stores the durable state required for a production-like workflow:

- `contracts` (contract metadata, status, timestamps)
- `workflow_history` (audit trail of status transitions)
- `contract_chunk` (chunked artifacts needed for retrieval-based Q&A)

This design ensures that contract lists/details/history are available after restarts without recomputing the entire pipeline.

### Frontend → backend API communication

Next.js calls backend REST endpoints directly over HTTP under **`/api/contracts`**.

- Dashboard fetches:
  - `GET /api/contracts` (supports pagination, search, and status filter)
- Details page fetches:
  - `GET /api/contracts/{id}`
  - `GET /api/contracts/{id}/history`

---

## Assumptions & Design Decisions

- **Assessment/evaluation APIs are separated under `/api/contracts`.**
- **Terminology correctness**: Q&A is **retrieval-based Q&A using chunking** (not “offline/offline-first”).
- **Backward compatibility**: legacy upload/Q&A endpoints are preserved.
- **No hard-coded credential assumptions** for evaluation.
  - Database connection is configured via `DATABASE_URL`, `DATABASE_USERNAME`, `DATABASE_PASSWORD` (see Setup).

---

## Setup Instructions (Step-by-step)

### 1) Prerequisites

- Java 17+
- Node.js 18+ (20+ recommended)
- PostgreSQL 12+
- Maven (use wrapper: `./mvnw`)

### 2) Configure PostgreSQL

1. Ensure PostgreSQL is running.
2. Create the database `contract_management`.

Option A: interactive

```powershell
psql -U postgres
```

Then:

```sql
CREATE DATABASE contract_management;
```

Option B: run the script

```powershell
psql -U postgres -f setup-database.sql
```

3. Verify datasource settings in `src/main/resources/application.yaml`.

The app uses environment-variable overrides:

```yaml
spring:
  datasource:
    url: ${DATABASE_URL:jdbc:postgresql://localhost:5432/contract_management}
    username: ${DATABASE_USERNAME:postgres}
    password: ${DATABASE_PASSWORD:root}
```

> For assessment/release: set `DATABASE_PASSWORD` to your local PostgreSQL password. Do not rely on any specific default.

### 3) (Optional) OpenAI API key for Q&A (if enabled)

The backend reads `OPENAI_API_KEY`.

- See `HELP.md` for environment variable examples.
- If the OpenAI-backed path is triggered without configuration, the backend returns a clear configuration error.

---

## How to Run Backend

1. From the project root:

```powershell
./mvnw spring-boot:run
```

2. Backend runs on:

- `http://localhost:8080`

---

## How to Run Frontend (Next.js only for submission)

1. Start Next.js:

```powershell
cd frontend-next
npm install
npm run dev
```

2. Frontend runs on:

- `http://localhost:3000`

---

## API Reference (`/api/contracts` endpoints)

All assessment endpoints are organized under **`/api/contracts`**.

### 1) List Contracts

- `GET /api/contracts`

Supports:

- Pagination: `page`, `size`
- Search: `search` (matches title and owner)
- Filter: `status`

Examples:

```text
GET /api/contracts?page=1&size=10
GET /api/contracts?status=REVIEW
GET /api/contracts?search=vendor
```

### 2) Get Contract Details

- `GET /api/contracts/{id}`

Returns complete contract details.

### 3) Get Workflow History

- `GET /api/contracts/{id}/history`

Returns workflow history for the contract.

### 4) Retrieval-based Q&A using chunking (legacy/optional)

- `POST /api/contracts/upload`
- `POST /api/contracts/{id}/ask`

### 5) Update Contract Status

- `PUT /api/contracts/{id}/status`

Body:

```json
{ "status": "REVIEW" }
```

### 6) Reindex all contracts

- `POST /api/contracts/reindex`

---

## Testing Instructions

### Backend

```powershell
./mvnw test
```

### Frontend

Run Next.js tests/lint (if configured in your environment):

```powershell
cd frontend-next
npm test
```

If `npm test` is not configured in this repository, run:

```powershell
npm run lint
```

---

## Troubleshooting

### Internal Server Error when loading contracts

Checklist:

1. Confirm PostgreSQL is running.
2. Confirm the database exists: `contract_management`.
3. Confirm required tables exist.

Verify tables:

```powershell
psql -U postgres -d contract_management -c "\dt"
```

If tables are missing:

```powershell
psql -U postgres -f setup-database.sql
./mvnw spring-boot:run
```

### Upload fails with 413 / size errors

Adjust multipart limits in `src/main/resources/application.yaml`:

- `spring.servlet.multipart.max-file-size`
- `spring.servlet.multipart.max-request-size`

---

## Limitations / Future Improvements

- Retrieval quality improvements:
  - tune chunk size/overlap
  - add reranking
- Async chunking/indexing for large documents
- Observability improvements:
  - structured logs, correlation ids
  - metrics dashboards
- Security hardening:
  - authentication/authorization and RBAC
  - stricter file validation and scanning

---

*End of README.*

