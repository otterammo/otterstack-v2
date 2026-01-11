# Cloudflared Details

Cloudflare Tunnel provides secure remote access to the media stack without opening ports on your router.

## Prerequisites
1. A Cloudflare account
2. A domain managed by Cloudflare
3. Access to the Cloudflare Zero Trust dashboard

## Setup

### 1. Create a Cloudflare Tunnel
1. Go to https://one.dash.cloudflare.com/
2. Navigate to Access > Tunnels
3. Click Create a tunnel
4. Choose Cloudflared as the connector
5. Give your tunnel a name (for example, "media-stack")
6. Copy the tunnel token

### 2. Configure Environment
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
In the Cloudflare Zero Trust dashboard, configure routes for your public services:

- `jellyfin.yourdomain.com` -> `http://traefik:80` (Host header: `jellyfin.yourdomain.com`)
- `jellyseerr.yourdomain.com` -> `http://traefik:80` (Host header: `jellyseerr.yourdomain.com`)
- `dashboard.yourdomain.com` -> `http://traefik:80` (Host header: `dashboard.yourdomain.com`)

These hostnames should match `PUBLIC_JELLYFIN_DOMAIN`, `PUBLIC_JELLYSEERR_DOMAIN`, and `PUBLIC_DASHBOARD_DOMAIN` in `.env`.

### 4. Start the Service
```bash
docker compose up -d cloudflared
```

## Troubleshooting

### Check cloudflared logs
```bash
docker compose logs cloudflared
```

### 404 on public subdomains
If `curl -I -H "Host: jellyfin.yourdomain.com" http://localhost` returns 200/302 locally but the public URL returns 404, the tunnel is likely sending the wrong Host header.

In Cloudflare Zero Trust:
1. Go to Access -> Tunnels -> your tunnel -> Public Hostnames
2. For each hostname, set Service to `http://traefik:80`
3. Remove the HTTP Host Header override, or set it to the same hostname (for example, `jellyfin.yourdomain.com`)

Then retest:
```bash
curl -I https://jellyfin.yourdomain.com
curl -I https://jellyseerr.yourdomain.com
```

### Verify tunnel status
Check the Cloudflare Zero Trust dashboard to see if your tunnel is online.

### Test connectivity
Once configured, test access through your domain names.

## Security
- The cloudflared container runs with no exposed ports.
- All traffic is encrypted through Cloudflare's network.
- Consider enabling Cloudflare Access policies for additional security.
- Use strong authentication for your public services.
