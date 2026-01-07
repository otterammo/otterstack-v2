# Iteration 3: TLS & HTTPS

**Status:** Not Started
**Duration:** 1-2 days
**Risk Level:** Low
**Downtime:** None
**Dependencies:** Iteration 2 completed

---

## Objectives

1. Configure TLS certificates for all services
2. Enable HTTPS with Let's Encrypt (for public domain)
3. Configure self-signed certificates for local services
4. Force HTTP to HTTPS redirects
5. Update all service URLs to HTTPS

---

## Pre-Migration Checklist

- [ ] Iteration 2 validated and stable
- [ ] Domain name configured (for Let's Encrypt)
- [ ] DNS pointing to server
- [ ] Port 443 accessible from internet (if using Let's Encrypt)
- [ ] Full system backup
- [ ] Decide: Let's Encrypt vs Self-Signed certificates

---

## Certificate Strategy

### Option A: Let's Encrypt (Recommended for Public Domain)

**For:** `otterammo.xyz` and subdomains
**Benefits:** Free, automated, trusted by browsers
**Requirements:** Public domain, ports 80/443 accessible

### Option B: Self-Signed (For Local-Only Services)

**For:** `*.lan` domains
**Benefits:** Works offline, no external dependencies
**Drawbacks:** Browser warnings, manual trust

### Recommended Approach: Hybrid

- **Public services**: Let's Encrypt wildcard cert for `*.otterammo.xyz`
- **Local services**: Self-signed cert for `*.lan`

---

## Traefik TLS Configuration

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

      # Entry points
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"

      # HTTP to HTTPS redirect
      - "--entrypoints.web.http.redirections.entrypoint.to=websecure"
      - "--entrypoints.web.http.redirections.entrypoint.scheme=https"

      # TLS configuration
      - "--certificatesresolvers.letsencrypt.acme.email=${ACME_EMAIL}"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
      - "--certificatesresolvers.letsencrypt.acme.tlschallenge=true"

      # For wildcard certs (DNS challenge)
      # - "--certificatesresolvers.letsencrypt.acme.dnschallenge=true"
      # - "--certificatesresolvers.letsencrypt.acme.dnschallenge.provider=cloudflare"

      # API and dashboard
      - "--api.dashboard=true"
      - "--api.insecure=false"  # Secure dashboard

      # Health check
      - "--ping=true"

      # Logs
      - "--log.level=INFO"
      - "--accesslog=true"
      - "--accesslog.filepath=/var/log/traefik/access.log"
      - "--accesslog.bufferingsize=100"

    ports:
      - "80:80"
      - "443:443"

    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./logs:/var/log/traefik
      - ./letsencrypt:/letsencrypt  # NEW: Store certificates
      - ./config:/config            # NEW: Dynamic configuration

    environment:
      - TZ=${TZ:-UTC}
      - DOCKER_API_VERSION=1.44
      - ACME_EMAIL=${ACME_EMAIL}
      # If using Cloudflare DNS challenge:
      # - CF_API_EMAIL=${CF_API_EMAIL}
      # - CF_API_KEY=${CF_API_KEY}

    networks:
      - dmz-net
      - frontend-net
      - backend-net
      - security-net

    labels:
      - "traefik.enable=true"

      # Dashboard with HTTPS
      - "traefik.http.routers.traefik.rule=Host(`traefik${DOMAIN_SUFFIX:-.lan}`)"
      - "traefik.http.routers.traefik.entrypoints=websecure"
      - "traefik.http.routers.traefik.tls=true"
      - "traefik.http.routers.traefik.service=api@internal"
```

### Create TLS Dynamic Configuration

Create `traefik/config/tls.yml`:

```yaml
# traefik/config/tls.yml
tls:
  options:
    default:
      minVersion: VersionTLS12
      cipherSuites:
        - TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256
        - TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384
        - TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305
      sniStrict: true

  stores:
    default:
      defaultCertificate:
        certFile: /config/certs/local-cert.pem
        keyFile: /config/certs/local-key.pem

  certificates:
    # Self-signed for local services
    - certFile: /config/certs/local-cert.pem
      keyFile: /config/certs/local-key.pem
      stores:
        - default
```

---

## Generate Self-Signed Certificates

For `*.lan` domains:

```bash
cd /home/otterammo/media/traefik
mkdir -p config/certs

# Generate private key
openssl genrsa -out config/certs/local-key.pem 2048

# Generate certificate (valid for 1 year, *.lan wildcard)
openssl req -new -x509 -sha256 \
  -key config/certs/local-key.pem \
  -out config/certs/local-cert.pem \
  -days 365 \
  -subj "/C=US/ST=State/L=City/O=Media Server/CN=*.lan" \
  -addext "subjectAltName=DNS:*.lan,DNS:localhost"

# Secure permissions
chmod 600 config/certs/local-key.pem
chmod 644 config/certs/local-cert.pem

# Verify certificate
openssl x509 -in config/certs/local-cert.pem -text -noout
```

---

## Update Service Labels for HTTPS

### Template for All Services

```yaml
labels:
  - "traefik.enable=true"

  # Router configuration
  - "traefik.http.routers.<service>.rule=Host(`<service>${DOMAIN_SUFFIX:-.lan}`)"
  - "traefik.http.routers.<service>.entrypoints=websecure"
  - "traefik.http.routers.<service>.tls=true"

  # For Let's Encrypt (public services)
  # - "traefik.http.routers.<service>.tls.certresolver=letsencrypt"

  # Service configuration
  - "traefik.http.services.<service>.loadbalancer.server.port=<port>"
```

### Jellyfin (jellyfin/docker-compose.yml)

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.jellyfin.rule=Host(`${JELLYFIN_DOMAIN:-jellyfin.lan}`)"
  - "traefik.http.routers.jellyfin.entrypoints=websecure"
  - "traefik.http.routers.jellyfin.tls=true"
  - "traefik.http.services.jellyfin.loadbalancer.server.port=8096"
```

### Web UI (web-ui/docker-compose.yml)

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.docker.network=frontend-net"

  # Public domain (Let's Encrypt)
  - "traefik.http.routers.web-ui-public.rule=Host(`${PUBLIC_DASHBOARD_DOMAIN:-otterammo.xyz}`)"
  - "traefik.http.routers.web-ui-public.entrypoints=websecure"
  - "traefik.http.routers.web-ui-public.tls=true"
  - "traefik.http.routers.web-ui-public.tls.certresolver=letsencrypt"
  - "traefik.http.routers.web-ui-public.service=web-ui"

  # Local domain (Self-signed)
  - "traefik.http.routers.web-ui-admin.rule=Host(`dashboard${DOMAIN_SUFFIX:-.lan}`)"
  - "traefik.http.routers.web-ui-admin.entrypoints=websecure"
  - "traefik.http.routers.web-ui-admin.tls=true"
  - "traefik.http.routers.web-ui-admin.service=web-ui"

  # Service definition
  - "traefik.http.services.web-ui.loadbalancer.server.port=3000"
```

### Update All Other Services

Apply the same pattern to:
- Jellyseerr
- Sonarr
- Radarr
- Prowlarr
- Bazarr
- qBittorrent
- Prometheus
- Grafana
- cAdvisor
- Alertmanager
- Dozzle

---

## Environment Variables

Add to `.env`:

```bash
# TLS Configuration
ACME_EMAIL=your-email@example.com

# Cloudflare (if using DNS challenge)
# CF_API_EMAIL=your-email@example.com
# CF_API_KEY=your-api-key
```

---

## Implementation Steps

### Step 1: Backup

```bash
cd /home/otterammo/media
mkdir -p backups/iter3-pre
cp -r */docker-compose.yml backups/iter3-pre/
cp docker-compose.yml backups/iter3-pre/
```

### Step 2: Create Certificate Directories

```bash
mkdir -p traefik/letsencrypt
mkdir -p traefik/config/certs

# Set proper permissions
chmod 600 traefik/letsencrypt
touch traefik/letsencrypt/acme.json
chmod 600 traefik/letsencrypt/acme.json
```

### Step 3: Generate Self-Signed Certificates

```bash
cd traefik

# Generate certificates (as shown above)
openssl genrsa -out config/certs/local-key.pem 2048
openssl req -new -x509 -sha256 \
  -key config/certs/local-key.pem \
  -out config/certs/local-cert.pem \
  -days 365 \
  -subj "/C=US/ST=State/L=City/O=Media Server/CN=*.lan" \
  -addext "subjectAltName=DNS:*.lan,DNS:localhost"

chmod 600 config/certs/local-key.pem
chmod 644 config/certs/local-cert.pem

cd ..
```

### Step 4: Create TLS Configuration File

```bash
cat > traefik/config/tls.yml << 'EOF'
tls:
  options:
    default:
      minVersion: VersionTLS12
      sniStrict: true
  stores:
    default:
      defaultCertificate:
        certFile: /config/certs/local-cert.pem
        keyFile: /config/certs/local-key.pem
  certificates:
    - certFile: /config/certs/local-cert.pem
      keyFile: /config/certs/local-key.pem
      stores:
        - default
EOF
```

### Step 5: Update Traefik Configuration

```bash
nano traefik/docker-compose.yml
# Apply changes from "Traefik TLS Configuration" section above
```

### Step 6: Update Service Labels

Update each service's docker-compose.yml with HTTPS labels:

```bash
# Jellyfin
nano jellyfin/docker-compose.yml

# Jellyseerr
nano jellyseerr/docker-compose.yml

# Web UI
nano web-ui/docker-compose.yml

# Servarr services
nano servarr/docker-compose.yml

# Download services
nano qbittorrent/docker-compose.yml

# Monitoring
nano monitoring/docker-compose.yml

# Dozzle
nano dozzle/docker-compose.yml
```

### Step 7: Update .env File

```bash
nano .env

# Add:
ACME_EMAIL=your-email@example.com
```

### Step 8: Deploy Changes

```bash
# Validate configuration
docker-compose config --quiet

# Restart Traefik first
docker-compose up -d traefik

# Wait for Traefik to start
sleep 10

# Check Traefik logs
docker-compose logs -f traefik &

# Restart all services (to apply new labels)
docker-compose up -d

# Monitor for Let's Encrypt certificate requests
docker-compose logs -f traefik | grep acme
```

### Step 9: Trust Self-Signed Certificate (Client-Side)

For local `.lan` domains, import the certificate on client machines:

**Linux:**
```bash
# Copy cert from server
scp user@server:/home/otterammo/media/traefik/config/certs/local-cert.pem ~/

# Install to system trust store
sudo cp ~/local-cert.pem /usr/local/share/ca-certificates/media-server.crt
sudo update-ca-certificates
```

**macOS:**
```bash
# Copy cert from server
scp user@server:/home/otterammo/media/traefik/config/certs/local-cert.pem ~/

# Add to keychain
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ~/local-cert.pem
```

**Windows:**
```powershell
# Copy cert from server to Windows machine
# Then: certmgr.msc -> Trusted Root Certification Authorities -> Import
```

**Firefox:**
Settings → Privacy & Security → Certificates → View Certificates → Import

---

## Validation Tests

### Test 1: HTTPS Access

```bash
# Test HTTPS endpoints
curl -k https://jellyfin.lan
curl -k https://jellyseerr.lan
curl -k https://sonarr.lan
curl -k https://grafana.lan
curl -k https://dashboard.lan

# Test public domain (if configured)
curl https://otterammo.xyz
```

### Test 2: HTTP Redirect

```bash
# Should redirect to HTTPS
curl -I http://jellyfin.lan
# Look for: Location: https://jellyfin.lan
```

### Test 3: Certificate Validation

```bash
# Check Let's Encrypt cert (public domain)
openssl s_client -connect otterammo.xyz:443 -servername otterammo.xyz < /dev/null | grep -A 2 "Verify return code"

# Check self-signed cert (local domain)
openssl s_client -connect jellyfin.lan:443 -servername jellyfin.lan < /dev/null | grep -A 5 "subject="
```

### Test 4: TLS Version

```bash
# Test TLS 1.2
openssl s_client -connect jellyfin.lan:443 -tls1_2 < /dev/null

# Test TLS 1.3
openssl s_client -connect jellyfin.lan:443 -tls1_3 < /dev/null

# TLS 1.0/1.1 should fail
openssl s_client -connect jellyfin.lan:443 -tls1 < /dev/null  # Should fail
```

### Test 5: Browser Access

Open in browser (after importing self-signed cert):
- https://jellyfin.lan
- https://jellyseerr.lan
- https://sonarr.lan
- https://grafana.lan
- https://dashboard.lan
- https://otterammo.xyz

Should show secure (lock icon) without warnings.

---

## Validation Checklist

- [ ] HTTPS working for all services
- [ ] HTTP redirects to HTTPS
- [ ] Let's Encrypt certificate obtained (public domain)
- [ ] Self-signed certificate deployed (local domains)
- [ ] TLS 1.2+ enforced, TLS 1.0/1.1 blocked
- [ ] Browsers show secure connection (after cert trust)
- [ ] Streaming works over HTTPS
- [ ] API calls work over HTTPS
- [ ] No mixed content warnings
- [ ] Certificate auto-renewal configured

---

## Troubleshooting

### Issue: Let's Encrypt Challenge Failed

**Symptoms:**
```
Error: unable to get local issuer certificate
```

**Solution:**
```bash
# Verify domain DNS points to server
nslookup otterammo.xyz

# Verify port 80/443 accessible from internet
curl -I http://otterammo.xyz
curl -I https://otterammo.xyz

# Check Traefik logs
docker-compose logs traefik | grep -i acme

# Try DNS challenge instead of TLS challenge
# Update traefik config to use dnschallenge
```

### Issue: Browser Shows "Not Secure"

**Symptoms:**
Browser shows SSL warning for `.lan` domains

**Solution:**
This is expected for self-signed certificates. Options:
1. Import certificate to system trust store (see Step 9)
2. Click "Advanced" → "Proceed anyway" (not recommended for production)
3. Use Let's Encrypt for all domains (requires public DNS)

### Issue: Mixed Content Warnings

**Symptoms:**
Some resources load over HTTP instead of HTTPS

**Solution:**
```bash
# Check service URLs in configs
grep -r "http://" */config/

# Update to use HTTPS or relative URLs
# Example in Jellyseerr config:
# Sonarr URL: https://sonarr.lan instead of http://sonarr.lan
```

### Issue: Certificate Not Renewing

**Symptoms:**
Let's Encrypt certificate expired

**Solution:**
```bash
# Check acme.json
cat traefik/letsencrypt/acme.json | jq

# Manually trigger renewal
docker-compose restart traefik

# Check renewal logs
docker-compose logs traefik | grep -i renew

# Verify renewal cron (Let's Encrypt certs auto-renew every 60 days)
```

---

## Rollback Procedure

```bash
# Stop services
docker-compose down

# Restore previous configuration
cp -r backups/iter3-pre/* .

# Remove TLS config
rm -rf traefik/letsencrypt
rm -rf traefik/config

# Restart
docker-compose up -d
```

---

## Post-Migration Tasks

### Immediate
- [ ] Update bookmarks to use https://
- [ ] Test certificate renewal process
- [ ] Monitor Traefik logs for TLS errors
- [ ] Update documentation with HTTPS URLs

### Within 1 Week
- [ ] Set up certificate expiry monitoring
- [ ] Configure HSTS headers (optional)
- [ ] Test from external network
- [ ] Prepare for Iteration 4 (Authentication)

---

## Success Criteria

✅ **Iteration 3 is successful if:**

1. All services accessible via HTTPS
2. HTTP automatically redirects to HTTPS
3. Valid certificates (Let's Encrypt or trusted self-signed)
4. TLS 1.2+ enforced
5. No browser security warnings (after cert import)
6. Zero downtime during migration
7. Certificate auto-renewal configured

---

## Next Steps

**Ready for next iteration?** → [Iteration 4: Authentication Layer](iteration-04-authentication.md)
