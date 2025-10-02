# Cloudflared Setup

This directory contains the Docker Compose configuration for Cloudflare Tunnel (cloudflared), which provides secure remote access to your media stack without opening ports on your router.

## Prerequisites

1. A Cloudflare account
2. A domain managed by Cloudflare
3. Access to Cloudflare Zero Trust dashboard

## Setup Instructions

### 1. Create a Cloudflare Tunnel

1. Go to [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com/)
2. Navigate to **Access** > **Tunnels**
3. Click **Create a tunnel**
4. Choose **Cloudflared** as the connector
5. Give your tunnel a name (e.g., "media-stack")
6. Copy the tunnel token that's generated

### 2. Configure Environment Variables

1. Copy `.env.template` to `.env` in the media directory:
   ```bash
   cp .env.template .env
   ```

2. Edit the `.env` file and add your tunnel token:
   ```bash
   CLOUDFLARE_TUNNEL_TOKEN=your_actual_tunnel_token_here
   ```

### 3. Configure Tunnel Routes

In the Cloudflare Zero Trust dashboard, configure routes for your services:

- **jellyfin.yourdomain.com** → `http://traefik:80` (with Host header: `jellyfin.local`)
- **jellyseerr.yourdomain.com** → `http://traefik:80` (with Host header: `jellyseerr.local`)
- **sonarr.yourdomain.com** → `http://traefik:80` (with Host header: `sonarr.local`)
- **radarr.yourdomain.com** → `http://traefik:80` (with Host header: `radarr.local`)
- **prowlarr.yourdomain.com** → `http://traefik:80` (with Host header: `prowlarr.local`)
- **qbittorrent.yourdomain.com** → `http://traefik:80` (with Host header: `qbittorrent.local`)

### 4. Start the Services

```bash
docker compose up -d cloudflared
```

## Security Considerations

- The cloudflared container runs with no exposed ports
- All traffic is encrypted through Cloudflare's network
- Consider enabling Cloudflare Access policies for additional security
- Use strong authentication for your services

## Troubleshooting

### Check cloudflared logs:
```bash
docker compose logs cloudflared
```

### Verify tunnel status:
Check the Cloudflare Zero Trust dashboard to see if your tunnel is online.

### Test connectivity:
Once configured, test access through your domain names.