# Network Architecture Diagrams

## Overview
This document describes the network architecture for the media server host running Docker containers orchestrated through Docker Compose.

## 1. Network Topology Overview

```mermaid
graph TB
    INET[Internet Users]

    subgraph Host["Media Server Host"]
        subgraph HostNet["Host Network"]
            F2B[fail2ban]
        end

        subgraph Bridge["media-network Bridge"]
            TR[Traefik<br/>Reverse Proxy]
            SERVICES[17 Services]
        end

        VPN[Gluetun VPN]
    end

    INET -->|Port 80| TR
    INET -->|Cloudflare Tunnel| TR
    TR --> SERVICES
    VPN -->|Encrypted| Internet

    style TR fill:#9cf,stroke:#333
    style F2B fill:#f66,stroke:#333
    style VPN fill:#9f6,stroke:#333
```

## 2. External Access & Ingress

```mermaid
graph LR
    subgraph External
        USERS[Users]
        CF[Cloudflare CDN]
    end

    subgraph Ingress["Ingress Layer"]
        CFD[Cloudflared<br/>Tunnel]
        TR[Traefik<br/>:80]
        F2B[fail2ban<br/>Security]
    end

    subgraph Services
        WUI[Web UI<br/>dashboard.lan<br/>otterammo.xyz]
        JF[Jellyfin<br/>jellyfin.lan]
        OTHERS[Other Services<br/>*.lan domains]
    end

    USERS -->|HTTPS| CF
    USERS -->|LAN| TR
    CF -->|Secure Tunnel| CFD
    CFD --> TR
    TR --> WUI
    TR --> JF
    TR --> OTHERS
    F2B -.->|Protects| TR

    style TR fill:#9cf,stroke:#333
    style CF fill:#f96,stroke:#333
    style F2B fill:#f66,stroke:#333
```

## 3. Media Content Flow

```mermaid
graph TB
    subgraph User["User Interface"]
        USER[User]
        JS[Jellyseerr<br/>:5055<br/>Request Content]
    end

    subgraph Automation["Content Automation"]
        SON[Sonarr<br/>:8989<br/>TV Shows]
        RAD[Radarr<br/>:7878<br/>Movies]
        PRO[Prowlarr<br/>:9696<br/>Indexers]
    end

    subgraph Download["Download Layer"]
        GLU[Gluetun VPN<br/>:8080]
        QB[qBittorrent<br/>via VPN]
    end

    subgraph Storage["Storage"]
        DL[Downloads]
        MEDIA[Media Library]
    end

    subgraph Playback
        JF[Jellyfin<br/>:8096<br/>Stream Media]
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

    style GLU fill:#9f6,stroke:#333
    style JF fill:#fcf,stroke:#333
    style JS fill:#fcf,stroke:#333
```

## 4. Subtitle Management Flow

```mermaid
graph LR
    subgraph Automation
        SON[Sonarr<br/>TV Shows]
        RAD[Radarr<br/>Movies]
        BAZ[Bazarr<br/>:6767<br/>Subtitles]
    end

    subgraph Storage
        TV[TV Shows<br/>/media/tv]
        MOVIES[Movies<br/>/media/movies]
    end

    SON -.->|Notify| BAZ
    RAD -.->|Notify| BAZ
    BAZ -->|Download| TV
    BAZ -->|Download| MOVIES
    SON --> TV
    RAD --> MOVIES

    style BAZ fill:#ff9,stroke:#333
```

## 5. VPN & Download Security

```mermaid
graph TB
    subgraph Internet
        VPN_PROV[VPN Provider<br/>Mullvad Wireguard]
        TRACKERS[Torrent Trackers]
    end

    subgraph Docker["media-network"]
        GLU[Gluetun<br/>VPN Gateway<br/>:8080, :6881]
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

    style GLU fill:#9f6,stroke:#333
    style VPN_PROV fill:#9f6,stroke:#333
    style QB fill:#ff9,stroke:#333
```

## 6. Monitoring Stack

```mermaid
graph TB
    subgraph Collectors["Metrics Collection"]
        NODE[Node Exporter<br/>:9100<br/>Host Metrics]
        CAD[cAdvisor<br/>:8081<br/>Container Metrics]
    end

    subgraph Processing["Metrics Processing"]
        PROM[Prometheus<br/>:9090<br/>Time Series DB]
        ALERT[Alertmanager<br/>:9093<br/>Alerts]
    end

    subgraph Visualization
        GRAF[Grafana<br/>:3001<br/>Dashboards]
    end

    subgraph Management
        DOZ[Dozzle<br/>:9999<br/>Live Logs]
    end

    NODE -->|Scrape| PROM
    CAD -->|Scrape| PROM
    PROM -->|Query| GRAF
    PROM -->|Send| ALERT

    style PROM fill:#ff9,stroke:#333
    style GRAF fill:#9cf,stroke:#333
```

## 7. Service Discovery & Management

```mermaid
graph TB
    subgraph Host
        DOCKER[Docker Engine<br/>/var/run/docker.sock]
    end

    subgraph Management["Management Layer"]
        TR[Traefik<br/>Auto-discovery]
        DOZ[Dozzle<br/>Log Viewer]
        AH[Autoheal<br/>Health Monitor]
        CAD[cAdvisor<br/>Metrics]
    end

    subgraph Services["All Services"]
        SVC[17 Containers<br/>with labels & health checks]
    end

    DOCKER -.->|Read| TR
    DOCKER -.->|Read| DOZ
    DOCKER -.->|Control| AH
    DOCKER -.->|Monitor| CAD
    TR -->|Route to| SVC
    AH -.->|Restart unhealthy| SVC

    style TR fill:#9cf,stroke:#333
    style DOCKER fill:#f96,stroke:#333
```

## Network Topology Details

### Network Modes

1. **Bridge Network (media-network)**
   - Most services connect to this custom bridge network
   - Allows inter-container communication
   - Traefik discovers services via Docker socket

2. **Host Network**
   - `fail2ban`: Requires host network access to manage iptables and monitor system logs

3. **Service Network Mode**
   - `qbittorrent`: Uses Gluetun's network stack (`network_mode: service:gluetun`)
   - All qBittorrent traffic routes through VPN

### External Access

#### Public Access (via Cloudflare)
- Cloudflare Tunnel → Traefik → Web UI
- Domain: `otterammo.xyz`

#### Local Access (Direct)
- LAN clients → Traefik (port 80) → Services
- Local domain suffix: `.lan`

### Port Mappings

#### Host → Container Ports
- **80**: Traefik HTTP entry point
- **8090**: Traefik dashboard
- **8096**: Jellyfin (direct access)
- **5055**: Jellyseerr (direct access)
- **8989**: Sonarr (direct access)
- **7878**: Radarr (direct access)
- **9696**: Prowlarr (direct access)
- **6767**: Bazarr (direct access)
- **8080**: Gluetun/qBittorrent WebUI
- **6881**: Torrent traffic (TCP/UDP)
- **9090**: Prometheus
- **3001**: Grafana
- **8081**: cAdvisor
- **9100**: Node Exporter
- **9093**: Alertmanager
- **9999**: Dozzle
- **3000**: Web UI dashboard

### Service Communication Patterns

#### Content Request Flow
```
User → Jellyseerr → Sonarr/Radarr → Prowlarr (indexers) → qBittorrent (via Gluetun VPN) → Downloads
```

#### Content Organization Flow
```
Downloads → Sonarr/Radarr (organize) → Media Storage → Jellyfin (stream)
Bazarr → Download subtitles → Media Storage
```

#### Monitoring Flow
```
Node Exporter/cAdvisor → Prometheus → Grafana (visualization)
Prometheus → Alertmanager (alerts)
```

### Security Layers

1. **VPN Isolation**: All torrent traffic forced through Gluetun VPN
2. **Fail2ban**: Monitors logs and blocks malicious IPs at host level
3. **Traefik**: Reverse proxy with optional authentication
4. **Cloudflare Tunnel**: Secure external access without port forwarding
5. **Autoheal**: Automatically restarts unhealthy containers (monitors Gluetun)

### Storage Architecture

#### Volumes by Service Type
- **Config**: Persistent configuration for each service
- **Media**: Read-only for Jellyfin, read-write for automation services
- **Downloads**: Shared between qBittorrent and automation services
- **Monitoring Data**: Time-series databases for Prometheus
- **Logs**: Centralized logging for fail2ban and Traefik

### Dependencies

#### Service Start Order
1. Traefik (reverse proxy)
2. Gluetun (VPN gateway)
3. qBittorrent (requires Gluetun network)
4. Cloudflared (requires Traefik)
5. Jellyfin (media server)
6. Jellyseerr (requires Jellyfin)
7. Prometheus (metrics)
8. Grafana (requires Prometheus)

### Resource Allocation

#### Memory Limits
- **Heavy**: Jellyfin (2GB), qBittorrent (4GB), Sonarr (1GB)
- **Medium**: Grafana (256MB), Radarr/Bazarr (512MB)
- **Light**: Prometheus/Alertmanager/cAdvisor (128-512MB)

### Health Monitoring

All services implement health checks:
- **HTTP-based**: Most web services (curl/wget to health endpoints)
- **Command-based**: fail2ban (fail2ban-client ping)
- **VPN-specific**: Gluetun (connectivity to 1.1.1.1:443)

### Key Features

1. **Auto-healing**: Gluetun VPN container auto-restarts on failure
2. **Service Discovery**: Traefik auto-discovers services via Docker labels
3. **Centralized Logging**: Dozzle provides real-time log aggregation
4. **Metrics Collection**: Full stack monitoring with Prometheus/Grafana
5. **Secure Downloads**: VPN kill-switch ensures no leaks
