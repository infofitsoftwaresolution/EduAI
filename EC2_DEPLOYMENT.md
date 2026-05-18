# EC2 Deployment Notes

This is the beginner flow for running the app on one Amazon Linux EC2 server.

## What Will Run On EC2

One EC2 machine will run Docker. Docker Compose will start:

- `proxy`: public nginx front door on port `80`
- `frontend`: React static app, private inside Docker
- `api`: FastAPI backend, private inside Docker
- `postgres`: app database for users, courses, assets, and chat, private inside Docker
- `elasticsearch`: RAG chunks, embeddings, and vector search, private inside Docker

Only `proxy` is public. PostgreSQL and Elasticsearch should not be opened to the internet.

## Production Request Flow

```text
Browser
  -> EC2 port 80
  -> nginx proxy
     -> frontend container for the UI
     -> api container for /backend/... requests
```

The frontend uses:

```env
VITE_API_BASE_URL=/backend
```

That means a browser request like:

```text
/backend/auth/login
```

is received by nginx, then nginx forwards it to FastAPI as:

```text
/auth/login
```

## Files Added For Production

- `docker-compose.prod.yml`: production Compose stack for EC2
- `.env.production.example`: template for server secrets/settings
- `docker/nginx/prod.conf`: nginx proxy config

## First EC2 Server Setup

Use **Amazon Linux 2023**.

Install Docker:

```bash
sudo dnf update -y
sudo dnf install -y docker git
sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user
```

After `usermod`, log out of SSH and log in again.

Check Docker:

```bash
docker --version
docker compose version
```

If `docker compose version` fails, install the Docker Compose plugin before continuing.

Elasticsearch also needs this Linux setting:

```bash
echo "vm.max_map_count=262144" | sudo tee /etc/sysctl.d/99-elasticsearch.conf
sudo sysctl --system
```

## Security Group

Open only:

- `22` SSH from your IP
- `80` HTTP from anywhere
- `443` HTTPS from anywhere later when SSL is added

Do not open:

- `5432` or `5433` PostgreSQL
- `9200` Elasticsearch
- `8000` FastAPI

## First Manual Deploy

On EC2:

```bash
git clone <your-repo-url>
cd rag-system
cp .env.production.example .env.production
```

Edit `.env.production` and set real values:

```bash
nano .env.production
```

Start the production stack:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up --build -d
```

Check containers:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production ps
```

Check logs:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f
```

Stop containers:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production down
```

## First Browser Test

Open:

```text
http://EC2_PUBLIC_IP
```

Backend health through nginx:

```text
http://EC2_PUBLIC_IP/backend/health
```

## Important Data Note

Docker volumes hold production data:

- `postgres-data`
- `elasticsearch-data`

Do not delete volumes unless you intentionally want to delete production data.

This command deletes containers but keeps data:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production down
```

This command deletes data too, so avoid it in production:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production down -v
```
