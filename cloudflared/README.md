# Cloudflared

Cloudflare Tunnel for secure public access to the media stack without opening router ports.

See `DETAILS.md` for full setup, routing, and troubleshooting.

## Access
- No UI; traffic is routed through Cloudflare Tunnel to Traefik.
- Public hostnames should map to `http://traefik:80` with matching Host headers.

## Configuration
- Tunnel token secret: `secrets/cloudflare_token`
- Cloudflare Zero Trust setup:
  - Create a tunnel
  - Add public hostnames (e.g. `jellyfin`, `jellyseerr`, `dashboard`)
  - Set service to `http://traefik:80` and keep Host header matching the hostname
- Hostnames should match `PUBLIC_JELLYFIN_DOMAIN`, `PUBLIC_JELLYSEERR_DOMAIN`, and `PUBLIC_DASHBOARD_DOMAIN` in `.env`.

## Environment
- `TZ`, `PUID`, `PGID`
- `TUNNEL_TOKEN_FILE` is set in compose to `/run/secrets/cloudflare_token`

## Start/stop
```bash
docker compose up -d cloudflared
docker compose logs -f cloudflared
```

## Troubleshooting
- Check logs: `docker compose logs cloudflared`
- 404 on public domains usually means an incorrect Host header in Cloudflare Tunnel settings.
- Verify tunnel status in Cloudflare Zero Trust dashboard.

## Security
- No ports are exposed on the host.
- Protect public hostnames with Cloudflare Access policies.
- Keep `secrets/cloudflare_token` at `600` permissions.
