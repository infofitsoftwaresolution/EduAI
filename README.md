# EduAI RAG System

Knowledge-base chat for courses: upload PDFs/URLs, ask questions, get answers with sources.

## Stack

| Layer | Technology |
|-------|------------|
| Backend | FastAPI, LangChain, OpenAI |
| Frontend | React, Vite |
| App database | PostgreSQL (Docker) |
| Vector search | Elasticsearch (Docker) |
| Production host | AWS EC2 + Docker |

## Documentation

| Guide | Use when |
|-------|----------|
| **[DOCKER_LOCAL.md](DOCKER_LOCAL.md)** | Run on your PC with Docker |
| **[PRODUCTION.md](PRODUCTION.md)** | EC2 setup, git push, CI/CD deploy |

## Quick start (local Docker)

```powershell
Copy-Item .env.docker.example .env
# Edit .env — set OPENAI_API_KEY
docker compose up --build
```

Open http://localhost:5173

## Quick start (production)

Push to `main` on GitHub → CI/CD deploys to EC2 (after one-time setup in [PRODUCTION.md](PRODUCTION.md)).

```powershell
git push origin main
```

## Env templates

| File | Purpose |
|------|---------|
| `.env.docker.example` | Local Docker → copy to `.env` |
| `.env.production.example` | EC2 → copy to `.env.production` on server |
| `.env.example` | Reference for non-Docker local dev |

Do not commit real `.env` or `.env.production` files.
