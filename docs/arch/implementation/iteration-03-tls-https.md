# Iteration 3: TLS & HTTPS (Tailscale)

**Status:** Not Started
**Duration:** 1 day
**Risk Level:** Low
**Downtime:** Minimal (rolling restarts)
**Dependencies:** Iteration 2 completed

---

## Objectives

1. Enable HTTPS for all services via Tailscale MagicDNS
2. Keep Traefik as the router and use port-based TLS (no base-path changes)
3. Reduce exposed surface to tailnet-only access
4. Update service URLs to the new HTTPS endpoints

---

## Pre-Migration Checklist

- [ ] Iteration 2 validated and stable
- [ ] Tailscale installed and connected on the media server
- [ ] MagicDNS enabled for the tailnet
- [ ] HTTPS certificates enabled in the Tailscale admin panel
- [ ] Confirmed device name: `optiplex-7040.husky-escalator.ts.net`
- [ ] Full system backup

---

## Certificate Strategy (Selected)

### Option A: Tailscale MagicDNS + HTTPS

**For:** Tailnet-only access via `optiplex-7040.husky-escalator.ts.net`
**Benefits:** Publicly trusted certs, no manual CA install
**Tradeoffs:** Requires Tailscale on clients, no `.lan` names

### Alternatives (not in scope for this iteration)

- Let's Encrypt for public domains (`*.otterammo.xyz`)
- Self-signed certs for `.lan`

---

## Port Map (Selected)

| External Port | Service | Internal Port | Notes |
| --- | --- | --- | --- |
| 8096 | Jellyfin | 8096 | - |
| 5055 | Jellyseerr | 5055 | - |
| 8989 | Sonarr | 8989 | - |
| 7878 | Radarr | 7878 | - |
| 9696 | Prowlarr | 9696 | - |
| 6767 | Bazarr | 6767 | - |
| 8080 | qBittorrent | 8080 | - |
| 3000 | Grafana | 3000 | - |
| 9090 | Prometheus | 9090 | - |
| 9093 | Alertmanager | 9093 | - |
| 3001 | Web UI | 3000 | External port avoids conflict with Grafana |
| 8081 | cAdvisor | 8080 | External port avoids conflict |
| 8082 | Dozzle | 8080 | External port avoids conflict |
| 8085 | Traefik Dashboard | 8080 | Optional |

---

## Traefik TLS Configuration (Tailscale)

### Update Traefik (traefik/docker-compose.yml)

```yaml
services:
  traefik:
    image: traefik:v3.6.6
    container_name: traefik
    restart: unless-stopped
    command:
      # Docker provider
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--providers.docker.network=${NETWORK_NAME:-media-network}"

      # File provider for TLS config
      - "--providers.file.directory=/config"
      - "--providers.file.watch=true"

      # Entry points
      - "--entrypoints.web.address=:80"
      - "--entrypoints.jellyfin.address=:8096"
      - "--entrypoints.jellyseerr.address=:5055"
      - "--entrypoints.sonarr.address=:8989"
      - "--entrypoints.radarr.address=:7878"
      - "--entrypoints.prowlarr.address=:9696"
      - "--entrypoints.bazarr.address=:6767"
      - "--entrypoints.qbittorrent.address=:8080"
      - "--entrypoints.grafana.address=:3000"
      - "--entrypoints.prometheus.address=:9090"
      - "--entrypoints.alertmanager.address=:9093"
      - "--entrypoints.web-ui.address=:3001"
      - "--entrypoints.cadvisor.address=:8081"
      - "--entrypoints.dozzle.address=:8082"
      - "--entrypoints.traefik-dashboard.address=:8085"

      # API and dashboard
      - "--api.dashboard=true"
      - "--api.insecure=false"

      # Health check
      - "--ping=true"

      # Logs
      - "--log.level=INFO"
      - "--accesslog=true"
      - "--accesslog.filepath=/var/log/traefik/access.log"
      - "--accesslog.bufferingsize=100"

    ports:
      - "80:80"
      - "8096:8096"
      - "5055:5055"
      - "8989:8989"
      - "7878:7878"
      - "9696:9696"
      - "6767:6767"
      - "8080:8080"
      - "3000:3000"
      - "9090:9090"
      - "9093:9093"
      - "3001:3001"
      - "8081:8081"
      - "8082:8082"
      - "8085:8085"

    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./logs:/var/log/traefik
      - ./config:/config
```

### Create TLS Dynamic Configuration

Create `traefik/config/tls.yml`:

```yaml
# traefik/config/tls.yml
tls:
  options:
    default:
      minVersion: VersionTLS12
      sniStrict: true
  stores:
    default:
      defaultCertificate:
        certFile: /config/certs/tailscale.crt
        keyFile: /config/certs/tailscale.key
```

### Generate Tailscale Certificate

```bash
sudo tailscale cert \
  --cert-file /home/otterammo/media/traefik/config/certs/tailscale.crt \
  --key-file /home/otterammo/media/traefik/config/certs/tailscale.key \
  optiplex-7040.husky-escalator.ts.net
sudo chmod 600 /home/otterammo/media/traefik/config/certs/tailscale.key
sudo chmod 644 /home/otterammo/media/traefik/config/certs/tailscale.crt
```

### Certificate Renewal (Recommended)

Tailscale certificates are short-lived. Re-run `tailscale cert` periodically.

Example cron (weekly):

```bash
sudo crontab -e
```

```cron
0 3 * * 0 /usr/bin/tailscale cert \
  --cert-file /home/otterammo/media/traefik/config/certs/tailscale.crt \
  --key-file /home/otterammo/media/traefik/config/certs/tailscale.key \
  optiplex-7040.husky-escalator.ts.net \
  && docker compose -f /home/otterammo/media/docker-compose.yml restart traefik
```

---

## Update Service Labels for HTTPS

### Shared Environment Variable

Add to `.env`:

```bash
TAILSCALE_HOST=optiplex-7040.husky-escalator.ts.net
```

### Template for All Services

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.<service>.rule=Host(`${TAILSCALE_HOST}`)"
  - "traefik.http.routers.<service>.entrypoints=<entrypoint>"
  - "traefik.http.routers.<service>.tls=true"
  - "traefik.http.services.<service>.loadbalancer.server.port=<internal_port>"
```

### Example (Jellyfin)

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.jellyfin.rule=Host(`${TAILSCALE_HOST}`)"
  - "traefik.http.routers.jellyfin.entrypoints=jellyfin"
  - "traefik.http.routers.jellyfin.tls=true"
  - "traefik.http.services.jellyfin.loadbalancer.server.port=8096"
```

### Traefik Dashboard Labels (Optional)

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.traefik-dashboard.rule=Host(`${TAILSCALE_HOST}`)"
  - "traefik.http.routers.traefik-dashboard.entrypoints=traefik-dashboard"
  - "traefik.http.routers.traefik-dashboard.tls=true"
  - "traefik.http.routers.traefik-dashboard.service=api@internal"
```

### Entry Point Map (for labels)

- Jellyfin: `jellyfin`
- Jellyseerr: `jellyseerr`
- Sonarr: `sonarr`
- Radarr: `radarr`
- Prowlarr: `prowlarr`
- Bazarr: `bazarr`
- qBittorrent: `qbittorrent`
- Grafana: `grafana`
- Prometheus: `prometheus`
- Alertmanager: `alertmanager`
- Web UI: `web-ui`
- cAdvisor: `cadvisor`
- Dozzle: `dozzle`
- Traefik dashboard: `traefik-dashboard`

---

## Implementation Steps

### Step 1: Backup

```bash
cd /home/otterammo/media
mkdir -p backups/iter3-pre
cp -r */docker-compose.yml backups/iter3-pre/
cp docker-compose.yml backups/iter3-pre/
```

### Step 2: Create Certificate Directory

```bash
mkdir -p /home/otterammo/media/traefik/config/certs
```

### Step 3: Generate Tailscale Certificate

```bash
sudo tailscale cert \
  --cert-file /home/otterammo/media/traefik/config/certs/tailscale.crt \
  --key-file /home/otterammo/media/traefik/config/certs/tailscale.key \
  optiplex-7040.husky-escalator.ts.net
sudo chmod 600 /home/otterammo/media/traefik/config/certs/tailscale.key
sudo chmod 644 /home/otterammo/media/traefik/config/certs/tailscale.crt
```

### Step 4: Create TLS Configuration File

```bash
cat > /home/otterammo/media/traefik/config/tls.yml << 'EOF'
tls:
  options:
    default:
      minVersion: VersionTLS12
      sniStrict: true
  stores:
    default:
      defaultCertificate:
        certFile: /config/certs/tailscale.crt
        keyFile: /config/certs/tailscale.key
EOF
```

### Step 5: Update Traefik Configuration

```bash
nano /home/otterammo/media/traefik/docker-compose.yml
# Apply the entrypoints, file provider, and port mappings above.
```

### Step 6: Update Service Labels

Update each service compose file with the port-based TLS labels:

```bash
nano /home/otterammo/media/jellyfin/docker-compose.yml
nano /home/otterammo/media/jellyseerr/docker-compose.yml
nano /home/otterammo/media/servarr/docker-compose.yml
nano /home/otterammo/media/qbittorrent/docker-compose.yml
nano /home/otterammo/media/monitoring/docker-compose.yml
nano /home/otterammo/media/dozzle/docker-compose.yml
nano /home/otterammo/media/web-ui/docker-compose.yml
```

### Step 7: Update .env

```bash
nano /home/otterammo/media/.env
# Add TAILSCALE_HOST=optiplex-7040.husky-escalator.ts.net
```

### Step 8: Deploy Changes

```bash
cd /home/otterammo/media

docker compose config --quiet

docker compose up -d traefik
sleep 10

docker compose up -d
```

---

## Validation Tests

### Test 1: HTTPS Access (Tailnet)

```bash
curl -I https://optiplex-7040.husky-escalator.ts.net:8096
curl -I https://optiplex-7040.husky-escalator.ts.net:5055
curl -I https://optiplex-7040.husky-escalator.ts.net:8989
curl -I https://optiplex-7040.husky-escalator.ts.net:3000
curl -I https://optiplex-7040.husky-escalator.ts.net:3001
```

### Test 2: Certificate Validation

```bash
echo | openssl s_client -connect optiplex-7040.husky-escalator.ts.net:8096 \
  -servername optiplex-7040.husky-escalator.ts.net 2>/dev/null | \
  openssl x509 -noout -issuer -subject -dates
```

### Test 3: Browser Access

Open in a browser on a Tailscale-connected device:
- https://optiplex-7040.husky-escalator.ts.net:8096
- https://optiplex-7040.husky-escalator.ts.net:5055
- https://optiplex-7040.husky-escalator.ts.net:3000
- https://optiplex-7040.husky-escalator.ts.net:3001

---

## Troubleshooting

### Issue: MagicDNS Name Does Not Resolve

**Symptoms:** `NXDOMAIN` or timeout

**Solution:**
- Confirm MagicDNS is enabled in the Tailscale admin panel
- Confirm the device name in the admin panel
- Restart Tailscale on the client

### Issue: Certificate Generation Fails

**Symptoms:** `tailscale cert` returns an error

**Solution:**
- Confirm HTTPS certificates are enabled in the admin panel
- Confirm the device is connected to the tailnet
- Retry `tailscale cert optiplex-7040.husky-escalator.ts.net`

### Issue: Service Reachable on HTTP but not HTTPS

**Symptoms:** Connection refused on the TLS port

**Solution:**
- Verify Traefik entrypoints and port mappings
- Verify the router `entrypoints` match the service port
- Check Traefik logs: `docker compose logs traefik`

---

## Rollback Procedure

```bash
# Stop services
docker compose down

# Restore previous configuration
cp -r backups/iter3-pre/* .

# Remove Tailscale TLS config
rm -rf traefik/config

# Restart
docker compose up -d
```

---

## Post-Migration Tasks

### Immediate

- [ ] Update bookmarks to the new Tailscale HTTPS URLs
- [ ] Update external URL settings inside services (Jellyfin, Sonarr, etc.)
- [ ] Verify access from MacBook and iPhone

### Within 1 Week

- [ ] Add certificate renewal automation
- [ ] Add monitoring/alerts for cert expiry
- [ ] Remove any legacy `.lan` references if no longer needed

---

## Success Criteria

1. All services accessible via HTTPS at `optiplex-7040.husky-escalator.ts.net:<port>`
2. Certificates are valid and trusted (no browser warnings)
3. Tailnet-only access works from MacBook and iPhone
4. No base-path regressions in apps
5. Minimal downtime during migration

---

## Next Steps

Ready for next iteration? See [Iteration 4: Authentication Layer](iteration-04-authentication.md)
