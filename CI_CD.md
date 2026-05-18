# CI/CD and HTTPS Guide

## Why the browser shows "Not secure"

You are opening the app with **HTTP on a raw IP**:

```text
http://3.108.84.178
```

Browsers mark that as **Not secure** because:

- traffic is not encrypted (no HTTPS)
- there is no trusted certificate for an IP address

This is **normal for now**. Admin upload and chat still work.

### What removes "Not secure" properly

You need **both**:

1. A **domain name** (example: `app.utrains.com`)
2. **HTTPS certificate** (free with Let's Encrypt)

You said domain comes later — that is the right order. There is no clean way to get a trusted green padlock on a bare IP only.

### When you have a domain (later checklist)

1. Point domain **A record** to your Elastic IP
2. Open EC2 security group port **443**
3. Install Certbot on EC2 and issue a certificate
4. Update nginx to serve HTTPS on port 443
5. Update `.env.production`:

```env
PUBLIC_APP_URL=https://app.utrains.com
FRONTEND_ORIGINS=https://app.utrains.com
```

6. Redeploy containers

Until then, **HTTP + IP is acceptable for internal/client demo**, not for public production launch.

---

## CI/CD setup (GitHub Actions → EC2)

Goal: when you push to `main`, GitHub automatically SSHs into EC2, pulls code, and runs Docker Compose.

### Files in this repo

- `.github/workflows/deploy-ec2.yml` — GitHub Actions workflow
- `scripts/deploy-ec2.sh` — deploy script that runs on EC2

### One-time setup

#### 1. Push this repo to GitHub

Your code must be on GitHub (private repo is fine).

#### 2. On EC2 — make sure git remote is GitHub

```bash
cd ~/rag-system
git remote -v
```

If needed:

```bash
git remote set-url origin https://github.com/YOUR_ORG/rag-system.git
```

For private repos, set up a GitHub deploy key or personal access token on EC2.

#### 3. Make deploy script executable (once)

```bash
chmod +x ~/rag-system/scripts/deploy-ec2.sh
```

#### 4. EC2 security group — allow GitHub Actions to SSH

GitHub Actions runs from changing cloud IPs, so for CI/CD you usually allow:

- Port **22** from **0.0.0.0/0** (SSH key still required — no password login)

Your key file stays secret; only someone with the `.pem` can log in.

Optional later: use a **self-hosted GitHub runner** on EC2 for tighter SSH rules.

#### 5. Add GitHub repository secrets

GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

| Secret name | Value |
|-------------|--------|
| `EC2_HOST` | Your Elastic IP, example: `3.108.84.178` |
| `EC2_USER` | `ec2-user` |
| `EC2_SSH_KEY` | Full contents of `rag-system-key.pem` (copy entire file including `BEGIN`/`END` lines) |

Do **not** commit the `.pem` file to Git.

#### 6. Ensure `.env.production` exists only on EC2

CI/CD does **not** overwrite `.env.production`. Keep secrets on the server.

---

## How a deploy works

```text
You push to main
   ↓
GitHub Actions starts
   ↓
SSH into EC2
   ↓
git pull + docker compose up --build -d
   ↓
Health check: /backend/health
```

---

## Manual deploy (same as CI/CD script)

On EC2:

```bash
APP_DIR=~/rag-system ~/rag-system/scripts/deploy-ec2.sh
```

---

## Troubleshooting CI/CD

| Problem | Fix |
|---------|-----|
| SSH permission denied | Check `EC2_SSH_KEY` secret pasted correctly |
| git pull fails on EC2 | Set up GitHub auth on EC2 for private repo |
| Workflow not running | Push must be to branch `main` |
| Health check fails | Check containers: `docker compose -f docker-compose.prod.yml --env-file .env.production ps` |
| Build slow / OOM | t2.medium may struggle on rebuild; watch `docker compose logs` |

---

## Branch name

Workflow deploys on push to **`main`**. If your default branch is `master`, rename it or edit `.github/workflows/deploy-ec2.yml`.
