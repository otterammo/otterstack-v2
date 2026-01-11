# Jellyfin

Media server for movies, TV, and music.

## Access
- Public: `http(s)://<PUBLIC_JELLYFIN_DOMAIN>` (Traefik entrypoint `web`)
- Private: `https://<TAILSCALE_HOST>:8096` (Traefik entrypoint `jellyfin`)

## Configuration
- Config: `jellyfin/config`
- Cache: `jellyfin/cache`
- Media mounts:
  - `MOVIES_PATH` -> `/media/movies`
  - `TV_PATH` -> `/media/tv`
  - `MUSIC_PATH` -> `/media/music`

## Environment
- `PUID`, `PGID`, `TZ`
- `TAILSCALE_HOST` (used by `JELLYFIN_PublishedServerUrl`)
- `PUBLIC_JELLYFIN_DOMAIN`

## Notes
- DLNA and auto-discovery ports are disabled; configure clients manually.

## Start/stop
```bash
docker compose up -d
docker compose logs -f jellyfin
```
