# Dozzle

Live log viewer for Docker containers.

## Access
- `https://<TAILSCALE_HOST>:8082` (Traefik entrypoint `dozzle`, Authelia protected)

## Configuration
- `DOZZLE_LEVEL`, `DOZZLE_TAILSIZE`, `DOZZLE_FILTER`, `DOZZLE_NO_ANALYTICS`
- Requires read-only Docker socket at `/var/run/docker.sock`

## Start/stop
```bash
docker compose up -d
docker compose logs -f dozzle
```
