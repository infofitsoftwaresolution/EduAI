# RAG System - Local Setup and Run Guide

This project contains:
- **Backend**: FastAPI + LangChain RAG pipeline (`app/`, `run.py`)
- **Frontend**: React + Vite chat UI (`frontend/`)
- **Vector DB**: PGVector via `DATABASE_URL`

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
HUGGINGFACEHUB_API_TOKEN=hf_your_new_token
HF_HOME=D:/Cache/huggingface
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
LLM_MODEL=Qwen/Qwen2.5-72B-Instruct
CHROMA_PERSIST_DIR=./chroma_db
DATABASE_URL=postgresql://user:password@host:5432/dbname

FRONTEND_ORIGINS=http://localhost:5173
ALLOW_LOCALHOST_CORS=true
```

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

