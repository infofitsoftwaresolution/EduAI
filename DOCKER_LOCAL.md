# Local Docker Compose Setup

This is the beginner-friendly local setup for Chapter 2.

## What Docker Compose Starts

When you run one Compose command, Docker starts these containers:

- `frontend`: the React app, served by nginx on `http://localhost:5173`
- `api`: the FastAPI backend on `http://localhost:8000`
- `postgres`: local PostgreSQL for users, courses, assets, and chat on `localhost:5433`
- `elasticsearch`: local Elasticsearch on `http://localhost:9200`

After Chapter 3, Elasticsearch stores the RAG chunks, embeddings, and source metadata used for vector search.

## First-Time Setup

From the project root, create `.env` if you do not already have one:

```powershell
Copy-Item .env.docker.example .env
```

If `.env` already exists, do not overwrite it. Just make sure it contains:

```env
OPENAI_API_KEY=your_real_key
```

Do not commit `.env`. It contains secrets.

## Start Everything

```powershell
docker compose up --build
```

First run can take several minutes because Docker downloads images and installs dependencies.

Open these URLs:

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:8000/health`
- Backend docs: `http://localhost:8000/docs`
- Elasticsearch health: `http://localhost:9200/_cluster/health`

Default admin login:

```text
admin@eduai.local
EduAI_Admin_2026
```

## Stop Everything

Press `Ctrl+C` in the terminal, then run:

```powershell
docker compose down
```

This stops containers but keeps database data in Docker volumes.

## Reset Local Data

Only run this if you want to delete local PostgreSQL and Elasticsearch data:

```powershell
docker compose down -v
```

The `-v` flag deletes the local Docker volumes.
