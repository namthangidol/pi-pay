Pi Payment Demo - Full package
=============================

Files included:
- frontend/index.html  (Pi Browser frontend)
- server/index.js      (Express + Postgres example)
- server/admin.html    (Simple admin UI)
- server/package.json
- server/.env.example
- Dockerfile, docker-compose.yml

Quick local setup (with Postgres)
--------------------------------
1. Install Postgres and create database 'pi_pay' (or set DATABASE_URL)
2. Copy server/.env.example -> server/.env and update credentials
3. In project root:
   cd server
   npm install
   node index.js
4. Open http://localhost:3000/ to see frontend
   Open http://localhost:3000/admin to view admin UI

Deploy to VPS (Nginx + Certbot)
-------------------------------
1. Provision a server (Ubuntu 22.04), SSH into it.
2. Install Node.js 18+, Postgres (or use managed), Nginx.
3. Clone this repo to /var/www/pi-pay or copy files.
4. Configure systemd service or use docker-compose (preferred).

Example Nginx site config (replace domain):
------------------------------------------
server {
    listen 80;
    server_name nguyennamthang.com www.nguyennamthang.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}

Then use certbot to obtain cert:
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d nguyennamthang.com -d www.nguyennamthang.com

Security notes
--------------
- Protect /admin with authentication (basic auth or OAuth).
- Never store PI_WALLET_SEED in frontend.
- Use HTTPS and secure DB credentials.
