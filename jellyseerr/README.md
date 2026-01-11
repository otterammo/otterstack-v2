# Jellyseerr

Request management and discovery for Jellyfin.

## Access
- Public: `http(s)://<PUBLIC_JELLYSEERR_DOMAIN>` (Traefik entrypoint `web`)
- Private: `https://<TAILSCALE_HOST>:5055` (Traefik entrypoint `jellyseerr`, Authelia protected)

## Configuration
- Config: `jellyseerr/config`

## Environment
- `PUID`, `PGID`, `TZ`
- `PUBLIC_JELLYSEERR_DOMAIN`

## Dependencies
- Depends on Jellyfin; connect it in the Jellyseerr UI after first launch.

## Start/stop
```bash
docker compose up -d
docker compose logs -f jellyseerr
```
