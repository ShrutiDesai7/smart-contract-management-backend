# Python FastAPI Backend

## Requirements

- Python 3.11+
- PostgreSQL 12+

## Setup

```powershell
cd backend-python
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Update `.env` if your PostgreSQL password differs from `root`. The existing `setup-database.sql` creates the `contract_management` database and tables.
Set `AUTH_SECRET_KEY` to a long random value before using real accounts.
Set `FILE_ENCRYPTION_KEY` to a separate long random value before uploading real contracts.

## Run

```powershell
uvicorn app.main:app --reload --port 8080
```

API: `http://localhost:8080`

Interactive API documentation: `http://localhost:8080/docs`

## Auth

The first registered account becomes `ADMIN`; later registered accounts become `USER`.

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

Use the returned bearer token as:

```text
Authorization: Bearer <accessToken>
```

Contract APIs now require this bearer token. `USER` accounts can access only contracts they own. `ADMIN` accounts can list and inspect all contracts, and can run `/api/contracts/reindex`.

## Workflow

New uploads start as `UPLOADED`. Supported workflow statuses are `UPLOADED`, `UNDER_REVIEW`, `NEEDS_CHANGES`, `APPROVED`, and `REJECTED`.

Owners can submit or resubmit contracts for admin review:

- `POST /api/contracts/{id}/submit-review`

Admins can approve, reject, or request changes:

- `POST /api/contracts/{id}/review`

Example:

```json
{ "status": "NEEDS_CHANGES", "comment": "Please upload the signed version." }
```

Workflow history includes the user/admin who changed status and any comment.

## File Security

Uploaded files are encrypted at rest. The API stores encrypted files with a `.enc` suffix and removes the temporary plaintext file after text extraction.

Authorized owners and admins can download a decrypted copy through:

- `GET /api/contracts/{id}/download`

## Reports

Contract reports provide a summary, key terms, risk level, risk points, important dates, and obligations.

- `GET /api/contracts/{id}/report`
- `POST /api/contracts/{id}/report/regenerate`

If `OPENAI_API_KEY` is set, report generation calls the OpenAI Responses API with structured JSON output. If no key is configured, the backend uses a deterministic local fallback so development and tests still work.
