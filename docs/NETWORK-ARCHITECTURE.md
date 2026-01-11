# Network Architecture

## Overview
This document describes the current network architecture for the media server host running Docker containers orchestrated through Docker Compose. The stack uses segmented bridge networks, Traefik entrypoints with TLS, Authelia for SSO on admin services, and Cloudflared for public access. A legacy shared `media-network` remains attached to most services for Traefik discovery and transition compatibility.

## 1. Network Topology Overview

```mermaid
graph TB
    INET[Internet Users]
    TAIL[Admin Users - Tailscale]

    CFD[Cloudflared<br/>dmz-net]
    TR[Traefik<br/>dmz-net]
    FRONT[User Services<br/>Jellyfin, Jellyseerr, Web UI<br/>frontend-net]
    BACK[Automation Services<br/>Sonarr, Radarr, Prowlarr, Bazarr<br/>backend-net]
    DL[Download Stack<br/>Gluetun, qBittorrent<br/>download-net]
    MGMT[Monitoring and Ops<br/>Prometheus, Grafana, Loki, Dozzle<br/>mgmt-net]
    SEC[SSO Services<br/>Authelia, Redis<br/>security-net]
    LEGACY[Shared media-network<br/>Service discovery]

    INET --> CFD --> TR
    TAIL --> TR
    TR --> FRONT
    TR --> BACK
    BACK --> DL
    TR --> MGMT
    TR --> SEC
    TR -.-> LEGACY
```

## 2. External Access and Ingress

```mermaid
graph LR
    USERS[Public Users]
    ADM[Admin Users - Tailscale]
    CF[Cloudflare]
    CFD[Cloudflared]
    TR[Traefik]
    AUTH[Authelia]
    PUB[Public Services]
    ADM_SVC[Admin Services]

    USERS --> CF
    CF --> CFD
    CFD --> TR
    TR --> PUB

    ADM --> TR
    TR --> AUTH
    AUTH --> ADM_SVC

    style TR fill:#9cf,stroke:#333,color:#336699
    style CFD fill:#f96,stroke:#333,color:#9a4d00
    style AUTH fill:#f66,stroke:#333,color:#992222
```

Public services include Jellyfin, Jellyseerr, and the Web UI landing page. Admin services are exposed on Traefik entrypoints and protected by Authelia. Tailscale provides the access boundary for admin entrypoints.

## 3. Port Exposure Strategy

### Traefik Entrypoints (Host Ports)

| Host Port | Entrypoint | Typical Service | Notes |
|---|---|---|---|
| 80 | web | Jellyfin, Jellyseerr, Web UI (public) | HTTP entrypoint, routed by host header |
| 3000 | grafana | Grafana | TLS + Authelia |
| 3001 | web-ui | Web UI admin | TLS + Authelia |
| 5055 | jellyseerr | Jellyseerr admin | TLS + Authelia |
| 6767 | bazarr | Bazarr | TLS + Authelia |
| 7878 | radarr | Radarr | TLS + Authelia |
| 8080 | qbittorrent | qBittorrent | TLS + Authelia |
| 8081 | cadvisor | cAdvisor | TLS + Authelia |
| 8082 | dozzle | Dozzle | TLS + Authelia |
| 8085 | traefik | Traefik dashboard | TLS + Authelia |
| 8096 | jellyfin | Jellyfin admin | TLS (no Authelia by default) |
| 8989 | sonarr | Sonarr | TLS + Authelia |
| 9090 | prometheus | Prometheus | TLS + Authelia |
| 9091 | authelia | Authelia portal | TLS |
| 9093 | alertmanager | Alertmanager | TLS + Authelia |
| 9696 | prowlarr | Prowlarr | TLS + Authelia |

TLS is enabled per-entrypoint. There is no dedicated port 443 entrypoint in this stack.

### Non-Traefik Host Ports

- **6881 (TCP/UDP)**: BitTorrent traffic (Gluetun port forwarding)

## 4. Network Segmentation and Modes

### Network Segments

- **dmz-net**: Traefik, Cloudflared
- **frontend-net**: Jellyfin, Jellyseerr, Web UI, Grafana
- **backend-net**: Sonarr, Radarr, Prowlarr, Bazarr, Jellyseerr
- **download-net**: Gluetun, qBittorrent (via Gluetun), Sonarr, Radarr, Prowlarr
- **mgmt-net**: Prometheus, Alertmanager, Grafana, cAdvisor, Node Exporter, Dozzle, Loki, Promtail, Autoheal, Backup
- **security-net**: Authelia, Redis, Traefik (auth routing)
- **media-network**: Shared bridge for Traefik service discovery and legacy compatibility

### Network Modes

- **Bridge networks**: All segmented networks above plus the shared `media-network`
- **Host network**: `fail2ban` (needs host iptables and log access)
- **Service network mode**: `qbittorrent` uses `network_mode: service:gluetun`

## 5. Media Content Flow

```mermaid
graph TB
    subgraph "User Interface"
        USER[User]
        JS[Jellyseerr<br/>Request Content]
    end

    subgraph "Content Automation"
        SON[Sonarr<br/>TV Shows]
        RAD[Radarr<br/>Movies]
        PRO[Prowlarr<br/>Indexers]
    end

    subgraph "Download Layer"
        GLU[Gluetun VPN]
        QB[qBittorrent<br/>via VPN]
    end

    subgraph "Storage"
        DL[Downloads]
        MEDIA[Media Library]
    end

    subgraph "Playback"
        JF[Jellyfin<br/>Stream Media]
    end

    USER --> JS
    JS --> SON
    JS --> RAD
    SON --> PRO
    RAD --> PRO
    PRO --> QB
    QB --> GLU
    QB --> DL
    SON --> MEDIA
    RAD --> MEDIA
    DL -.->|Import| SON
    DL -.->|Import| RAD
    MEDIA --> JF
    JF --> USER

    style GLU fill:#9f6,stroke:#333,color:#2f6b1f
    style JF fill:#fcf,stroke:#333,color:#7a3b7a
    style JS fill:#fcf,stroke:#333,color:#7a3b7a
```

## 6. Subtitle Management Flow

```mermaid
graph LR
    subgraph "Automation"
        SON[Sonarr<br/>TV Shows]
        RAD[Radarr<br/>Movies]
        BAZ[Bazarr<br/>Subtitles]
    end

    subgraph "Storage"
        TV[TV Shows<br/>/media/tv]
        MOVIES[Movies<br/>/media/movies]
    end

    SON -.->|Notify| BAZ
    RAD -.->|Notify| BAZ
    BAZ -->|Download| TV
    BAZ -->|Download| MOVIES
    SON --> TV
    RAD --> MOVIES

    style BAZ fill:#ff9,stroke:#333,color:#8a7a00
```

## 7. VPN and Download Security

```mermaid
graph TB
    subgraph "Internet"
        VPN_PROV[VPN Provider<br/>Mullvad Wireguard]
        TRACKERS[Torrent Trackers]
    end

    subgraph "download-net"
        GLU[Gluetun<br/>VPN Gateway<br/>TCP/UDP 6881]
        QB[qBittorrent<br/>network_mode: service:gluetun]
        AH[Autoheal<br/>Monitor]
        SERVARR[Sonarr/Radarr]
    end

    GLU -->|Encrypted WireGuard| VPN_PROV
    QB -.->|Uses network of| GLU
    GLU <-->|Via VPN| TRACKERS
    SERVARR -->|Add Torrents| GLU
    AH -.->|Health Check| GLU
    AH -.->|Auto Restart| GLU

    style GLU fill:#9f6,stroke:#333,color:#2f6b1f
    style VPN_PROV fill:#9f6,stroke:#333,color:#2f6b1f
    style QB fill:#ff9,stroke:#333,color:#8a7a00
```

## 8. Monitoring and Logging

```mermaid
graph TB
    subgraph "Metrics Collection"
        NODE[Node Exporter<br/>9100]
        CAD[cAdvisor<br/>8080]
    end

    subgraph "Metrics Processing"
        PROM[Prometheus<br/>9090]
        ALERT[Alertmanager<br/>9093]
    end

    subgraph "Log Aggregation"
        LOKI[Loki<br/>3100]
        PT[Promtail<br/>9080]
    end

    subgraph "Visualization"
        GRAF[Grafana<br/>3000]
        DOZ[Dozzle<br/>8080]
    end

    NODE -->|Scrape| PROM
    CAD -->|Scrape| PROM
    PROM -->|Query| GRAF
    PROM -->|Send| ALERT

    PT --> LOKI
    LOKI --> GRAF

    style PROM fill:#ff9,stroke:#333,color:#8a7a00
    style GRAF fill:#9cf,stroke:#333,color:#336699
```

## 9. Service Discovery and Management

```mermaid
graph TB
    subgraph "Host"
        DOCKER[Docker Engine<br/>/var/run/docker.sock]
    end

    subgraph "Management Layer"
        TR[Traefik<br/>Auto-discovery]
        DOZ[Dozzle<br/>Log Viewer]
        AH[Autoheal<br/>Health Monitor]
        CAD[cAdvisor<br/>Metrics]
    end

    subgraph "All Services"
        SVC[Containers<br/>with labels & health checks]
    end

    DOCKER -.->|Read| TR
    DOCKER -.->|Read| DOZ
    DOCKER -.->|Control| AH
    DOCKER -.->|Monitor| CAD
    TR -->|Route to| SVC
    AH -.->|Restart unhealthy| SVC

    style TR fill:#9cf,stroke:#333,color:#336699
    style DOCKER fill:#f96,stroke:#333,color:#9a4d00
```

## 10. Access Paths

- **Public access**: Cloudflared tunnel to Traefik entrypoint `web` (port 80). Hostnames map to `PUBLIC_JELLYFIN_DOMAIN`, `PUBLIC_JELLYSEERR_DOMAIN`, and `PUBLIC_DASHBOARD_DOMAIN`.
- **Local access**: Jellyfin and Jellyseerr can also be accessed via `.lan` domains on port 80.
- **Admin access**: `https://<TAILSCALE_HOST>:<entrypoint>` with Authelia protecting admin services.

## 11. Service Communication Patterns

### Content Request Flow
```
User -> Jellyseerr -> Sonarr/Radarr -> Prowlarr (indexers) -> qBittorrent (via Gluetun VPN) -> Downloads
```

### Content Organization Flow
```
Downloads -> Sonarr/Radarr (organize) -> Media Storage -> Jellyfin (stream)
Bazarr -> Download subtitles -> Media Storage
```

### Monitoring Flow
```
Node Exporter/cAdvisor -> Prometheus -> Grafana (visualization)
Prometheus -> Alertmanager (alerts)
Promtail -> Loki -> Grafana (logs)
```

## 12. Security Layers

1. **VPN Isolation**: All torrent traffic forced through Gluetun VPN
2. **Fail2ban**: Monitors logs and blocks malicious IPs at host level
3. **Traefik**: Reverse proxy with per-entrypoint TLS
4. **Authelia**: SSO protection for admin services
5. **Cloudflared**: Secure public access without port forwarding
6. **Secrets**: Sensitive credentials stored as Docker secrets
7. **Autoheal**: Automatically restarts unhealthy containers

## 13. Dependencies

1. Traefik (reverse proxy and entrypoints)
2. Authelia + Redis (SSO services)
3. Gluetun (VPN gateway)
4. qBittorrent (depends on Gluetun network)
5. Cloudflared (depends on Traefik)
6. Jellyfin, Jellyseerr, Servarr stack
7. Monitoring and logging stack

## 14. Resource Allocation

- **Heavy**: Jellyfin (2G), qBittorrent (4G), Sonarr (1G)
- **Medium**: Grafana (256M), Radarr/Bazarr (512M), Prometheus (512M)
- **Light**: Alertmanager/cAdvisor/Node Exporter/Authelia (128M to 256M)

## 15. Health Monitoring

All services implement health checks:
- **HTTP-based**: Most web services (curl/wget to health endpoints)
- **Command-based**: fail2ban (fail2ban-client ping)
- **VPN-specific**: Gluetun (connectivity to 1.1.1.1:443)

## 16. Key Features

1. **Auto-healing**: Gluetun VPN container auto-restarts on failure
2. **Service discovery**: Traefik auto-discovers services via Docker labels
3. **Centralized logging**: Loki and Dozzle provide log access
4. **Metrics collection**: Prometheus and Grafana cover the full stack
5. **Secure downloads**: VPN kill-switch ensures no leaks
