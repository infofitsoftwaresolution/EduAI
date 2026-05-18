# RAG System - Local Setup and Run Guide

This project contains:
- **Backend**: FastAPI + LangChain RAG pipeline (`app/`, `run.py`)
- **Frontend**: React + Vite chat UI (`frontend/`)
- **App DB**: PostgreSQL via `DATABASE_URL`
- **Vector/Search DB**: Elasticsearch via `ELASTICSEARCH_URL`

For local Docker Compose setup with PostgreSQL and Elasticsearch, see `DOCKER_LOCAL.md`.
For the beginner EC2 production flow on Amazon Linux, see `EC2_DEPLOYMENT.md`.

## 1) Prerequisites

- Python 3.10+ (recommended)
- Node.js 18+ and npm
- PostgreSQL/PGVector database (Supabase PG works)
- Hugging Face token with inference/chat access

## 2) Backend Setup

From project root:

```bash
python -m venv venv
```

Activate venv:

- Windows PowerShell:

```bash
.\venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create backend `.env` in project root (use `.env.example` as template):

```env
OPENAI_API_KEY=sk_your_openai_key
LLM_MODEL=gpt-5.4-mini
EMBEDDING_MODEL=text-embedding-3-small
VECTOR_COLLECTION_NAME=rag_knowledge_base_openai
ELASTICSEARCH_INDEX_NAME=rag_knowledge_base_openai
ELASTICSEARCH_URL=http://localhost:9200
EMBEDDING_DIMENSIONS=1536
DATABASE_URL=postgresql://user:password@host:5432/dbname

FRONTEND_ORIGINS=http://localhost:5173
ALLOW_LOCALHOST_CORS=true
```

Notes:
- This project uses **PostgreSQL** (`DATABASE_URL`) for users/courses/assets/chat.
- This project uses **Elasticsearch** (`ELASTICSEARCH_URL`) for RAG chunks, embeddings, and vector search.
- Share real token and DB URL privately (do not commit them).

Run backend:

```bash
python run.py
```

Backend URLs:
- Health: `http://localhost:8000/health`
- Swagger: `http://localhost:8000/docs`

## 3) Frontend Setup

From `frontend/`:

```bash
npm install
```

Create `frontend/.env` from `frontend/.env.example`:

```env
VITE_API_BASE_URL=http://localhost:8000
```

Run frontend:

```bash
npm run dev
```

Open:
- `http://localhost:5173`

## 4) Basic Test Flow

1. Start backend first.
2. Start frontend.
3. Ask a message in chat.
4. Create a new session, ask again.
5. Reopen older session from sidebar.
6. Delete a session from sidebar.

## 5) Notes for Production

- Set `ALLOW_LOCALHOST_CORS=false`
- Set `FRONTEND_ORIGINS` to real frontend/LMS domains (comma-separated)
- Set `frontend/.env.production` with deployed backend URL:

```env
VITE_API_BASE_URL=https://api.your-domain.com
```

- Rotate HF token if previously exposed.

