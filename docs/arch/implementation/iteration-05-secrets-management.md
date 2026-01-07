# Iteration 5: Secrets Management

**Status:** Not Started
**Duration:** 2-3 days
**Risk Level:** Low
**Downtime:** Per-service restart
**Dependencies:** Iteration 4 completed

---

## Objectives

1. Extract sensitive data from .env files
2. Implement Docker Secrets
3. Update service configurations to use secrets
4. Remove plaintext secrets from version control
5. Create .env.example template
6. Document secret rotation procedures

---

## Pre-Migration Checklist

- [ ] Iteration 4 validated and stable
- [ ] Full system backup
- [ ] Document all current secrets
  ```bash
  cat .env > backups/env-backup-$(date +%Y%m%d).txt
  chmod 600 backups/env-backup-*.txt
  ```
- [ ] Ensure .gitignore excludes secrets
- [ ] Plan secret rotation schedule

---

## Current Secrets Inventory

Secrets currently in `.env`:

| Secret | Service | Usage |
|--------|---------|-------|
| CLOUDFLARE_TUNNEL_TOKEN | Cloudflared | Tunnel authentication |
| WIREGUARD_PRIVATE_KEY | Gluetun | VPN authentication |
| WIREGUARD_ADDRESSES | Gluetun | VPN configuration |
| GRAFANA_PASSWORD | Grafana | Admin password |
| SMTP_PASSWORD | fail2ban, Authelia | Email notifications |
| ACME_EMAIL | Traefik | Let's Encrypt registration |
| AUTHELIA_JWT_SECRET | Authelia | JWT signing |
| AUTHELIA_SESSION_SECRET | Authelia | Session encryption |
| ADMIN_PASSWORD | Web UI | Admin access |

---

## Docker Secrets vs Environment Variables

### Docker Secrets (Recommended)

**Pros:**
- Encrypted at rest
- Only accessible to authorized services
- Can be rotated without rebuilding images
- Not visible in `docker inspect`

**Cons:**
- Requires Docker Swarm mode OR file-based secrets
- Slightly more complex setup

### File-Based Secrets (Our Approach)

We'll use file-based secrets (simpler, no Swarm required):

```yaml
secrets:
  cloudflare_token:
    file: ./secrets/cloudflare_token.txt
  vpn_private_key:
    file: ./secrets/vpn_private_key.txt
```

---

## Secrets Directory Structure

```
/home/otterammo/media/
├── secrets/
│   ├── cloudflare_token.txt
│   ├── vpn_private_key.txt
│   ├── vpn_addresses.txt
│   ├── grafana_password.txt
│   ├── smtp_password.txt
│   ├── acme_email.txt
│   ├── admin_password.txt
│   └── README.md
├── .env (minimal, non-sensitive only)
├── .env.example (template for users)
└── .gitignore (ensure secrets/ is excluded)
```

---

## Implementation Plan

### Step 1: Create Secrets Directory

```bash
cd /home/otterammo/media
mkdir -p secrets
chmod 700 secrets
```

### Step 2: Extract Secrets from .env

```bash
# Backup current .env
cp .env backups/.env.iter5-pre

# Extract each secret to a file
grep CLOUDFLARE_TUNNEL_TOKEN .env | cut -d'=' -f2- > secrets/cloudflare_token.txt
grep WIREGUARD_PRIVATE_KEY .env | cut -d'=' -f2- > secrets/vpn_private_key.txt
grep WIREGUARD_ADDRESSES .env | cut -d'=' -f2- > secrets/vpn_addresses.txt
grep GRAFANA_PASSWORD .env | cut -d'=' -f2- > secrets/grafana_password.txt
grep SMTP_PASSWORD .env | cut -d'=' -f2- > secrets/smtp_password.txt
grep ACME_EMAIL .env | cut -d'=' -f2- > secrets/acme_email.txt
grep ADMIN_PASSWORD .env | cut -d'=' -f2- > secrets/admin_password.txt

# Set secure permissions
chmod 600 secrets/*.txt

# Verify secrets extracted correctly
ls -lah secrets/
```

### Step 3: Update docker-compose.yml

Add secrets definitions:

```yaml
# docker-compose.yml
include:
  - authelia/docker-compose.yml
  - cloudflared/docker-compose.yml
  - dozzle/docker-compose.yml
  - fail2ban/docker-compose.yml
  - jellyfin/docker-compose.yml
  - jellyseerr/docker-compose.yml
  - monitoring/docker-compose.yml
  - qbittorrent/docker-compose.yml
  - servarr/docker-compose.yml
  - traefik/docker-compose.yml
  - web-ui/docker-compose.yml
  - networks.yml

# Add secrets section
secrets:
  cloudflare_token:
    file: ./secrets/cloudflare_token.txt
  vpn_private_key:
    file: ./secrets/vpn_private_key.txt
  vpn_addresses:
    file: ./secrets/vpn_addresses.txt
  grafana_password:
    file: ./secrets/grafana_password.txt
  smtp_password:
    file: ./secrets/smtp_password.txt
  acme_email:
    file: ./secrets/acme_email.txt
  admin_password:
    file: ./secrets/admin_password.txt

networks:
  # ... existing networks
```

---

## Service Updates

### Cloudflared (cloudflared/docker-compose.yml)

**Before:**
```yaml
services:
  cloudflared:
    command: tunnel --no-autoupdate run --token ${CLOUDFLARE_TUNNEL_TOKEN}
```

**After:**
```yaml
services:
  cloudflared:
    secrets:
      - cloudflare_token
    command: tunnel --no-autoupdate run --token $(cat /run/secrets/cloudflare_token)
    # OR use environment variable with secret
    environment:
      - CLOUDFLARE_TUNNEL_TOKEN_FILE=/run/secrets/cloudflare_token
```

### Gluetun (qbittorrent/docker-compose.yml)

**Before:**
```yaml
services:
  gluetun:
    environment:
      - WIREGUARD_PRIVATE_KEY=${WIREGUARD_PRIVATE_KEY}
      - WIREGUARD_ADDRESSES=${WIREGUARD_ADDRESSES}
```

**After:**
```yaml
services:
  gluetun:
    secrets:
      - vpn_private_key
      - vpn_addresses
    environment:
      # Method 1: Use entrypoint script to load secrets
      - WIREGUARD_PRIVATE_KEY_FILE=/run/secrets/vpn_private_key
      - WIREGUARD_ADDRESSES_FILE=/run/secrets/vpn_addresses

      # Method 2: Load in command (if supported)
    # If Gluetun doesn't support _FILE suffix, create wrapper script
```

**Create wrapper script** if needed:

```bash
# qbittorrent/scripts/gluetun-entrypoint.sh
#!/bin/sh
export WIREGUARD_PRIVATE_KEY=$(cat /run/secrets/vpn_private_key)
export WIREGUARD_ADDRESSES=$(cat /run/secrets/vpn_addresses)
exec /gluetun-entrypoint "$@"
```

Update docker-compose.yml:
```yaml
services:
  gluetun:
    secrets:
      - vpn_private_key
      - vpn_addresses
    volumes:
      - ./scripts/gluetun-entrypoint.sh:/usr/local/bin/gluetun-wrapper.sh:ro
    entrypoint: ["/usr/local/bin/gluetun-wrapper.sh"]
```

### Grafana (monitoring/docker-compose.yml)

**Before:**
```yaml
services:
  grafana:
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD:-admin}
```

**After:**
```yaml
services:
  grafana:
    secrets:
      - grafana_password
    environment:
      - GF_SECURITY_ADMIN_PASSWORD__FILE=/run/secrets/grafana_password
```

### Traefik (traefik/docker-compose.yml)

**Before:**
```yaml
services:
  traefik:
    environment:
      - ACME_EMAIL=${ACME_EMAIL}
```

**After:**
```yaml
services:
  traefik:
    secrets:
      - acme_email
    command:
      # Update acme email to use file
      - "--certificatesresolvers.letsencrypt.acme.email=$(cat /run/secrets/acme_email)"
```

Or create dynamic config:

```yaml
# traefik/config/acme.yml
certificatesResolvers:
  letsencrypt:
    acme:
      email: $(cat /run/secrets/acme_email)
      storage: /letsencrypt/acme.json
      tlsChallenge: {}
```

### Web UI (web-ui/docker-compose.yml)

**Before:**
```yaml
services:
  web-ui:
    environment:
      - ADMIN_PASSWORD=${ADMIN_PASSWORD:-admin}
```

**After:**
```yaml
services:
  web-ui:
    secrets:
      - admin_password
    environment:
      - ADMIN_PASSWORD_FILE=/run/secrets/admin_password
```

### fail2ban (fail2ban/docker-compose.yml)

**Before:**
```yaml
services:
  fail2ban:
    environment:
      - SSMTP_PASSWORD=${SMTP_PASSWORD:-}
```

**After:**
```yaml
services:
  fail2ban:
    secrets:
      - smtp_password
    environment:
      - SSMTP_PASSWORD_FILE=/run/secrets/smtp_password
```

---

## Update .env File

Remove secrets, keep only non-sensitive configuration:

```bash
# .env (updated)

# User and Group IDs
PUID=1000
PGID=1000

# Timezone
TZ=America/New_York

# Network
NETWORK_NAME=media-network

# Domain Configuration
DOMAIN_SUFFIX=.lan
PUBLIC_DASHBOARD_DOMAIN=otterammo.xyz
SERVER_IP=192.168.86.111

# Service Domains
JELLYFIN_DOMAIN=jellyfin.lan
JELLYSEERR_DOMAIN=jellyseerr.lan
SONARR_DOMAIN=sonarr.lan
RADARR_DOMAIN=radarr.lan
PROWLARR_DOMAIN=prowlarr.lan
BAZARR_DOMAIN=bazarr.lan
QBITTORRENT_DOMAIN=qbittorrent.lan

# VPN Configuration (non-sensitive)
VPN_PROVIDER=mullvad
VPN_TYPE=wireguard
VPN_SERVER_CITIES=Chicago
VPN_INPUT_PORTS=6881
FIREWALL_OUTBOUND_SUBNETS=172.18.0.0/16,192.168.1.0/24

# Media Paths
MOVIES_PATH=/mnt/external/movies
TV_PATH=/mnt/external/tv
MUSIC_PATH=/mnt/external/music
DOWNLOADS_PATH=/mnt/external/downloads

# SMTP Configuration (non-sensitive)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_TLS=YES

# Fail2ban
FAIL2BAN_EMAIL=admin@otterammo.xyz
FAIL2BAN_SENDER=fail2ban@otterammo.xyz

# All sensitive values moved to secrets/ directory
```

---

## Create .env.example

```bash
# .env.example
# Copy this file to .env and fill in your values
# Sensitive values should be placed in secrets/ directory

# User and Group IDs
PUID=1000
PGID=1000

# Timezone
TZ=America/New_York

# Network
NETWORK_NAME=media-network

# Domain Configuration
DOMAIN_SUFFIX=.lan
PUBLIC_DASHBOARD_DOMAIN=your-domain.com
SERVER_IP=192.168.1.100

# Service Domains
JELLYFIN_DOMAIN=jellyfin.lan
JELLYSEERR_DOMAIN=jellyseerr.lan
SONARR_DOMAIN=sonarr.lan
RADARR_DOMAIN=radarr.lan
PROWLARR_DOMAIN=prowlarr.lan
BAZARR_DOMAIN=bazarr.lan
QBITTORRENT_DOMAIN=qbittorrent.lan

# VPN Configuration
VPN_PROVIDER=mullvad
VPN_TYPE=wireguard
VPN_SERVER_CITIES=Chicago
VPN_INPUT_PORTS=6881
FIREWALL_OUTBOUND_SUBNETS=172.18.0.0/16,192.168.1.0/24

# Media Paths
MOVIES_PATH=/mnt/external/movies
TV_PATH=/mnt/external/tv
MUSIC_PATH=/mnt/external/music
DOWNLOADS_PATH=/mnt/external/downloads

# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_TLS=YES
FAIL2BAN_EMAIL=admin@your-domain.com
FAIL2BAN_SENDER=fail2ban@your-domain.com

# SECRETS (create these files in secrets/ directory):
# secrets/cloudflare_token.txt
# secrets/vpn_private_key.txt
# secrets/vpn_addresses.txt
# secrets/grafana_password.txt
# secrets/smtp_password.txt
# secrets/acme_email.txt
# secrets/admin_password.txt
```

---

## Update .gitignore

```bash
# Add to .gitignore
echo "" >> .gitignore
echo "# Secrets" >> .gitignore
echo "secrets/" >> .gitignore
echo ".env" >> .gitignore
echo "*.key" >> .gitignore
echo "*.pem" >> .gitignore
echo "**/acme.json" >> .gitignore
```

---

## Create Secrets README

```bash
cat > secrets/README.md << 'EOF'
# Secrets Directory

This directory contains sensitive credentials used by various services.

## Files

- `cloudflare_token.txt` - Cloudflare Tunnel token
- `vpn_private_key.txt` - WireGuard VPN private key
- `vpn_addresses.txt` - WireGuard VPN addresses
- `grafana_password.txt` - Grafana admin password
- `smtp_password.txt` - SMTP password for email notifications
- `acme_email.txt` - Email for Let's Encrypt registration
- `admin_password.txt` - Web UI admin password

## Security

- ⚠️ Never commit these files to version control
- Permissions should be 600 (owner read/write only)
- Backup securely (encrypted)
- Rotate regularly

## Backup

```bash
# Create encrypted backup
tar czf - secrets/ | openssl enc -aes-256-cbc -salt -out secrets-backup-$(date +%Y%m%d).tar.gz.enc

# Restore from backup
openssl enc -d -aes-256-cbc -in secrets-backup-YYYYMMDD.tar.gz.enc | tar xzf -
```

## Rotation Schedule

- VPN keys: Every 6 months
- Passwords: Every 3 months
- API tokens: Yearly or when compromised
EOF
```

---

## Implementation Steps

### Step 1: Backup

```bash
cd /home/otterammo/media
mkdir -p backups/iter5-pre
cp .env backups/iter5-pre/
cp -r */docker-compose.yml backups/iter5-pre/
```

### Step 2: Create and Populate Secrets

```bash
# Create directory
mkdir -p secrets
chmod 700 secrets

# Extract from .env (automated)
./scripts/extract-secrets.sh  # Or manual extraction as shown above

# Verify
ls -lah secrets/
cat secrets/cloudflare_token.txt  # Check content
```

### Step 3: Update Service Configs

Update each service one by one:

```bash
nano cloudflared/docker-compose.yml
nano qbittorrent/docker-compose.yml
nano monitoring/docker-compose.yml
nano traefik/docker-compose.yml
nano web-ui/docker-compose.yml
nano fail2ban/docker-compose.yml
```

### Step 4: Update Main Compose File

```bash
nano docker-compose.yml
# Add secrets section
```

### Step 5: Create .env.example

```bash
cp .env .env.example
nano .env.example
# Remove sensitive values, add instructions
```

### Step 6: Update .env

```bash
nano .env
# Remove all secrets (they're now in secrets/ directory)
```

### Step 7: Update .gitignore

```bash
nano .gitignore
# Add secrets/, .env, etc.
```

### Step 8: Test Configuration

```bash
# Validate docker-compose
docker-compose config --quiet

# Check for errors
if [ $? -ne 0 ]; then
    echo "❌ Configuration invalid"
    exit 1
fi
```

### Step 9: Rolling Deployment

Deploy services one at a time:

```bash
# Cloudflared
docker-compose up -d cloudflared
docker-compose logs -f cloudflared

# Gluetun (may need restart for secrets)
docker-compose up -d gluetun
sleep 10
docker-compose logs gluetun | grep -i wireguard

# Grafana
docker-compose up -d grafana
docker-compose logs grafana | grep -i admin

# Continue with other services...
```

---

## Validation Tests

### Test 1: Secrets Mounted

```bash
# Check if secrets are accessible in containers
docker exec cloudflared ls -la /run/secrets/
docker exec gluetun ls -la /run/secrets/
docker exec grafana ls -la /run/secrets/
```

### Test 2: Services Using Secrets

```bash
# Cloudflared tunnel status
docker-compose logs cloudflared | grep -i "connected"

# VPN connection
docker-compose logs gluetun | grep -i "wireguard"

# Grafana login
curl -u admin:$(cat secrets/grafana_password.txt) https://grafana.lan/api/health
```

### Test 3: Secrets Not in Environment

```bash
# Should NOT show secret values
docker inspect cloudflared | grep -i cloudflare
docker inspect gluetun | grep -i wireguard
docker inspect grafana | grep -i password
```

### Test 4: Functionality

- [ ] Cloudflared tunnel working
- [ ] VPN connection active
- [ ] Grafana login works
- [ ] Email notifications work (if configured)
- [ ] Web UI admin access works

---

## Validation Checklist

- [ ] All secrets extracted to files
- [ ] Secrets directory has 700 permissions
- [ ] Secret files have 600 permissions
- [ ] Services using secrets instead of .env
- [ ] .env file has no sensitive data
- [ ] .env.example created
- [ ] .gitignore updated
- [ ] secrets/ directory not in git
- [ ] Services restart successfully
- [ ] All functionality working
- [ ] Secrets not visible in `docker inspect`
- [ ] Backup procedure documented

---

## Secret Rotation Procedure

### Rotate VPN Key

```bash
# Generate new WireGuard key
wg genkey > secrets/vpn_private_key.txt.new

# Test with new key
mv secrets/vpn_private_key.txt secrets/vpn_private_key.txt.old
mv secrets/vpn_private_key.txt.new secrets/vpn_private_key.txt

# Restart Gluetun
docker-compose restart gluetun

# Verify connection
docker-compose logs gluetun | grep -i connected

# If successful, delete old key
rm secrets/vpn_private_key.txt.old
```

### Rotate Passwords

```bash
# Generate new password
new_pass=$(openssl rand -base64 32)

# Update secret file
echo "$new_pass" > secrets/grafana_password.txt

# Restart service
docker-compose restart grafana

# Update admin password in Grafana UI
# Or via API
```

---

## Troubleshooting

### Issue: Service Can't Read Secret

**Symptoms:**
```
Error: unable to read file /run/secrets/secret_name
```

**Solution:**
```bash
# Check secret is defined in docker-compose.yml
docker-compose config | grep -A5 secrets

# Verify file exists
ls -la secrets/secret_name.txt

# Check service has secret mounted
docker inspect <service> | jq '.[0].Mounts[] | select(.Destination | contains("secrets"))'

# Restart service
docker-compose up -d <service>
```

### Issue: Secret Value Incorrect

**Symptoms:**
Service fails authentication with correct-looking secret

**Solution:**
```bash
# Check for whitespace or newlines
cat -A secrets/secret_name.txt

# Remove trailing newlines
tr -d '\n' < secrets/secret_name.txt > secrets/secret_name.txt.tmp
mv secrets/secret_name.txt.tmp secrets/secret_name.txt

# Restart service
docker-compose restart <service>
```

---

## Rollback Procedure

```bash
# Restore .env with secrets
cp backups/iter5-pre/.env .

# Restore service configs
cp -r backups/iter5-pre/* .

# Remove secrets directory (optional)
# rm -rf secrets/

# Restart services
docker-compose up -d
```

---

## Post-Migration Tasks

### Immediate
- [ ] Securely backup secrets directory (encrypted)
- [ ] Document secret rotation schedule
- [ ] Test backup/restore procedure
- [ ] Remove old .env from version control history (if committed)

### Within 1 Week
- [ ] Set up secret rotation reminders
- [ ] Create secret audit log
- [ ] Implement automated secret rotation (optional)
- [ ] Prepare for Iteration 6 (Enhanced Monitoring)

---

## Success Criteria

✅ **Iteration 5 is successful if:**

1. All secrets moved to dedicated directory
2. No plaintext secrets in .env
3. Secrets not in version control
4. Services using Docker secrets
5. Proper file permissions (700/600)
6. All services functioning correctly
7. Secrets not visible in container inspection
8. Rotation procedure documented

---

## Next Steps

**Ready for next iteration?** → [Iteration 6: Enhanced Monitoring](iteration-06-enhanced-monitoring.md)
