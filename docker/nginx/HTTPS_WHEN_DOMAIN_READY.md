# HTTPS When You Have a Domain

Use this after you buy/connect a domain (example: `app.utrains.com`).

## Prerequisites

- Domain A record points to your Elastic IP
- EC2 security group allows port **443**
- App already works on HTTP

## Steps on EC2

### 1. Install Certbot

```bash
sudo dnf install -y certbot
```

Stop nginx proxy temporarily so Certbot can bind port 80:

```bash
cd ~/rag-system
docker compose -f docker-compose.prod.yml --env-file .env.production stop proxy
```

### 2. Issue certificate

```bash
sudo certbot certonly --standalone -d app.utrains.com
```

Certificates will be in:

```text
/etc/letsencrypt/live/app.utrains.com/
```

### 3. Update nginx config

Create `docker/nginx/prod-ssl.conf` with SSL paths and mount it in `docker-compose.prod.yml` proxy service. Add port `443:443` and certificate volume mounts.

### 4. Update `.env.production`

```env
PUBLIC_APP_URL=https://app.utrains.com
FRONTEND_ORIGINS=https://app.utrains.com
```

### 5. Redeploy

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up --build -d
```

### 6. Auto-renew

```bash
sudo certbot renew --dry-run
```

Set up a cron job or systemd timer for renewal.

After this, the browser tab should show **secure** (padlock) for your domain.
