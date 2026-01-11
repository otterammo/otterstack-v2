# Web UI

Next.js-based web interface for public landing and admin dashboard.

See `DETAILS.md` for full architecture, deployment, and migration notes.

## Access
- Public site: `https://<PUBLIC_DASHBOARD_DOMAIN>` (Cloudflared) or `http://<PUBLIC_DASHBOARD_DOMAIN>` on LAN
- Admin dashboard: `https://<TAILSCALE_HOST>:3001` (Authelia protected)
- Local dev: `http://localhost:3000`

## Configuration
- Service list: `web-ui/src/lib/services.ts`
- Routes:
  - `/` (public landing)
  - `/admin` (login)
  - `/admin/dashboard` (admin dashboard)
  - `/api/health` (all services)
  - `/api/health/[id]` (single service)
- Admin password secret for Docker: `secrets/webui_admin_password`
- Tech stack: Next.js 14 (App Router), TypeScript, Tailwind CSS

## Environment
- `TZ`
- `PUBLIC_JELLYFIN_DOMAIN`, `PUBLIC_JELLYSEERR_DOMAIN`, `PUBLIC_DASHBOARD_DOMAIN`
- `TAILSCALE_HOST`, `SERVER_IP`
- Docker auth: `ADMIN_PASSWORD_FILE=/run/secrets/webui_admin_password`
- Local dev auth: `ADMIN_PASSWORD`

## Start/stop
```bash
# Docker
docker compose up -d
docker compose logs -f web-ui
```
```bash
# Local development
npm install
npm run dev
```

## Troubleshooting
- Services show offline:
  - Check `docker ps` and `docker logs media-web-ui`
  - Verify health endpoints and networks
- Can't access admin dashboard:
  - Verify `secrets/webui_admin_password` (or `ADMIN_PASSWORD` in dev)
  - Clear browser cookies and retry
- Build fails:
  - Use Node.js 20+
  - Remove `node_modules` and `.next`, then run `npm ci`

## Security
- Admin routes are protected by Authelia and a Web UI password.
- Sessions expire after 24 hours.
- Use a strong password and HTTPS for public access.
