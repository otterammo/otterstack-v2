# Iteration 7: Infrastructure Hardening

**Status:** Not Started
**Duration:** 2-3 days
**Risk Level:** Low
**Downtime:** None
**Dependencies:** Iteration 6 completed

---

## Objectives

1. Implement automated backup system
2. Enforce resource quotas across all services
3. Configure rate limiting in Traefik
4. Add health-based auto-recovery
5. Implement configuration validation
6. Document disaster recovery procedures

---

## Pre-Migration Checklist

- [ ] Iteration 6 validated and stable
- [ ] Full system backup
- [ ] Identify backup storage location
- [ ] Plan backup retention policy
- [ ] Review resource usage patterns

---

## Automated Backup System

### Backup Service

Create `backup/docker-compose.yml`:

```yaml
services:
  backup:
    image: offen/docker-volume-backup:latest
    container_name: backup
    restart: unless-stopped

    volumes:
      # Service configs to backup
      - ../jellyfin/config:/backup/jellyfin-config:ro
      - ../jellyseerr/config:/backup/jellyseerr-config:ro
      - ../sonarr/config:/backup/sonarr-config:ro
      - ../radarr/config:/backup/radarr-config:ro
      - ../prowlarr/config:/backup/prowlarr-config:ro
      - ../bazarr/config:/backup/bazarr-config:ro
      - ../qbittorrent/qbittorrent/config:/backup/qbittorrent-config:ro
      - ../monitoring/prometheus/data:/backup/prometheus-data:ro
      - ../monitoring/grafana/data:/backup/grafana-data:ro
      - ../monitoring/loki/data:/backup/loki-data:ro
      - ../traefik/letsencrypt:/backup/traefik-certs:ro
      - ../authelia/config:/backup/authelia-config:ro
      - ../authelia/data:/backup/authelia-data:ro

      # Docker socket for container stop/start
      - /var/run/docker.sock:/var/run/docker.sock:ro

      # Backup destination
      - /mnt/backups:/archive

    environment:
      - TZ=${TZ:-UTC}
      - BACKUP_CRON_EXPRESSION=${BACKUP_CRON:-0 2 * * *}  # 2 AM daily
      - BACKUP_FILENAME=media-server-backup-%Y%m%d-%H%M%S.tar.gz
      - BACKUP_RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}
      - BACKUP_PRUNING_LEEWAY=1m
      - BACKUP_COMPRESSION=gz

      # Stop containers during backup (optional)
      # - BACKUP_STOP_DURING_BACKUP_LABEL=backup.stop=true

      # Notification (optional)
      # - NOTIFICATION_URLS=${BACKUP_NOTIFICATION_URL}

    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 128M

    networks:
      - mgmt-net

    labels:
      - "traefik.enable=false"

    healthcheck:
      test: ["CMD", "sh", "-c", "test -f /archive/latest"]
      interval: 1h
      timeout: 10s
      retries: 3
```

### Backup Configuration

Create `backup/.env`:

```bash
# Backup schedule (cron format)
BACKUP_CRON=0 2 * * *  # Daily at 2 AM

# Retention (days)
BACKUP_RETENTION_DAYS=30

# Notification URL (optional - Healthchecks.io, Discord, Slack, etc.)
# BACKUP_NOTIFICATION_URL=https://hc-ping.com/your-uuid
```

### Add to Main Compose

```yaml
# docker-compose.yml
include:
  - authelia/docker-compose.yml
  - backup/docker-compose.yml  # ADD THIS
  - cloudflared/docker-compose.yml
  # ... rest of includes
```

---

## Resource Quotas

### Global Resource Templates

Create `templates/resources.yml`:

```yaml
# Reusable resource configurations

x-tiny-resources: &tiny-resources
  deploy:
    resources:
      limits:
        memory: 128M
        cpus: '0.25'
      reservations:
        memory: 32M
        cpus: '0.1'

x-small-resources: &small-resources
  deploy:
    resources:
      limits:
        memory: 256M
        cpus: '0.5'
      reservations:
        memory: 64M
        cpus: '0.1'

x-medium-resources: &medium-resources
  deploy:
    resources:
      limits:
        memory: 512M
        cpus: '1.0'
      reservations:
        memory: 128M
        cpus: '0.25'

x-large-resources: &large-resources
  deploy:
    resources:
      limits:
        memory: 1G
        cpus: '2.0'
      reservations:
        memory: 256M
        cpus: '0.5'

x-xlarge-resources: &xlarge-resources
  deploy:
    resources:
      limits:
        memory: 2G
        cpus: '4.0'
      reservations:
        memory: 512M
        cpus: '1.0'

x-xxlarge-resources: &xxlarge-resources
  deploy:
    resources:
      limits:
        memory: 4G
        cpus: '8.0'
      reservations:
        memory: 1G
        cpus: '2.0'
```

### Service Resource Assignments

| Service | Size | Memory Limit | CPU Limit |
|---------|------|--------------|-----------|
| **Jellyfin** | XXLarge | 4G | 8 cores |
| **qBittorrent** | XXLarge | 4G | 8 cores |
| **Sonarr** | Large | 1G | 2 cores |
| **Radarr** | Medium | 512M | 1 core |
| **Grafana** | Medium | 512M | 1 core |
| **Prometheus** | Medium | 512M | 1 core |
| **Traefik** | Small | 256M | 0.5 cores |
| **Loki** | Medium | 512M | 1 core |
| **Prowlarr** | Small | 256M | 0.5 cores |
| **Bazarr** | Medium | 512M | 1 core |
| **Jellyseerr** | Medium | 512M | 1 core |
| **Authelia** | Small | 256M | 0.5 cores |
| **cAdvisor** | Small | 256M | 0.5 cores |
| **Node Exporter** | Tiny | 128M | 0.25 cores |
| **Alertmanager** | Small | 256M | 0.5 cores |
| **Promtail** | Small | 256M | 0.5 cores |
| **Dozzle** | Small | 256M | 0.5 cores |
| **Autoheal** | Tiny | 128M | 0.25 cores |
| **Gluetun** | Medium | 512M | 1 core |

### Update Services with Resource Limits

Example for Jellyfin:

```yaml
services:
  jellyfin:
    # ... existing config ...
    deploy:
      resources:
        limits:
          memory: 4G
          cpus: '8.0'
        reservations:
          memory: 1G
          cpus: '2.0'
```

---

## Rate Limiting in Traefik

### Add Rate Limit Middleware

Update `traefik/docker-compose.yml`:

```yaml
services:
  traefik:
    # ... existing config ...
    command:
      # ... existing commands ...

      # Rate limiting
      - "--http.middlewares.rate-limit.ratelimit.average=100"
      - "--http.middlewares.rate-limit.ratelimit.burst=200"
      - "--http.middlewares.rate-limit.ratelimit.period=1m"

      # IP whitelisting for admin services (optional)
      - "--http.middlewares.lan-only.ipwhitelist.sourcerange=192.168.0.0/16,172.16.0.0/12,10.0.0.0/8"
```

Or create dynamic config file `traefik/config/middlewares.yml`:

```yaml
http:
  middlewares:
    # Rate limiting - global
    rate-limit-global:
      rateLimit:
        average: 100
        period: 1m
        burst: 200

    # Rate limiting - strict (for sensitive endpoints)
    rate-limit-strict:
      rateLimit:
        average: 10
        period: 1m
        burst: 20

    # Security headers
    security-headers:
      headers:
        frameDeny: true
        browserXssFilter: true
        contentTypeNosniff: true
        stsIncludeSubdomains: true
        stsPreload: true
        stsSeconds: 31536000
        customResponseHeaders:
          X-Robots-Tag: "none,noarchive,nosnippet,notranslate,noimageindex"

    # LAN only access
    lan-only:
      ipWhiteList:
        sourceRange:
          - 192.168.0.0/16
          - 172.16.0.0/12
          - 10.0.0.0/8

    # Chain middlewares for admin services
    admin-chain:
      chain:
        middlewares:
          - authelia@docker
          - rate-limit-strict
          - security-headers
          - lan-only
```

### Apply to Services

Update service labels to use rate limiting:

```yaml
# For public services
labels:
  - "traefik.http.routers.jellyfin.middlewares=rate-limit-global,security-headers"

# For protected services
labels:
  - "traefik.http.routers.jellyseerr.middlewares=authelia@docker,rate-limit-global,security-headers"

# For admin services (strict)
labels:
  - "traefik.http.routers.sonarr.middlewares=admin-chain"
```

---

## Enhanced Health Checks

### Update Autoheal Configuration

Update `qbittorrent/docker-compose.yml`:

```yaml
services:
  autoheal:
    image: willfarrell/autoheal:latest
    container_name: autoheal
    restart: unless-stopped

    environment:
      - AUTOHEAL_CONTAINER_LABEL=autoheal
      - AUTOHEAL_INTERVAL=${AUTOHEAL_INTERVAL:-60}  # Check every 60s
      - AUTOHEAL_START_PERIOD=${AUTOHEAL_START_PERIOD:-300}  # Wait 5min before first check
      - AUTOHEAL_DEFAULT_STOP_TIMEOUT=${AUTOHEAL_STOP_TIMEOUT:-10}
      - AUTOHEAL_ONLY_MONITOR_RUNNING=true
      - WEBHOOK_URL=${AUTOHEAL_WEBHOOK_URL:-}  # Notification webhook

    volumes:
      - /var/run/docker.sock:/var/run/docker.sock

    networks:
      - mgmt-net

    deploy:
      resources:
        limits:
          memory: 128M
        reservations:
          memory: 32M
```

### Add Health Check Labels to Critical Services

```yaml
# Gluetun (VPN)
labels:
  - "autoheal=true"
  - "autoheal.stop.timeout=30"

# Jellyfin
labels:
  - "autoheal=true"

# Sonarr/Radarr
labels:
  - "autoheal=true"
```

---

## Configuration Validation

### Pre-deployment Validation Script

Create `scripts/validate-config.sh`:

```bash
#!/bin/bash

set -e

echo "🔍 Validating configuration..."

# Check docker-compose syntax
echo "✓ Checking docker-compose syntax..."
docker-compose config --quiet
if [ $? -ne 0 ]; then
    echo "❌ docker-compose validation failed"
    exit 1
fi

# Check for secrets
echo "✓ Checking secrets exist..."
required_secrets=(
    "secrets/cloudflare_token"
    "secrets/vpn_private_key.txt"
    "secrets/grafana_password.txt"
)

for secret in "${required_secrets[@]}"; do
    if [ ! -f "$secret" ]; then
        echo "❌ Missing secret: $secret"
        exit 1
    fi
done

# Check file permissions
echo "✓ Checking file permissions..."
if [ $(stat -c %a secrets/) != "700" ]; then
    echo "⚠️  Warning: secrets/ directory permissions should be 700"
fi

# Check for exposed ports
echo "✓ Checking port exposure..."
exposed_ports=$(docker-compose config | grep -E "^\s+-\s+\"[0-9]+:" | wc -l)
if [ $exposed_ports -gt 5 ]; then
    echo "⚠️  Warning: $exposed_ports ports exposed (expected ≤5)"
fi

# Check resource limits
echo "✓ Checking resource limits..."
services_without_limits=$(docker-compose config | grep -A 20 "services:" | grep -c "resources:" || true)
echo "   Services with resource limits: $services_without_limits"

# Check Traefik labels
echo "✓ Checking Traefik labels..."
services_with_traefik=$(docker-compose config | grep -c "traefik.enable=true" || true)
echo "   Services exposed via Traefik: $services_with_traefik"

# Validate Authelia config
if [ -f "authelia/config/configuration.yml" ]; then
    echo "✓ Checking Authelia configuration..."
    # Check for default passwords
    if grep -q "REPLACE_WITH_HASH" authelia/config/users.yml 2>/dev/null; then
        echo "❌ Authelia users.yml contains placeholder passwords"
        exit 1
    fi
fi

# Check disk space
echo "✓ Checking disk space..."
available_space=$(df -BG . | tail -1 | awk '{print $4}' | tr -d 'G')
if [ $available_space -lt 50 ]; then
    echo "⚠️  Warning: Low disk space (${available_space}GB available)"
fi

echo ""
echo "✅ Configuration validation passed!"
echo ""
```

Make it executable:

```bash
chmod +x scripts/validate-config.sh
```

---

## Disaster Recovery

### Backup Script

Create `scripts/backup-all.sh`:

```bash
#!/bin/bash

BACKUP_DIR="backups/manual-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "📦 Creating backup in $BACKUP_DIR..."

# Backup configurations
echo "  ↳ Backing up service configs..."
cp -r */docker-compose.yml "$BACKUP_DIR/"
cp docker-compose.yml "$BACKUP_DIR/"
cp .env "$BACKUP_DIR/.env.backup"

# Backup secrets
echo "  ↳ Backing up secrets..."
cp -r secrets/ "$BACKUP_DIR/"

# Backup critical data
echo "  ↳ Backing up Authelia data..."
cp -r authelia/data/ "$BACKUP_DIR/authelia-data/"

echo "  ↳ Backing up Traefik certificates..."
cp -r traefik/letsencrypt/ "$BACKUP_DIR/traefik-certs/"

# Create archive
echo "  ↳ Creating archive..."
tar czf "$BACKUP_DIR.tar.gz" -C backups "$(basename $BACKUP_DIR)"

# Encrypt (optional)
if command -v openssl &> /dev/null; then
    echo "  ↳ Encrypting backup..."
    openssl enc -aes-256-cbc -salt -in "$BACKUP_DIR.tar.gz" -out "$BACKUP_DIR.tar.gz.enc"
    rm "$BACKUP_DIR.tar.gz"
    echo "✅ Encrypted backup created: $BACKUP_DIR.tar.gz.enc"
else
    echo "✅ Backup created: $BACKUP_DIR.tar.gz"
fi

# Cleanup old backups (keep last 10)
echo "  ↳ Cleaning old backups..."
ls -t backups/manual-*.tar.gz* | tail -n +11 | xargs -r rm

echo "✅ Backup complete!"
```

### Restore Script

Create `scripts/restore-backup.sh`:

```bash
#!/bin/bash

if [ -z "$1" ]; then
    echo "Usage: $0 <backup-file>"
    echo ""
    echo "Available backups:"
    ls -lh backups/manual-*.tar.gz* 2>/dev/null || echo "  No backups found"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "⚠️  WARNING: This will restore configuration from backup!"
echo "   Current configuration will be backed up first."
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 0
fi

# Backup current state
./scripts/backup-all.sh

# Decrypt if needed
if [[ "$BACKUP_FILE" == *.enc ]]; then
    echo "🔓 Decrypting backup..."
    DECRYPTED="${BACKUP_FILE%.enc}"
    openssl enc -d -aes-256-cbc -in "$BACKUP_FILE" -out "$DECRYPTED"
    BACKUP_FILE="$DECRYPTED"
fi

# Extract
echo "📂 Extracting backup..."
tar xzf "$BACKUP_FILE" -C backups/

BACKUP_DIR=$(tar tzf "$BACKUP_FILE" | head -1 | cut -f1 -d"/")

# Restore
echo "♻️  Restoring configuration..."
cp -r "backups/$BACKUP_DIR"/* .

# Restart services
echo "🔄 Restarting services..."
docker-compose down
docker-compose up -d

echo "✅ Restore complete!"
echo "   Verify services: docker-compose ps"
```

Make executable:

```bash
chmod +x scripts/backup-all.sh scripts/restore-backup.sh
```

---

## Implementation Steps

### Step 1: Backup Current State

```bash
cd /home/otterammo/media
mkdir -p backups/iter7-pre
cp -r */docker-compose.yml backups/iter7-pre/
cp docker-compose.yml backups/iter7-pre/
```

### Step 2: Create Scripts Directory

```bash
mkdir -p scripts
# Create validate-config.sh, backup-all.sh, restore-backup.sh (from above)
chmod +x scripts/*.sh
```

### Step 3: Add Resource Templates

```bash
cat > templates/resources.yml << 'EOF'
# (paste resource templates from above)
EOF
```

### Step 4: Update Services with Resource Limits

Update each service's docker-compose.yml with appropriate resource limits.

### Step 5: Create Backup Service

```bash
mkdir -p backup
# Create backup/docker-compose.yml (from above)
# Create backup/.env

# Ensure backup destination exists
sudo mkdir -p /mnt/backups
sudo chown $USER:$USER /mnt/backups
```

### Step 6: Add Traefik Rate Limiting

```bash
mkdir -p traefik/config
# Create traefik/config/middlewares.yml (from above)

# Update traefik/docker-compose.yml to mount config
```

### Step 7: Update Service Labels

Add rate limiting and security headers to all services.

### Step 8: Deploy Changes

```bash
# Validate first
./scripts/validate-config.sh

# Deploy
docker-compose config --quiet
docker-compose up -d

# Monitor
docker-compose logs -f
```

### Step 9: Test Backup

```bash
# Trigger manual backup
docker-compose exec backup /bin/sh -c "/bin/backup"

# Verify backup created
ls -lh /mnt/backups/
```

### Step 10: Test Rate Limiting

```bash
# Rapid requests to test rate limit
for i in {1..150}; do
    curl -s -o /dev/null -w "%{http_code}\n" https://jellyfin.lan
    sleep 0.1
done

# Should see some 429 (Too Many Requests) responses
```

---

## Validation Tests

### Test 1: Resource Limits Enforced

```bash
# Check resource limits applied
docker inspect jellyfin | jq '.[0].HostConfig.Memory'
docker inspect jellyfin | jq '.[0].HostConfig.NanoCpus'

# Monitor resource usage
docker stats --no-stream
```

### Test 2: Backup Working

```bash
# Check backup cron
docker-compose logs backup | grep "cron"

# Manually trigger backup
docker-compose exec backup /bin/sh -c "/bin/backup"

# Verify backup file
ls -lh /mnt/backups/
```

### Test 3: Rate Limiting

```bash
# Test rate limit
ab -n 200 -c 10 https://jellyfin.lan/

# Check Traefik logs for rate limit hits
docker-compose logs traefik | grep "429"
```

### Test 4: Auto-healing

```bash
# Make a service unhealthy
docker-compose pause jellyfin

# Wait for autoheal to detect (60s interval)
sleep 90

# Check if restarted
docker-compose logs autoheal
docker-compose ps jellyfin
```

### Test 5: Configuration Validation

```bash
# Run validation script
./scripts/validate-config.sh

# Should pass all checks
```

---

## Validation Checklist

- [ ] Backup service running and scheduled
- [ ] Manual backup tested successfully
- [ ] Backup restoration tested
- [ ] Resource limits applied to all services
- [ ] Rate limiting functional
- [ ] Security headers applied
- [ ] Auto-healing working for critical services
- [ ] Configuration validation script working
- [ ] Disaster recovery documented
- [ ] Scripts executable and tested

---

## Monitoring Hardening

### Create Hardening Dashboard

Import or create dashboard with:

**Panels:**
1. Resource usage vs limits per service
2. Rate limit hit count
3. Auto-heal events
4. Backup status
5. Configuration drift detection
6. Security event log

---

## Troubleshooting

### Issue: Service OOM (Out of Memory)

**Symptoms:**
Container killed by OOM killer

**Solution:**
```bash
# Check memory limit
docker inspect <service> | jq '.[0].HostConfig.Memory'

# Increase limit
# Edit docker-compose.yml, increase memory limit
docker-compose up -d <service>

# Monitor
docker stats <service>
```

### Issue: Rate Limit Too Aggressive

**Symptoms:**
Legitimate users getting 429 errors

**Solution:**
```bash
# Increase rate limit
nano traefik/config/middlewares.yml
# Increase average and burst values

# Restart Traefik
docker-compose restart traefik
```

### Issue: Backup Failed

**Symptoms:**
No backup files created

**Solution:**
```bash
# Check backup logs
docker-compose logs backup

# Verify backup destination writable
docker exec backup ls -la /archive

# Check disk space
df -h /mnt/backups

# Test manual backup
docker-compose exec backup /bin/sh -c "/bin/backup"
```

---

## Rollback Procedure

```bash
# Restore previous configuration
cp -r backups/iter7-pre/* .

# Remove backup service
docker-compose stop backup
docker-compose rm -f backup

# Restart all services
docker-compose up -d
```

---

## Post-Migration Tasks

### Immediate
- [ ] Verify automated backups running
- [ ] Test backup restoration
- [ ] Monitor resource usage
- [ ] Document all scripts and procedures

### Within 1 Week
- [ ] Review backup retention policy
- [ ] Tune resource limits based on actual usage
- [ ] Create runbook for common operations
- [ ] Schedule periodic disaster recovery drills

### Long-term
- [ ] Implement off-site backup replication
- [ ] Set up backup monitoring alerts
- [ ] Review and update security hardening
- [ ] Plan for capacity scaling

---

## Success Criteria

✅ **Iteration 7 is successful if:**

1. Automated backups running on schedule
2. Backup restoration tested and working
3. Resource limits enforced on all services
4. Rate limiting protecting services
5. Auto-healing functional for critical services
6. Configuration validation automated
7. Disaster recovery procedures documented
8. All scripts tested and working

---

## Final Architecture State

After completing all 7 iterations, you will have:

✅ **Network Security**
- 6 segmented networks with clear boundaries
- Only 3 ports exposed (80, 443, 6881)
- Internal networks isolated from internet

✅ **Authentication & Authorization**
- Centralized SSO with Authelia
- 2FA for admin services
- Fine-grained access control

✅ **Encryption**
- TLS for all external connections
- Automated certificate management
- Secrets properly managed

✅ **Monitoring & Observability**
- Centralized logging with Loki
- Comprehensive metrics with Prometheus
- Unified dashboards in Grafana
- Proactive alerting

✅ **Infrastructure**
- Automated backups with retention
- Resource limits enforced
- Rate limiting protection
- Auto-healing for resilience
- Configuration validation

---

## Maintenance Schedule

### Daily
- Automated backups (2 AM)
- Health checks
- Log aggregation

### Weekly
- Review alerts and anomalies
- Check backup success
- Resource usage analysis

### Monthly
- Security updates
- Certificate renewal check
- Backup restoration test
- Capacity planning review

### Quarterly
- Secret rotation
- Disaster recovery drill
- Architecture review
- Performance optimization

---

## Congratulations! 🎉

You've successfully migrated from a flat, insecure architecture to a modern, hardened infrastructure with:

- **87% reduction** in attack surface (15+ ports → 3 ports)
- **Defense in depth** security (6 layers)
- **Centralized authentication** (SSO + 2FA)
- **Full observability** (metrics + logs + traces)
- **Automated operations** (backups, healing, monitoring)

Your media server is now production-ready with enterprise-grade security and reliability!

---

## Next Steps

### Operational Excellence
- [ ] Create team runbooks
- [ ] Document troubleshooting procedures
- [ ] Set up on-call rotation (if applicable)
- [ ] Establish SLAs/SLOs

### Continuous Improvement
- [ ] Review and tune based on usage
- [ ] Collect user feedback
- [ ] Plan future enhancements
- [ ] Stay updated with security patches

### Advanced Topics (Optional)
- [ ] Implement GitOps for config management
- [ ] Add distributed tracing
- [ ] Set up Kubernetes (if scaling needed)
- [ ] Implement blue-green deployments

**Well done!** 🚀
