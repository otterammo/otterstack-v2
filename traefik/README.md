# Traefik

Reverse proxy and edge router for the media stack.

## Entry points
| Entry point | Port | Purpose |
| --- | --- | --- |
| web | 80 | Public HTTP entry point |
| jellyfin | 8096 | Jellyfin |
| jellyseerr | 5055 | Jellyseerr |
| sonarr | 8989 | Sonarr |
| radarr | 7878 | Radarr |
| prowlarr | 9696 | Prowlarr |
| bazarr | 6767 | Bazarr |
| qbittorrent | 8080 | qBittorrent Web UI |
| grafana | 3000 | Grafana |
| prometheus | 9090 | Prometheus |
| alertmanager | 9093 | Alertmanager |
| web-ui | 3001 | Web UI |
| cadvisor | 8081 | cAdvisor |
| dozzle | 8082 | Dozzle |
| traefik | 8085 | Traefik dashboard |
| authelia | 9091 | Authelia portal |

## Configuration
- Dynamic config: `traefik/config/middlewares.yml`, `traefik/config/tls.yml`
- TLS certificates: `traefik/config/certs`
- Access logs: `traefik/logs/access.log`

## Access
- Dashboard: `https://<TAILSCALE_HOST>:8085` (Authelia protected)
- Public HTTP: port `80` for Cloudflared/public routes

## Requirements
- Docker socket mounted read-only at `/var/run/docker.sock`
- Networks: `dmz-net`, `frontend-net`, `backend-net`, `security-net`, `download-net`, `mgmt-net`

## Start/stop
```bash
docker compose up -d
docker compose logs -f traefik
```
