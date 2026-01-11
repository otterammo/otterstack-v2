# Servarr Stack

Media management services for automated downloads and organization.

## Services and access
- Sonarr: `https://<TAILSCALE_HOST>:8989` (Traefik entrypoint `sonarr`, Authelia protected)
- Radarr: `https://<TAILSCALE_HOST>:7878` (Traefik entrypoint `radarr`, Authelia protected)
- Prowlarr: `https://<TAILSCALE_HOST>:9696` (Traefik entrypoint `prowlarr`, Authelia protected)
- Bazarr: `https://<TAILSCALE_HOST>:6767` (Traefik entrypoint `bazarr`, Authelia protected)

## Configuration
- Sonarr config: `servarr/sonarr/config`
- Radarr config: `servarr/radarr/config`
- Prowlarr config: `servarr/prowlarr/config`
- Bazarr config: `servarr/bazarr/config`

## Media paths
- TV: `TV_PATH` -> `/tv`
- Movies: `MOVIES_PATH` -> `/movies`
- Downloads: `DOWNLOADS_PATH` -> `/downloads`

## Environment
- `PUID`, `PGID`, `TZ`

## Dependencies
- qBittorrent on the `download-net` network for download client integration.

## Start/stop
```bash
docker compose up -d
docker compose logs -f sonarr
```
