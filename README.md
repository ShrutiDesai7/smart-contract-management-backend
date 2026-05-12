# Contract Management (Spring Boot + React)

A simple contract management system:

- Upload a contract (PDF/DOCX)
- Store file + extracted text
- Update status: `DRAFT -> REVIEW -> APPROVED`
- Ask questions about the contract (offline, evidence-backed)

## Tech Stack

- Backend: Java 17, Spring Boot, Spring Web, Spring Data JPA
- Parsing: PDFBox (PDF), Apache POI (DOCX)
- DB: MySQL (dev), H2 (tests)
- Frontend: React + TypeScript + Vite + Tailwind

## Prerequisites

- Java 17+
- Node.js 18+ (or 20+)
- MySQL 8+ (for local dev) OR update the datasource config to your DB of choice

## Project Structure

- Backend code: `src/main/java/com/seventhray/contractmanagement`
- Backend config: `src/main/resources/application.yaml`
- Local secrets (optional): `src/main/resources/application-secrets.yaml` (gitignored)
- Frontend: `frontend/`

## Screenshots

### Upload Contract
<img width="1686" height="421" alt="image" src="https://github.com/user-attachments/assets/559a7e6c-9c9d-4161-b8e2-003a2888e054" />

<img width="760" height="571" alt="image" src="https://github.com/user-attachments/assets/25776988-7a31-4806-bd4c-551116ba502a" />

---
### Contract List
<img width="703" height="717" alt="image" src="https://github.com/user-attachments/assets/dd2b82cf-5639-4702-871e-2e2539a036d7" />

---
### Ask Questions

<img width="1247" height="450" alt="image" src="https://github.com/user-attachments/assets/c7d95dac-94a3-40b5-8f3c-ff7f2bdadf8c" />


---

## Quick Start

### 1) Configure database (MySQL)

Default config is in `src/main/resources/application.yaml`:

- `spring.datasource.url=jdbc:mysql://localhost:3306/contracts_db`
- `spring.datasource.username=root`
- `spring.datasource.password=root`

Adjust as needed.

### 2) Start backend

```powershell
./mvnw spring-boot:run
```

Backend runs on `http://localhost:8080`.

### 3) Start frontend

```powershell
cd frontend
npm install
npm run dev
```

Frontend runs on the Vite dev server and proxies `http://localhost:5173/api/*` to `http://localhost:8080/*` (see `frontend/vite.config.ts`).

## Main APIs

Note: the frontend calls these endpoints via the `/api` proxy in dev, but the backend routes themselves do not include `/api`.

- Upload: `POST /contracts/upload` (multipart: `contractName`, `file`)
- List: `GET /contracts`
- Fetch by id: `GET /contracts/{id}`
- Update status: `PUT /contracts/{id}/status` (JSON: `{ "status": "REVIEW" }`)
- Ask: `POST /contracts/{id}/ask` (JSON: `{ "question": "..." }`)
- Reindex all contracts: `POST /contracts/reindex`

## Example curl

Upload:

```bash
curl -F "contractName=My NDA" -F "file=@/path/to/file.pdf" http://localhost:8080/contracts/upload
```

Ask:

```bash
curl -H "Content-Type: application/json" -d "{\"question\":\"What are the payment terms?\"}" http://localhost:8080/contracts/1/ask
```

## Notes

- Q&A is offline (no LLM calls required for the default flow):
  - Contracts are chunked (~500–1000 chars) and indexed into `contract_chunk`.
  - Retrieval uses local hashed TF‑IDF embeddings + cosine similarity (top 3 chunks).
  - Answers are composed from the retrieved chunks.
- Response shape for `POST /contracts/{id}/ask`:
  - `{ "answer": "...", "evidence": ["chunk1", "chunk2", "chunk3"] }`
- `OPENAI_API_KEY` config exists in `src/main/resources/application.yaml`, but the current Q&A implementation is local/offline (see `src/main/java/com/seventhray/contractmanagement/service/ContractQaService.java`).

## Troubleshooting

- Upload fails with 413 / size errors: adjust `spring.servlet.multipart.max-file-size` and `spring.servlet.multipart.max-request-size` in `src/main/resources/application.yaml`.
- MySQL connection errors: verify MySQL is running and the DB `contracts_db` exists (or update `spring.datasource.url`).

## Tests

```powershell
./mvnw test
```

