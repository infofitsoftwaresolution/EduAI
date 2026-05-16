# EduAI RAG System — Production Architecture & Operations Guide

This document describes what the application is, how it works end-to-end, which technologies to use in production, estimated costs, and the roadmap from the current MVP to a production-ready system.

**Audience:** developers, DevOps, and project leads embedding this RAG service into an **LMS** (Learning Management System) at institutional scale (**50–500+ enrolled students**).

---

## Table of contents

1. [What this application is](#1-what-this-application-is)
2. [Current vs production state](#2-current-vs-production-state)
3. [Recommended production tech stack](#3-recommended-production-tech-stack)
4. [What you do NOT need (at first)](#4-what-you-do-not-need-at-first)
5. [AI models and pricing](#5-ai-models-and-pricing)
6. [Monthly cost estimates](#6-monthly-cost-estimates)
7. [AWS architecture](#7-aws-architecture)
8. [Database design](#8-database-design)
9. [Complete application flows](#9-complete-application-flows)
10. [API reference (summary)](#10-api-reference-summary)
11. [Security checklist](#11-security-checklist)
12. [Deployment and CI/CD](#12-deployment-and-cicd)
13. [Production roadmap (phases)](#13-production-roadmap-phases)
14. [Repository structure](#14-repository-structure)

---

## 1. What this application is

**EduAI** is a **Retrieval-Augmented Generation (RAG)** learning assistant:

- **Admins** create courses, sections, and upload knowledge (PDF, DOCX, TXT, or URLs).
- Content is **chunked**, **embedded**, and stored in **PostgreSQL with pgvector**.
- **Students** ask questions in a chat UI (or embedded LMS widget); the system retrieves relevant chunks, sends them to an **LLM**, and returns an answer with **source citations**.
- **LMS integration:** parent app passes `course_id` / `section_id` and (in production) a **student JWT** so retrieval stays scoped to enrolled course material.

| Layer | Technology (current) |
|-------|----------------------|
| Frontend | React + Vite + TypeScript + Tailwind + Zustand |
| Backend | FastAPI + Python 3.10+ |
| Orchestration | LangChain (retrieval, prompts, chains) |
| Vector DB | PGVector (same Postgres as LMS metadata) |
| LLM (current dev) | Hugging Face Inference API (Qwen) |
| Embeddings (current dev) | Hugging Face Inference API (MiniLM) |
| Relational data | SQLAlchemy → PostgreSQL |

---

## 2. Current vs production state

| Area | Current (MVP) | Production target |
|------|---------------|-------------------|
| LLM | Hugging Face (rate limits, latency) | **OpenAI API** — `GPT-5.4 mini` (chat) |
| Embeddings | HF Inference API | **OpenAI** — `text-embedding-3-small` |
| Chat history | In-memory `dict` on server | **Postgres tables** (`chat_sessions`, `chat_messages`) |
| Session sidebar | Mostly `localStorage` | **Server-backed** session list |
| Admin auth | Hardcoded credentials in frontend | Server JWT / SSO + hashed passwords |
| Student `/ask` API | Open (no auth) | API key or JWT per user |
| Server | `uvicorn` with `reload=True` (1 process) | **Gunicorn + 4 Uvicorn workers** |
| HTTPS | Local HTTP | **Nginx + Let's Encrypt** or Cloudflare |
| File storage | `./data` on disk | EC2 disk → later **S3** |
| Health check | Basic `/health` | DB + OpenAI connectivity checks |
| Streaming | No (full response wait) | **SSE streaming** (recommended) |
| Ingestion | Synchronous in request | Background queue (Phase 2) |

---

## 3. Recommended production tech stack

### 3.1 Application

| Component | Choice | Why |
|-----------|--------|-----|
| Frontend hosting | EC2 (same box) or S3 + Cloudflare | Simple for small teams; CDN later |
| API | FastAPI on EC2 | Already built |
| Process manager | Gunicorn + UvicornWorker | Multiple workers, production-stable |
| Reverse proxy | **Nginx** | HTTPS, timeouts, static files |
| Database | **AWS RDS PostgreSQL 15+** with `pgvector` | Backups, durability, separate from app server |
| Chat sessions | **RDS** (not Redis) | You already pay for Postgres; ~1–5 ms per write |
| Secrets | AWS Secrets Manager or SSM | No secrets in git |
| CI/CD | GitHub Actions → EC2 (SSH/SSM) | Automated deploy on `main` |
| Monitoring | CloudWatch + Sentry (optional) | Errors and latency |

### 3.2 AI (production)

| Purpose | Model | Mode |
|---------|--------|------|
| Student Q&A | **GPT-5.4 mini** | Standard (real-time chat) |
| Higher quality (optional) | GPT-5.4 | Standard, selective routes only |
| Premium / complex | GPT-5.5 | Rare; higher cost |
| Embeddings (ingest + search) | **text-embedding-3-small** | Standard |
| Bulk re-index / summaries | Same models | **Batch (−50%)** — not for live chat |

### 3.3 Optional later

| Component | When |
|-----------|------|
| **ALB** | 2+ EC2 instances, zero-downtime deploys |
| **ElastiCache Redis** | Heavy job queues, many workers, strict rate limits at scale |
| **S3** | Many large PDFs, multi-instance file access |
| **Cohere Rerank** | Better retrieval quality |

---

## 4. What you do not need (at first)

For **LMS deployment** on **one EC2** (until you exceed ~300–500 active chat users or need zero-downtime deploys):

| Service | Needed? | Alternative |
|---------|---------|-------------|
| ALB | No | Nginx on EC2; add ALB when you have 2+ app servers |
| ElastiCache | No | Store chat in **RDS**; optional Redis in Docker on EC2 |
| Kubernetes | No | Docker Compose on EC2 is enough |
| Separate vector DB | No | PGVector in RDS is correct |

**Important:** If EC2 goes down, **RDS stays up**. When you restart or replace EC2, point `DATABASE_URL` at the same RDS — data is safe. Postgres on the same EC2 as the app is **worse** for production (app crash = DB crash).

---

## 5. AI models and pricing

Prices below are **indicative** (check [OpenAI pricing](https://openai.com/pricing) for current numbers). Your screenshots showed **GPT-5.x** family pricing.

### 5.1 Chat models (per 1M tokens)

| Model | Input | Cached input | Output | Use case |
|-------|-------|--------------|--------|----------|
| GPT-5.4 mini | $0.75 | $0.075 | $4.50 | **Default** — student Q&A |
| GPT-5.4 | $2.50 | $0.25 | $15.00 | Harder questions |
| GPT-5.5 | $5.00 | $0.50 | $30.00 | Rare; max quality |

**Processing modes:**

- **Standard** — live chat (`/ask`).
- **Batch (−50%)** — ingestion, bulk jobs only.
- **Data residency (+10%)** — only if compliance requires a specific region.

### 5.2 Embeddings

| Model | Approx. price | Dimensions |
|-------|----------------|------------|
| text-embedding-3-small | ~$0.02 / 1M tokens | 1536 |

### 5.3 Per-question cost example (GPT-5.4 mini)

Typical RAG request:

- ~2,000 input tokens (context + history + question)
- ~400 output tokens (answer)

```
Input:  2,000 × ($0.75 / 1,000,000) ≈ $0.0015
Output:   400 × ($4.50 / 1,000,000) ≈ $0.0018
Total per question ≈ $0.003
```

Embedding cost per question is negligible if vectors are precomputed at ingest time.

### 5.4 Ingestion cost example

Upload a 50-page PDF → ~500 chunks → ~250k tokens embedded once:

```
250,000 × ($0.02 / 1,000,000) ≈ $0.005 per document (embedding only)
```

Most ingest cost is **one-time** per document, not per student question.

---

## 6. Monthly cost estimates (LMS scale)

Costs scale with **how many questions students ask**, not enrollment alone. Budget using **active chat usage**, not total LMS accounts.

### 6.1 Planning assumptions

| Assumption | Value |
|------------|--------|
| Deployment | RAG microservice embedded in parent **LMS** (JWT / course context) |
| Active school days / month | 20 |
| Chat model | **GPT-5.4 mini** (Standard) |
| Embeddings | **text-embedding-3-small** (paid at **upload / re-index**, not per question) |
| Tokens per RAG question | ~2,000 input + ~400 output |
| **Cost per question (chat only)** | **~$0.003** |
| AWS (starter prod) | 1× EC2 + RDS, **no ALB**, **no ElastiCache** |
| File types (current) | PDF, DOCX, TXT, URL — PPTX optional later (see §6.8) |

```
Per question ≈ (2,000 × $0.75/1M) + (400 × $4.50/1M) ≈ $0.003
Questions/month = students × questions_per_day × 20
```

Add **15–25% buffer** for retries, exam-week spikes, and admin re-ingests.

### 6.2 OpenAI — by enrolled students (chat)

#### Light usage — 5 questions / student / day

| Students | Questions / month | Chat (~) | Embeddings ingest (~) | **OpenAI total** |
|----------|-------------------|----------|-------------------------|------------------|
| 50 | 5,000 | $15 | $2–10 | **$20–25** |
| 100 | 10,000 | $33 | $3–15 | **$35–50** |
| 200 | 20,000 | $66 | $5–20 | **$75–90** |
| 500 | 50,000 | $165 | $10–30 | **$175–200** |

#### Moderate usage — 10 questions / student / day (typical LMS tutor)

| Students | Questions / month | Chat (~) | Embeddings ingest (~) | **OpenAI total** |
|----------|-------------------|----------|-------------------------|------------------|
| 50 | 10,000 | $33 | $2–10 | **$35–45** |
| 100 | 20,000 | $66 | $3–15 | **$70–85** |
| 200 | 40,000 | $132 | $5–20 | **$140–155** |
| 500 | 100,000 | $330 | $10–40 | **$340–370** |

#### Heavy usage — 20 questions / student / day (exam season, high adoption)

| Students | Questions / month | Chat (~) | Embeddings ingest (~) | **OpenAI total** |
|----------|-------------------|----------|-------------------------|------------------|
| 50 | 20,000 | $66 | $5–15 | **$75–85** |
| 100 | 40,000 | $132 | $5–20 | **$140–155** |
| 200 | 80,000 | $264 | $10–30 | **$275–295** |
| 500 | 200,000 | $660 | $15–50 | **$675–710** |

**Rule:** OpenAI bill ≈ **$0.003 × total questions per month** (+ small embedding ingest).

At moderate usage, expect **~$0.70–0.85 per student per month** in OpenAI fees (100–200 students).

### 6.3 AWS — by scale (fixed infrastructure)

| Scale (active LMS users) | Typical setup | **AWS / month (approx)** |
|--------------------------|---------------|---------------------------|
| **50–150** | EC2 `t3.medium`, RDS `db.t3.small`, 20–50 GB | **$70–110** |
| **150–300** | EC2 `t3.large`, RDS `db.t3.medium`, backups | **$110–160** |
| **300–500** | EC2 `t3.large` / `t3.xlarge`, RDS `db.t3.medium`+, more storage | **$160–220** |
| **500+ / HA** | 2× EC2 + ALB + larger RDS, Multi-AZ optional | **$250–400+** |

Storage grows with: uploaded files, pgvector chunks, and `chat_messages` history.

### 6.4 Combined total (OpenAI + AWS)

**Moderate usage (10 questions / student / day)** — recommended budget line:

| Students | OpenAI | AWS | **Total / month** | **Per student (approx)** |
|----------|--------|-----|-------------------|---------------------------|
| 50 | ~$40 | ~$90 | **~$130** | ~$2.60 |
| 100 | ~$80 | ~$100 | **~$180** | ~$1.80 |
| 200 | ~$150 | ~$130 | **~$280** | ~$1.40 |
| 500 | ~$355 | ~$190 | **~$545** | ~$1.10 |

**Heavy usage (20 questions / student / day):**

| Students | **Total / month (approx)** |
|----------|----------------------------|
| 100 | **~$250–300** |
| 200 | **~$450–550** |
| 500 | **~$900–1,000** |

OpenAI is typically **40–70%** of the bill at moderate usage; AWS dominates only at low chat volume or when you add ALB/HA.

### 6.5 Cost minimization (LMS + RAG)

| Area | Tactic | Effect |
|------|--------|--------|
| **OpenAI** | Stay on **GPT-5.4 mini** (not 5.4 / 5.5) | Largest savings |
| **OpenAI** | **Prompt caching** for repeated course context | Up to ~90% off cached input tokens |
| **OpenAI** | Cap history (3–5 turns), lower `top_k` (3–4), shorter chunks | Fewer input tokens per question |
| **OpenAI** | **Per-student daily limit** in LMS (e.g. 15/day) | Predictable ceiling |
| **OpenAI** | **Batch API** for bulk embed / re-index only | ~50% on ingest jobs |
| **OpenAI** | Cache identical questions per course | Avoid duplicate LLM calls |
| **OpenAI** | No slide **vision** unless required | Avoids large ingest bills |
| **AWS** | Single EC2 until ~300–500 users; skip ALB early | Saves $18–25/mo |
| **AWS** | Chat in **RDS**, not ElastiCache | Saves $12–15/mo |
| **AWS** | **Reserved Instances** (1-year) for EC2/RDS | ~30–40% off compute |
| **AWS** | **Cloudflare** free tier for frontend | Less bandwidth on EC2 |
| **LMS** | RAG scoped by **`course_id`** (enrolled only) | Smaller retrieval + blocks abuse |
| **LMS** | Ingest on **course publish**, not every page view | One-time embed cost |
| **LMS** | Archive courses → delete old vectors | Lower RDS storage |

### 6.6 Optional AWS add-ons

| Resource | ~Monthly |
|----------|----------|
| ALB | +$18–25 |
| ElastiCache (cache.t3.micro) | +$12–15 |
| S3 + CloudFront | +$5–20 |
| Sentry (free tier) | $0 |

### 6.7 File formats and ingest cost (PPT / images)

| Capability | Ingest time | Extra OpenAI cost |
|------------|-------------|---------------------|
| **PDF / DOCX / TXT** (current) | Seconds–minutes | Embeddings once per upload (low) |
| **PPTX text only** (planned) | Similar to PDF; large decks slightly longer | Same as PDF (embeddings only) |
| **PPTX + image / vision analysis** | Minutes per deck | **Much higher** — vision API per slide image at ingest |

**Recommendation:** Ship **text-only PPT** first for LMS course packs. Add vision only for courses where slides are mostly charts/diagrams with little text.

---

## 7. AWS architecture

### 7.1 Recommended starter diagram

```
                    ┌─────────────────┐
                    │   Students      │
                    │   (Browser)     │
                    └────────┬────────┘
                             │ HTTPS
                    ┌────────▼────────┐
                    │  Cloudflare     │  optional, free tier
                    │  (DNS + SSL)    │
                    └────────┬────────┘
                             │
                    ┌────────▼────────────────────────────┐
                    │  EC2 (t3.medium)                  │
                    │  ┌─────────┐  ┌─────────────────┐ │
                    │  │ Nginx   │→ │ Gunicorn        │ │
                    │  │ :443    │  │ FastAPI ×4      │ │
                    │  └─────────┘  └────────┬────────┘ │
                    │  ┌─────────────────────┐│         │
                    │  │ React static build  ││         │
                    │  └─────────────────────┘│         │
                    │  ./data (uploads)       │         │
                    └────────────┬────────────┴─────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
     ┌────────▼────────┐  ┌──────▼──────┐   ┌───────▼───────┐
     │  RDS PostgreSQL │  │  OpenAI API │   │ Secrets Mgr   │
     │  + pgvector     │  │  LLM+Embed  │   │ API keys      │
     │  LMS tables     │  │             │   │               │
     │  chat_* tables  │  │             │   │               │
     │  vector store   │  │             │   │               │
     └─────────────────┘  └─────────────┘   └───────────────┘
```

### 7.2 EC2 responsibilities

- Run Nginx (HTTPS termination)
- Serve React production build (`npm run build`)
- Run FastAPI (Gunicorn, 4 workers)
- Store uploaded files in `./data` (migrate to S3 when needed)

### 7.3 RDS responsibilities

- Courses, sections, knowledge assets (metadata)
- PGVector collection `rag_knowledge_base` (chunk embeddings + text)
- **Chat sessions and messages** (production addition)
- Automated backups, point-in-time recovery

### 7.4 Environment variables (production)

```env
# AI
OPENAI_API_KEY=sk-...
LLM_MODEL=gpt-5.4-mini
EMBEDDING_MODEL=text-embedding-3-small

# Database
DATABASE_URL=postgresql://user:pass@your-rds.region.rds.amazonaws.com:5432/eduai?sslmode=require

# App
FRONTEND_ORIGINS=https://your-domain.com
ALLOW_LOCALHOST_CORS=false

# Security (when implemented)
JWT_SECRET=...
ADMIN credentials in DB, not in frontend source
```

---

## 8. Database design

### 8.1 Current tables (LMS / knowledge base)

```
courses
  └── sections
        └── knowledge_assets (file | url, chunks_count, storage_path)
```

**PGVector** (LangChain): collection `rag_knowledge_base` — stores document chunks with metadata:

- `course_id`, `section_id`, `document_id`, `source_type`, `label`, page info

### 8.2 Production addition (chat — ChatGPT-style)

```
chat_sessions
  id            UUID PK
  user_id       UUID NULLABLE     -- when login exists
  title         VARCHAR
  course_id     UUID NULLABLE     -- optional RAG scope
  section_id    UUID NULLABLE
  created_at    TIMESTAMPTZ
  updated_at    TIMESTAMPTZ

chat_messages
  id            UUID PK
  session_id    UUID FK → chat_sessions.id ON DELETE CASCADE
  role          VARCHAR           -- 'user' | 'assistant'
  content       TEXT
  sources       JSONB NULLABLE    -- RAG citations for assistant messages
  created_at    TIMESTAMPTZ

INDEX ON chat_messages(session_id, created_at);
INDEX ON chat_sessions(user_id, updated_at DESC);
```

**Why Postgres for chat (not Redis):**

- Survives refresh, restart, and multiple API workers
- ~1–5 ms per insert — negligible vs 1–5 s LLM latency
- No extra AWS service cost

---

## 9. Complete application flows

### 9.1 Admin: create course structure

```
Admin UI (/admin)
    → POST /courses                    Create course
    → POST /courses/{id}/sections      Create section
```

Data stored in RDS tables `courses`, `sections`.

---

### 9.2 Admin: ingest knowledge (file)

```
Admin uploads PDF/DOCX/TXT
    → POST /courses/{cid}/sections/{sid}/assets/file

Server:
  1. Validate extension (.pdf, .docx, .txt)
  2. Create knowledge_assets row (Postgres)
  3. Save file to ./data/{course_id}/{section_id}/{asset_id}_filename
  4. load_document(path)           — extract text
  5. split_documents()             — chunks (~RecursiveCharacterTextSplitter)
  6. Attach metadata on each chunk:
       course_id, section_id, document_id, label, source_type
  7. get_vectorstore().add_documents(chunks)
       → HF/OpenAI embeddings per chunk
       → Vectors + text stored in PGVector (RDS)
  8. Update asset.chunks_count, commit

Response: asset id, chunks_added
```

**Failure handling:** rollback DB, delete partial embeddings, remove file.

---

### 9.3 Admin: ingest URL

```
POST /courses/{cid}/sections/{sid}/assets/url  { "url": "https://..." }

Same as file flow, but load_url() instead of load_document().
No local file; storage_path may stay null.
```

---

### 9.4 Admin: delete asset / course

```
DELETE asset  → delete_embeddings_for_document_ids → remove file → delete row
DELETE course → delete_embeddings_for_course_id → cascade sections/assets
```

---

### 9.5 Student: open chat (production flow)

```
1. User opens https://your-domain.com/
2. Browser:
     - If localStorage has active session_id → use it
     - Else POST /api/sessions → new session_id
3. GET /api/sessions/{id}/messages → load full thread from RDS
4. Render messages in React (Zustand)
5. GET /api/sessions → populate sidebar (list of past chats)
```

**Current MVP:** step 3 calls `GET /ask/session/{id}` but server uses RAM — must move to RDS.

---

### 9.6 Student: ask a question (RAG + LLM)

```
User types question → POST /ask/
  Body: {
    question,
    session_id,
    top_k: 4,
    course_id?,      // optional filter from URL ?course_id=
    section_id?
  }

Server:
  1. INSERT user message → chat_messages (production)
  2. Load last N turns from chat_messages → format as {history}
  3. Build retriever from PGVector:
       - search_type: mmr
       - k: top_k
       - filter: course_id / section_id if provided
  4. retriever.invoke(question) → relevant chunks (ONCE — avoid double retrieval)
  5. Build prompt:
       - system instructions
       - history
       - context (chunk text)
       - question
  6. Call LLM (GPT-5.4 mini) → answer
  7. INSERT assistant message (+ sources JSON) → chat_messages
  8. UPDATE chat_sessions.title (first question) and updated_at
  9. Return JSON:
       { session_id, question, answer, sources[], total_sources }

Frontend:
  - Append user + assistant bubbles
  - Update sidebar session title in recent list
```

**Latency budget (typical):**

| Step | Time |
|------|------|
| DB writes/reads | &lt; 20 ms |
| Vector search | 20–100 ms |
| LLM | 1–5+ s |
| **User-perceived** | Dominated by LLM |

---

### 9.7 Student: refresh page

```
F5 → read session_id from localStorage
   → GET /api/sessions/{id}/messages
   → UI redraws — chat unchanged (ChatGPT behavior)
```

---

### 9.8 Student: open old chat from sidebar

```
Click "Week 3 - Recursion" in sidebar
  → set active session_id in localStorage
  → GET /api/sessions/{id}/messages
  → display that thread
```

---

### 9.9 Student: new chat

```
Click "New chat"
  → POST /api/sessions
  → new session_id in localStorage
  → clear UI (welcome message only)
```

---

### 9.10 End-to-end diagram (question path)

```mermaid
sequenceDiagram
    participant U as Student Browser
    participant API as FastAPI (EC2)
    participant DB as RDS Postgres
    participant V as PGVector
    participant AI as OpenAI

    U->>API: POST /ask {question, session_id, course_id}
    API->>DB: Save user message
    API->>DB: Load last 5 turns
    API->>V: Similarity search (filtered by course)
    V-->>API: Top-k chunks
    API->>AI: Chat completion (context + history + question)
    AI-->>API: Answer
    API->>DB: Save assistant message + sources
    API-->>U: JSON answer + citations
```

---

## 10. API reference (summary)

### Chat / RAG

| Method | Path | Description |
|--------|------|-------------|
| POST | `/ask/` | Ask question (RAG + LLM) |
| GET | `/ask/session/{id}` | Get history (move to DB-backed) |
| DELETE | `/ask/session/{id}` | Clear session |

### Planned session API (production)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/sessions` | Create new chat |
| GET | `/api/sessions` | List chats for user |
| GET | `/api/sessions/{id}/messages` | Full message list |
| DELETE | `/api/sessions/{id}` | Delete chat |

### Courses / admin

| Method | Path | Description |
|--------|------|-------------|
| POST/GET | `/courses` | CRUD courses |
| POST/GET | `/courses/{id}/sections` | Sections |
| POST | `.../assets/file` | Upload & ingest file |
| POST | `.../assets/url` | Ingest URL |
| DELETE | `.../assets/{id}` | Remove asset + vectors |

### Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness (extend with DB ping) |

Swagger: `https://your-api-domain/docs`

---

## 11. Security checklist

| Item | Status (MVP) | Production action |
|------|--------------|-------------------|
| HTTPS everywhere | Dev only | Nginx + cert or Cloudflare |
| Secrets in git | Must not | Secrets Manager / `.env` on server only |
| Admin password in frontend | **Yes (bad)** | Server auth + bcrypt |
| `/ask` open to public | **Yes** | JWT or API key per student |
| CORS | Configured | Set `FRONTEND_ORIGINS` to real domain only |
| RDS | — | Private subnet, security group: EC2 only |
| Rate limiting | No | slowapi: e.g. 30 req/min per user |
| Input validation | Partial | Max upload size, URL allowlist |
| SQL injection | ORM | Keep using SQLAlchemy |
| File upload | Extension check | Add virus scan for production if required |

---

## 12. Deployment and CI/CD

### 12.1 Build artifacts

```bash
# Backend — on EC2 or in CI
pip install -r requirements.txt

# Frontend
cd frontend && npm ci && npm run build
# Serve dist/ via Nginx
```

### 12.2 Run command (production)

```bash
gunicorn app.main:app \
  -k uvicorn.workers.UvicornWorker \
  -w 4 \
  -b 127.0.0.1:8000 \
  --timeout 120
```

### 12.3 GitHub Actions (outline)

```
on: push to main
  jobs:
    deploy:
      - run tests (optional)
      - build frontend
      - rsync / SSH / SSM to EC2
      - docker compose pull && up -d  (if using Docker)
      - run alembic migrations (when added)
      - curl https://your-domain/health
```

### 12.4 RDS setup notes

1. Create PostgreSQL 15+ instance.
2. Enable `pgvector` extension: `CREATE EXTENSION vector;`
3. Set `DATABASE_URL` on EC2 from Secrets Manager.
4. Security group: allow port 5432 **only from EC2 security group**.

---

## 13. Production roadmap (phases)

### Phase 1 — Core reliability (1–2 weeks)

- [ ] OpenAI: `GPT-5.4 mini` + `text-embedding-3-small`
- [ ] Postgres: `chat_sessions` + `chat_messages`
- [ ] Replace in-memory `session_store` in `app/routes/query.py`
- [ ] Session list API for sidebar
- [ ] Gunicorn multi-worker, no `reload=True`
- [ ] Fix double retrieval in `/ask` (search once)
- [ ] Server-side admin authentication
- [ ] Deep `/health` (DB + OpenAI)

### Phase 2 — Deploy (1 week)

- [ ] EC2 + RDS + Nginx + HTTPS
- [ ] GitHub Actions deploy pipeline
- [ ] Secrets Manager for keys
- [ ] Production `.env` / CORS lockdown

### Phase 3 — UX and scale (1–2 weeks)

- [ ] SSE streaming responses
- [ ] Background ingest queue (Celery/RQ) for large PDFs
- [ ] Rate limiting on `/ask`
- [ ] Student JWT / LMS integration
- [ ] Sentry + CloudWatch alarms

### Phase 4 — Optional

- [ ] ALB + second EC2
- [ ] S3 for uploads
- [ ] Reranker (Cohere)
- [ ] Multi-AZ RDS

---

## 14. Repository structure

```
rag-system/
├── app/
│   ├── main.py              # FastAPI app, CORS, routers
│   ├── config.py            # Environment variables
│   ├── db/
│   │   ├── models.py        # Course, Section, KnowledgeAsset
│   │   └── session.py       # SQLAlchemy engine
│   ├── routes/
│   │   ├── courses.py       # Ingestion, CRUD
│   │   └── query.py         # /ask RAG endpoint
│   └── services/
│       ├── loader.py        # PDF/DOCX/URL loading
│       ├── splitter.py      # Text chunking
│       ├── embedder.py      # Embeddings (HF today → OpenAI prod)
│       ├── llm.py             # LLM (HF today → OpenAI prod)
│       ├── vectorstore.py   # PGVector connection
│       └── vector_cleanup.py
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── ChatPage.tsx     # Student chat UI
│       │   └── AdminPage.tsx    # Course & upload management
│       ├── services/
│       │   └── chatService.ts   # API client
│       └── store/
│           └── useChatStore.ts  # UI state
├── data/                    # Uploaded files (local)
├── requirements.txt
├── run.py                   # Dev server only
├── README.md                # Local setup
└── PRODUCTION_GUIDE.md      # This document
```

---

## Quick reference card

| Question | Answer |
|----------|--------|
| Where are chats stored? | **RDS** (`chat_sessions`, `chat_messages`) |
| Where are vectors stored? | **RDS** (PGVector collection) |
| Best LLM for students? | **GPT-5.4 mini** (Standard) |
| Best embeddings? | **text-embedding-3-small** |
| Need ALB? | Not until 2+ EC2 or strict zero-downtime deploys |
| Need Redis? | Not required; Postgres is enough for sessions |
| EC2 down = RDS down? | **No** — RDS is independent |
| Main cost driver? | **Number of student questions** (OpenAI), then EC2 + RDS |
| ~Monthly @ 100 students (moderate chat)? | **~$180** (OpenAI + AWS) |
| ~Monthly @ 200 students (moderate chat)? | **~$280** |
| ~Monthly @ 500 students (moderate chat)? | **~$545** |
| Can costs be reduced? | **Yes** — see [§6.5](#65-cost-minimization-lms--rag) |

---

*Document version: 1.1 — LMS scale costing (50–500 students). Update pricing from OpenAI/AWS consoles before budgeting.*
