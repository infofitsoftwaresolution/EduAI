# Local Development with Docker

Run the full stack on your computer with one command. No separate Python venv or `npm run dev` required.

## What starts

| Container | URL | Purpose |
|-----------|-----|---------|
| `frontend` | http://localhost:5173 | React UI (nginx) |
| `api` | http://localhost:8000 | FastAPI backend |
| `postgres` | localhost:5433 | Users, courses, chat |
| `elasticsearch` | http://localhost:9200 | RAG chunks + vectors |

PostgreSQL is exposed on **5433** (not 5432) to avoid clashing with a local Postgres install.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- OpenAI API key

## First-time setup

### 1. Clone the repo

```powershell
git clone https://github.com/infofitsoftwaresolution/EduAI.git
cd EduAI
```

Your local folder name can differ from the repo name (e.g. `rag-system`).

### 2. Create `.env`

From project root:

```powershell
Copy-Item .env.docker.example .env
```

Edit `.env` and set at least:

```env
OPENAI_API_KEY=sk-your-real-key
```

Optional overrides (defaults are fine for local):

```env
JWT_SECRET=local-dev-secret
ADMIN_EMAIL=admin@eduai.local
ADMIN_PASSWORD=EduAI_Admin_2026
```

**Never commit `.env`** — it is gitignored.

### 3. Start the stack

```powershell
docker compose up --build
```

First run may take 10–20 minutes (downloads images).

**Detached mode** (terminal stays free):

```powershell
docker compose up --build -d
```

## URLs to test

| URL | Expected |
|-----|----------|
| http://localhost:5173 | App UI |
| http://localhost:8000/health | `{"status":"ok"}` |
| http://localhost:8000/docs | Swagger API docs |
| http://localhost:9200/_cluster/health | Elasticsearch healthy |

**Default admin login** (unless you changed `.env`):

```text
Email:    admin@eduai.local
Password: EduAI_Admin_2026
```

## Test flow

1. Open http://localhost:5173 and log in as admin.
2. Admin → create course → section → upload a PDF or TXT.
3. Chat → ask a question about the uploaded file.
4. Confirm answer uses your content.

## Daily commands

```powershell
# Start (foreground, see logs)
docker compose up

# Start (background)
docker compose up -d

# Stop containers (keep data)
docker compose down

# Stop and delete local DB/ES data (fresh start)
docker compose down -v

# Check status
docker compose ps

# View logs
docker compose logs -f api
docker compose logs -f
```

## Where config comes from

| Setting | Source |
|---------|--------|
| OpenAI, JWT, admin | Root `.env` |
| Postgres / Elasticsearch URLs | Hardcoded in `docker-compose.yml` for containers |
| Frontend API URL | Built as `http://localhost:8000` in `docker-compose.yml` |

You do **not** need `DATABASE_URL` in `.env` for local Docker — Compose sets it for the API container.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `docker compose` not found | Start Docker Desktop; run `docker compose version` |
| Port already in use | Stop other apps on 5173/8000/5433/9200 or change ports in `docker-compose.yml` |
| API unhealthy | `docker compose logs api` — often missing `OPENAI_API_KEY` |
| Elasticsearch exits | Ensure Docker has enough RAM (4 GB+); restart: `docker compose up -d` |
| Chat message disappears | Rebuild frontend after pulling latest code |

## Stop local Docker before using production EC2

Local Docker and EC2 are separate. Stopping local stack does not affect EC2:

```powershell
docker compose down
```
