# Contract Management System

SaaS-style contract management module built with **Next.js**, **Python FastAPI**, and **PostgreSQL**. It lets users view, search, filter, paginate, upload, and inspect contracts with workflow history.

## Tech Stack

- **Frontend**: Next.js + TypeScript (`frontend/`)
- **Backend**: Python 3.11+ + FastAPI (`backend-python/`)
- **Database**: PostgreSQL
- **Tests**: pytest/httpx for backend, Vitest + Testing Library for frontend

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
- LLM-ready reports
  - `GET /api/contracts/{id}/report`
  - `POST /api/contracts/{id}/report/regenerate`
- Authenticated user/admin workflow
  - Users can access their own contracts
  - Admins can review all contracts
  - Admins can approve, reject, or request changes

Legacy `/contracts` endpoints are also supported for backward compatibility, but the assessment/frontend APIs use `/api/contracts`.

## Prerequisites

- Python 3.11+
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

The Python backend uses these defaults from `backend-python/.env.example`:

```yaml
DATABASE_URL=postgresql://postgres:root@localhost:5432/contract_management
```

If your PostgreSQL password is not `root`, set `DATABASE_PASSWORD` before running the backend:

```powershell
$env:DATABASE_PASSWORD="your_postgres_password"
```

## Run Python Backend

From the project root, create and activate a virtual environment:

```powershell
cd backend-python
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload --port 8080
```

Backend runs at:

```text
http://localhost:8080
```

## Run Frontend

Open a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Frontend runs at:

```text
http://localhost:3000
```

Open `http://localhost:3000` in your browser.

## ScreenShots

## Dashboard
<img width="1223" height="878" alt="image" src="https://github.com/user-attachments/assets/5dcfc400-1790-4809-afdf-5a269e502a5b" />

---
## View
<img width="1221" height="808" alt="image" src="https://github.com/user-attachments/assets/d52dcdae-81d7-4ac0-b2c4-9bbdd4d67641" />

---
## Search
<img width="1152" height="377" alt="image" src="https://github.com/user-attachments/assets/170587b0-7b97-4870-b7a9-004b48c1de63" />

---
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
GET /api/contracts?status=UNDER_REVIEW
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

### Get Contract Report

```http
GET /api/contracts/{id}/report
```

### Generate Contract Report

```http
POST /api/contracts/{id}/report/regenerate
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
{ "status": "UNDER_REVIEW", "comment": "Submitted for admin review" }
```

Main status flow:

```text
UPLOADED -> UNDER_REVIEW -> APPROVED
UPLOADED -> UNDER_REVIEW -> REJECTED
UPLOADED -> UNDER_REVIEW -> NEEDS_CHANGES -> UNDER_REVIEW
```

Owners can submit or resubmit contracts:

```http
POST /api/contracts/{id}/submit-review
```

Admins can approve, reject, or request changes:

```http
POST /api/contracts/{id}/review
```

```json
{ "status": "NEEDS_CHANGES", "comment": "Please upload the signed version." }
```

## Testing

### Python Backend

From `backend-python/` with the virtual environment active:

```powershell
pytest
```

Expected result:

```text
BUILD SUCCESS
```

### Frontend

From `frontend/`:

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

Adjust these values in `backend-python/.env`:

```text
DATABASE_URL=postgresql://postgres:root@localhost:5432/contract_management
```

## Assumptions Made During Development

- PostgreSQL is available locally and the database is named `contract_management`.
- Database setup is performed manually using `setup-database.sql`.
- The backend uses environment variables for database overrides: `DATABASE_URL`, `DATABASE_USERNAME`, and `DATABASE_PASSWORD`.
- The frontend communicates with the backend through `/api/contracts`; Next.js rewrites proxy these requests to the FastAPI backend.
- Valid contract statuses are `UPLOADED`, `UNDER_REVIEW`, `NEEDS_CHANGES`, `APPROVED`, and `REJECTED`.
- Authentication and role authorization are handled by the Python backend.
- Uploaded files are stored locally in the `uploads/` directory.
