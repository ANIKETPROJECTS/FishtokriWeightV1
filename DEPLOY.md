# FishTokri — VPS Deployment Guide (Ubuntu)

Deploys the API (Express) and built Admin Frontend on one Ubuntu server. Express serves both the API and frontend on **port 3022**; Nginx is optional.

---

## Before You Start — Configure Credentials

The PM2 config loads runtime values from a private `.env` file in the project root. Copy `.env.example` to `.env` on the VPS and fill in the required values:

| Variable | What it is |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `SESSION_SECRET` | Long random session-signing secret; generate with `openssl rand -hex 32` |

Set optional integration credentials in `.env` only if you use those integrations. Never commit `.env` or place live credentials in `ecosystem.config.cjs`.

---

## Step 1 — Install Required Software

SSH into your Ubuntu VPS, then run these commands one by one.

### 1a. Update system packages
```bash
sudo apt update && sudo apt upgrade -y
```

### 1b. Install Node.js 20 (LTS)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v    # should print v20.x.x
npm -v     # should print 10.x.x
```

### 1c. Install PM2
```bash
npm install -g pm2
pm2 -v     # confirm
```

### 1d. Install Nginx (optional)
```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 1e. Install Certbot (optional, for HTTPS through Nginx)
```bash
sudo apt install -y certbot python3-certbot-nginx
```

---

## Step 2 — Clone the Project

```bash
sudo mkdir -p /var/www/fishtokri
sudo chown $USER:$USER /var/www/fishtokri
cd /var/www/fishtokri

# Clone your repo (replace with your actual git URL)
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git .
```

---

## Step 3 — Add VPS Credentials

```bash
cp .env.example .env
nano .env
chmod 600 .env
```

Enter your MongoDB URI and a strong session secret. Add optional integration credentials only if needed. Save with `Ctrl+O`, exit with `Ctrl+X`.

---

## Step 4 — Install & Build

```bash
cd /var/www/fishtokri
npm install
npm run build
```

`npm install` installs root tooling. `npm run build` downloads the workspace-pinned pnpm version, installs the API and frontend dependency closures separately, then builds both. This avoids installing unrelated workspace tools.

After this you will have:
- `artifacts/api-server/dist/index.mjs` — the bundled API server
- `artifacts/fishtokri-admin/dist/public/` — the built React static files

---

## Step 5 — Start the API with PM2

```bash
cd /var/www/fishtokri
pm2 start ecosystem.config.cjs
pm2 save           # save so it auto-starts on reboot
pm2 startup        # follow the printed command to enable startup on boot
```

Check it started:
```bash
pm2 list
pm2 logs fishtokri-api --lines 30
```

The app and API are now running on **port 3022**.

---

## Optional — Put Nginx/HTTPS in Front

This is optional. For a direct deployment, open port 3022 and use the URL in Step 9. If Nginx is already installed or you want a domain/HTTPS, proxy all requests to the app:

Create a new site config:
```bash
sudo nano /etc/nginx/sites-available/fishtokri
```

Paste this (replace `YOUR_SERVER_IP_OR_DOMAIN` with your domain):

```nginx
server {
    listen 80;
    server_name YOUR_SERVER_IP_OR_DOMAIN;

    # Express serves both the API and built frontend.
    location / {
        proxy_pass http://127.0.0.1:3022;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
        client_max_body_size 50M;
    }
}
```

Enable the site and reload Nginx:
```bash
sudo ln -sf /etc/nginx/sites-available/fishtokri /etc/nginx/sites-enabled/fishtokri
sudo nginx -t          # test config — must say "ok"
sudo systemctl reload nginx
```

---

## Step 8 — Open the Firewall Port

```bash
sudo ufw allow 3022/tcp
sudo ufw status        # confirm it shows 3022 ALLOW
```

---

## Step 9 — Test It

Open a browser and go to:
```
http://YOUR_SERVER_IP:3022
```

You should see the FishTokri Admin login page.

Check the API directly:
```
http://YOUR_SERVER_IP:3022/api/
```

---

## Optional — Add HTTPS with Certbot

> Only works if you have a domain name pointed at your server AND port 80 is free.

```bash
sudo certbot --nginx -d yourdomain.com
```

Certbot will automatically update your Nginx config for HTTPS. Access the app at `https://yourdomain.com`; Nginx forwards requests to port 3022.

---

## Day-to-Day Commands

### Pull latest code and redeploy
```bash
cd /var/www/fishtokri
git pull
npm install
npm run build
pm2 restart fishtokri-api --update-env
```

### View live API logs
```bash
pm2 logs fishtokri-api
```

### Restart / stop the API
```bash
pm2 restart fishtokri-api
pm2 stop fishtokri-api
```

### Reload Nginx after config changes
```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## Troubleshooting

| Problem | Check |
|---|---|
| Browser shows "Connection refused" | `sudo ufw allow 3022/tcp` and `pm2 list` (is the app running?) |
| API returns 500 errors | `pm2 logs fishtokri-api` — look for MongoDB connection errors |
| White screen / React not loading | `pm2 logs fishtokri-api` — check for JS errors; also confirm dist folder exists |
| Missing required environment values | Confirm `.env` exists, contains `MONGODB_URI` and `SESSION_SECRET`, and has mode `600` |
| MongoDB connection fails | Check `MONGODB_URI` in the private `.env` file and that your Atlas IP whitelist includes the VPS IP |

---

## Security Note

`ecosystem.config.cjs` reads credentials from `.env`; it does not contain live credential values. The `.env` file is ignored by Git. Keep it private with `chmod 600 .env`, and never paste credential values into GitHub or chat.
