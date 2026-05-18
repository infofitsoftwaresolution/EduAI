# Production Deployment (EC2 + Git + CI/CD)

Deploy to a single **Amazon Linux EC2** server with Docker. Push to GitHub `main` → app updates automatically.

**Repo:** https://github.com/infofitsoftwaresolution/EduAI  
**EC2 project path:** `~/EduAI` (folder name on server)

---

## Architecture

```text
Internet
   → EC2 port 80 (nginx proxy)
        → frontend (React static files)
        → /backend/* → api (FastAPI)
              → postgres (app data)
              → elasticsearch (RAG vectors)
```

Only port **80** (and **443** later) is public. Do not expose 5432, 9200, or 8000.

---

## One-time AWS setup

### 1. Launch EC2

| Setting | Recommendation |
|---------|----------------|
| AMI | Amazon Linux 2023 |
| Instance | t2.medium or t3.medium (4 GB RAM) |
| Storage | 30 GB gp3 |
| Key pair | Download `.pem` — store in `C:\Users\YOU\.ssh\` |

### 2. Security group (inbound)

| Port | Source | Purpose |
|------|--------|---------|
| 22 | 0.0.0.0/0 | SSH (you + GitHub Actions) |
| 80 | 0.0.0.0/0 | Website |
| 443 | 0.0.0.0/0 | HTTPS (later) |

### 3. Elastic IP

Associate an Elastic IP so the public address does not change on reboot.

### 4. Install Docker on EC2 (SSH)

```powershell
ssh -i "$env:USERPROFILE\.ssh\YOUR-KEY.pem" ec2-user@YOUR_ELASTIC_IP
```

On EC2:

```bash
sudo dnf update -y
sudo dnf install -y docker git
sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user
```

Log out and SSH in again.

Install Docker Compose (if `docker compose version` fails):

```bash
sudo mkdir -p /usr/local/lib/docker/cli-plugins
sudo curl -SL https://github.com/docker/compose/releases/download/v2.24.5/docker-compose-linux-x86_64 \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
docker compose version
```

Elasticsearch kernel setting:

```bash
echo "vm.max_map_count=262144" | sudo tee /etc/sysctl.d/99-elasticsearch.conf
sudo sysctl --system
```

### 5. Clone repo on EC2

```bash
cd ~
git clone https://github.com/infofitsoftwaresolution/EduAI.git EduAI
cd EduAI
```

### 6. Create production env file (on EC2 only)

```bash
cp .env.production.example .env.production
nano .env.production
```

Required values:

```env
PUBLIC_APP_URL=http://YOUR_ELASTIC_IP
FRONTEND_ORIGINS=http://YOUR_ELASTIC_IP
VITE_API_BASE_URL=/backend

OPENAI_API_KEY=sk-your-real-key

POSTGRES_PASSWORD=strong_db_password
JWT_SECRET=long_random_secret
ADMIN_EMAIL=admin@yourcompany.com
ADMIN_PASSWORD=strong_admin_password

ES_JAVA_OPTS=-Xms512m -Xmx512m
```

Save: `Ctrl+O`, Enter, `Ctrl+X`.

**Never commit `.env.production` to Git.**

### 7. First manual deploy

```bash
cd ~/EduAI
docker compose -f docker-compose.prod.yml --env-file .env.production up --build -d
docker compose -f docker-compose.prod.yml --env-file .env.production ps
```

Test in browser:

```text
http://YOUR_ELASTIC_IP
http://YOUR_ELASTIC_IP/backend/health
```

---

## CI/CD (automatic deploy on git push)

### How it works

```text
git push origin main
   → GitHub Actions
   → SSH to EC2
   → cd ~/EduAI
   → ./scripts/deploy-ec2.sh
        → git pull
        → docker compose up --build -d
        → health check
```

### GitHub Secrets (repository → Settings → Secrets → Actions)

| Secret | Value |
|--------|--------|
| `EC2_HOST` | Elastic IP (e.g. `3.108.84.178`) |
| `EC2_USER` | `ec2-user` |
| `EC2_SSH_KEY` | Full `.pem` file contents |

Optional:

| Secret | Value |
|--------|--------|
| `EC2_APP_DIR` | `/home/ec2-user/EduAI` if path differs |

App secrets (`OPENAI_API_KEY`, passwords, etc.) stay in **`.env.production` on EC2** — not in GitHub.

### Team workflow

1. Clone repo locally.
2. Develop with Docker — see `DOCKER_LOCAL.md`.
3. Commit and push to `main`.
4. GitHub Actions deploys to shared EC2.
5. Verify in **Actions** tab (green check).

New members need: GitHub repo access + admin shares `.env.production` values / admin login (not the `.pem` in chat).

### Manual deploy on EC2 (same as CI/CD)

```bash
cd ~/EduAI
chmod +x scripts/deploy-ec2.sh
./scripts/deploy-ec2.sh
```

### If `git pull` conflicts on EC2

```bash
cd ~/EduAI
git checkout -- scripts/deploy-ec2.sh
git pull origin main
```

---

## Change production secrets later

SSH to EC2:

```bash
nano ~/EduAI/.env.production
```

Then:

```bash
cd ~/EduAI
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

For `VITE_API_BASE_URL` changes, rebuild frontend:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up --build -d frontend
```

---

## HTTPS and domain (later)

Browsers show **Not secure** on `http://IP` — normal until you add a domain.

When ready:

1. DNS A record → Elastic IP
2. Certbot + nginx SSL on port 443
3. Update `.env.production`:

```env
PUBLIC_APP_URL=https://app.yourdomain.com
FRONTEND_ORIGINS=https://app.yourdomain.com
```

See `docker/nginx/HTTPS_WHEN_DOMAIN_READY.md` for Certbot steps.

---

## Useful EC2 commands

```bash
# Status
docker compose -f docker-compose.prod.yml --env-file .env.production ps

# Logs
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f api

# Stop (keep data)
docker compose -f docker-compose.prod.yml --env-file .env.production down

# Stop and DELETE data (danger)
docker compose -f docker-compose.prod.yml --env-file .env.production down -v
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| CI/CD: `~/rag-system` not found | Use `~/EduAI`; set `EC2_APP_DIR` secret |
| CI/CD: SSH failed | Check secrets, security group port 22 |
| `git pull` auth failed (private repo) | Deploy key or PAT on EC2 |
| Site down after deploy | `docker compose ... logs api` |
| CORS / login fails | `FRONTEND_ORIGINS` must match exact browser URL |
| Elasticsearch OOM | Lower `ES_JAVA_OPTS` or upgrade instance |

---

## File reference

| File | Purpose |
|------|---------|
| `docker-compose.prod.yml` | Production stack |
| `.env.production.example` | Template for server secrets |
| `.github/workflows/deploy-ec2.yml` | GitHub Actions workflow |
| `scripts/deploy-ec2.sh` | Deploy script on EC2 |
| `docker/nginx/prod.conf` | nginx routes `/` and `/backend/` |
