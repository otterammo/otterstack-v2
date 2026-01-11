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

1. Copy `.env.example` to `.env` in the media directory:
   ```bash
   cp .env.example .env
   ```

2. Save your tunnel token as a Docker secret:
   ```bash
   printf '%s' 'your_actual_tunnel_token_here' > secrets/cloudflare_token
   chmod 600 secrets/cloudflare_token
   ```

### 3. Configure Tunnel Routes

In the Cloudflare Zero Trust dashboard, configure routes for your public services (admin services are accessed via Tailscale): 

- **jellyfin.yourdomain.com** → `http://traefik:80` (Host header: `jellyfin.yourdomain.com`)
- **jellyseerr.yourdomain.com** → `http://traefik:80` (Host header: `jellyseerr.yourdomain.com`)
- **dashboard.yourdomain.com** → `http://traefik:80` (Host header: `dashboard.yourdomain.com`)

These hostnames should match `PUBLIC_JELLYFIN_DOMAIN`, `PUBLIC_JELLYSEERR_DOMAIN`, and `PUBLIC_DASHBOARD_DOMAIN` in `.env`.

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

### 404 on public subdomains (e.g., jellyfin.otterammo.xyz)
If `curl -I -H "Host: jellyfin.yourdomain.xyz" http://localhost` returns 200/302 locally but the public URL returns 404, the tunnel is likely sending the wrong Host header.

In Cloudflare Zero Trust:
1. Go to **Access** → **Tunnels** → your tunnel → **Public Hostnames**
2. For each hostname, set **Service** to `http://traefik:80`
3. Remove the **HTTP Host Header** override, or set it to the same hostname (e.g., `jellyfin.yourdomain.xyz`)

Then retest:
```bash
curl -I https://jellyfin.yourdomain.xyz
curl -I https://jellyseerr.yourdomain.xyz
```

### Verify tunnel status:
Check the Cloudflare Zero Trust dashboard to see if your tunnel is online.

### Test connectivity:
Once configured, test access through your domain names.
