# Smart Contract Management System

This workspace contains a full-stack contract management application built with a Python FastAPI backend and a Next.js frontend.

## Project structure

- `backend-python/` — FastAPI REST API and business logic
- `frontend/` — Next.js + React + TypeScript dashboard
- `setup-database.sql` — PostgreSQL schema setup for the app
- `add-users-table.sql`, `fix-contracts-schema.sql` — database repair/update scripts
- `uploads/` — local uploaded contract files

## Tech stack

- Frontend: Next.js, React, TypeScript
- Backend: Python 3.11+, FastAPI, SQLAlchemy, Pydantic
- Database: PostgreSQL
- Auth: bearer-token based auth with user/admin roles
- File handling: uploaded contract documents and encrypted storage

## Features

- Contract listing, search, filtering, and pagination
- Contract detail and workflow history views
- Contract upload and document processing
- User/admin approval workflow
- Contract status tracking (`UPLOADED`, `UNDER_REVIEW`, `NEEDS_CHANGES`, `APPROVED`, `REJECTED`)
- Report generation with optional OpenAI-backed support and a local fallback

## Prerequisites

- Python 3.11+
- Node.js 18+ or 20+
- PostgreSQL 12+
- PowerShell on Windows (or another shell that can run the same commands)

## Database setup

Start PostgreSQL locally, then run the setup script from the project root:

```powershell
psql -U postgres -f setup-database.sql
```

If `psql` is not recognized, use the PostgreSQL binary directly:

```powershell
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -f setup-database.sql
```

The script creates the `contract_management` database and required tables. If you see messages such as `already exists`, that is fine.

Then copy the environment file for the backend:

```powershell
cd backend-python
Copy-Item .env.example .env
```

If your PostgreSQL password is not `root`, update `backend-python/.env` before starting the API.

## Run the backend

From the project root:

```powershell
cd backend-python
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8080
```

The API will run at:

- http://localhost:8080
- API docs: http://localhost:8080/docs

## Run the frontend

Open a second terminal and run:

```powershell
cd frontend
npm install
npm run dev
```

The frontend will run at:

- http://localhost:3000

## Main API endpoints

### Authentication

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Contracts

- `GET /api/contracts`
- `GET /api/contracts/{id}`
- `GET /api/contracts/{id}/history`
- `POST /api/contracts/upload`
- `PUT /api/contracts/{id}/status`
- `POST /api/contracts/{id}/submit-review`
- `POST /api/contracts/{id}/review`
- `GET /api/contracts/{id}/report`
- `POST /api/contracts/{id}/report/regenerate`

The first registered user becomes the admin account. Later users are treated as regular users.

## Useful notes

- The `.env` file in `backend-python/` is used for database and optional OpenAI settings.
- `OPENAI_API_KEY` is optional. If it is not set, the backend uses a deterministic local fallback for report generation.
- Uploaded files are stored in the local `uploads/` directory and are encrypted at rest.
- If `psql` is not available in PATH, add PostgreSQL's `bin` folder to PATH or call the full executable path.

## Testing

### Backend

```powershell
cd backend-python
.\.venv\Scripts\Activate.ps1
pytest
```

### Frontend

```powershell
cd frontend
npm test
npm run lint
npm run build
```

## Troubleshooting

### `psql` not recognized

```powershell
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d contract_management
```

### Database password mismatch

If PostgreSQL is set to a password other than `root`, update `backend-python/.env`:

```text
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/contract_management
```

### Old schema errors

If the database was created with older schema versions, rerun the root SQL setup scripts to rebuild the required tables and indexes.
