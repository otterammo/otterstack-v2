# Media Stack AI Coding Instructions

## Architecture Overview

This is a **Docker Compose-based media management stack** using a modular architecture with Traefik as the reverse proxy. The stack includes:

- **Jellyfin** (media streaming) - Port 8096, accessible at `jellyfin.local`
- **Jellyseerr** (media requests) - Request management interface
- **Servarr Suite**: Sonarr (TV), Radarr (movies), Prowlarr (indexers), Bazarr (subtitles)
- **qBittorrent** (downloads) - Handles media acquisition
- **Traefik** (reverse proxy) - Routes all services via `.local` domains
- **Cloudflared** (tunnel) - Secure remote access without port forwarding
- **Custom Dashboard** (Nginx-based) - Service overview interface

## Key Architecture Patterns

### Modular Docker Compose Structure
```
docker-compose.yml (root) includes all service compose files
├── traefik/docker-compose.yml
├── jellyfin/docker-compose.yml
├── servarr/docker-compose.yml (multi-service file)
└── cloudflared/docker-compose.yml
```

### Traefik Label Convention
All services use consistent Traefik labels:
```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.{service}.rule=Host(`{service}.local`)"
  - "traefik.http.routers.{service}.entrypoints=web"
  - "traefik.http.services.{service}.loadbalancer.server.port={port}"
```

### Volume Mount Strategy
- **Config persistence**: Each service has `./service/config:/config`
- **Media access**: Read-only mounts to `/mnt/external/{movies,tv,music}`
- **Shared downloads**: Common `/mnt/external/downloads` for acquisition pipeline

## Critical Workflows

### Service Management
Use the unified script: `./media-stack.sh {start|stop|restart|status|logs [service]}`

### Remote Access Setup
1. Configure `.env` from `.env.template` (especially `CLOUDFLARE_TUNNEL_TOKEN`)
2. Set up Cloudflare tunnel routes pointing to `http://traefik:80` with appropriate Host headers
3. Use `setup-traefik.sh` to configure local `.local` domain access

### Network Architecture
- Single `media-network` bridge network connects all services
- Traefik discovers services automatically via Docker provider
- Cloudflared tunnels through Traefik for external access

## Development Conventions

### Environment Configuration
- Copy `.env.template` to `.env` before first run
- Use consistent PUID/PGID (1000/1000) across all LinuxServer.io images
- External mount points reference `/mnt/external/` - adjust for your system
- Environment variables support defaults: `${PUID:-1000}`

### Docker Compose Best Practices

**Standard Service Template**:
```yaml
services:
  service-name:
    image: linuxserver/service:latest
    container_name: service-name
    restart: unless-stopped
    ports:
      - "port:port"
    volumes:
      - ./service/config:/config
      - ${MOVIES_PATH:-/mnt/external/movies}:/movies
      - ${TV_PATH:-/mnt/external/tv}:/tv
    environment:
      - PUID=${PUID:-1000}
      - PGID=${PGID:-1000}
      - TZ=${TZ:-UTC}
    networks:
      - media-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:port/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.service.rule=Host(`service.local`)"
      - "traefik.http.routers.service.entrypoints=web"
      - "traefik.http.services.service.loadbalancer.server.port=port"
```

### Volume Mount Patterns
- **Config paths**: Varies by service (`./config` vs `./service/config`)
- **Media paths**: Use read-only mounts (`:ro`) for media consumption services
- **Download path**: Always `/mnt/external/downloads` for acquisition pipeline

### Port Allocation
Services expose unique ports but route through Traefik:
- Jellyfin: 8096 (also HTTPS 8920, UDP discovery ports)
- Dashboard: 3000
- Traefik: 8090 (dashboard, avoiding qBittorrent's 8080)
- qBittorrent: 8080 + 6881 (TCP/UDP for torrenting)

### Dependency Management
- Use `depends_on` for service startup order (jellyseerr → jellyfin, cloudflared → traefik)
- Services requiring external access should depend on traefik

### Adding New Services
1. Create service-specific `docker-compose.yml` in new directory
2. Add include directive to root `docker-compose.yml`
3. Follow Traefik labeling pattern for automatic discovery
4. Update `setup-traefik.sh` hosts entries
5. Use `traefik.enable=false` for services that don't need web access

### Configuration Persistence
- **Inconsistent patterns**: `./config` (jellyseerr) vs `./service/config` (others)
- Standardize on `./service/config:/config` for consistency
- Special cases: jellyseerr uses `/app/config`, jellyfin separates `/config` and `/cache`

## Integration Points

- **Acquisition Pipeline**: Prowlarr → Sonarr/Radarr → qBittorrent → Jellyfin
- **Remote Access**: Client → Cloudflare → Cloudflared → Traefik → Service
- **Service Discovery**: Traefik auto-discovers services via Docker labels

When modifying this stack, ensure network connectivity through the `media-network` and maintain the Traefik routing patterns for consistent access.