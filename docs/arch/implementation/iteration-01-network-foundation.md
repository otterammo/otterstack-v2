# Iteration 1: Network Foundation

**Status:** Not Started
**Duration:** 1-2 days
**Risk Level:** Low
**Downtime:** None

---

## Objectives

1. Create 6 new segmented Docker networks
2. Assign services to appropriate networks (multi-homed)
3. Validate inter-service connectivity
4. Keep existing media-network active during transition
5. Prepare for removal of media-network in future iteration

---

## Pre-Migration Checklist

- [ ] Full system backup completed
- [ ] Document current network configuration
  ```bash
  docker network ls > backups/networks-before.txt
  docker network inspect media-network > backups/media-network-before.json
  ```
- [ ] Document current service connectivity
  ```bash
  docker-compose ps > backups/services-before.txt
  ```
- [ ] Create rollback snapshot
  ```bash
  cp docker-compose.yml backups/docker-compose.yml.iter0
  cp -r */docker-compose.yml backups/
  ```
- [ ] Verify all services are running
  ```bash
  docker-compose ps | grep -v "Up"
  ```

---

## Network Definitions

Create a new file: `networks.yml`

```yaml
# networks.yml
networks:
  # Existing network (keep for backward compatibility)
  media-network:
    name: ${NETWORK_NAME:-media-network}
    driver: bridge

  # DMZ - External-facing ingress layer
  dmz-net:
    name: dmz-net
    driver: bridge
    ipam:
      driver: default
      config:
        - subnet: 172.20.0.0/24
          gateway: 172.20.0.1

  # Frontend - User-facing application services
  frontend-net:
    name: frontend-net
    driver: bridge
    internal: true  # No direct internet access
    ipam:
      driver: default
      config:
        - subnet: 172.20.1.0/24
          gateway: 172.20.1.1

  # Backend - Business logic and automation services
  backend-net:
    name: backend-net
    driver: bridge
    internal: true
    ipam:
      driver: default
      config:
        - subnet: 172.20.2.0/24
          gateway: 172.20.2.1

  # Download - VPN-routed download services
  download-net:
    name: download-net
    driver: bridge
    ipam:
      driver: default
      config:
        - subnet: 172.20.3.0/24
          gateway: 172.20.3.1

  # Management - Infrastructure and monitoring services
  mgmt-net:
    name: mgmt-net
    driver: bridge
    internal: true
    ipam:
      driver: default
      config:
        - subnet: 172.20.4.0/24
          gateway: 172.20.4.1

  # Security - Security and authentication services
  security-net:
    name: security-net
    driver: bridge
    ipam:
      driver: default
      config:
        - subnet: 172.20.5.0/24
          gateway: 172.20.5.1
```

---

## Service Network Assignments

### Update Main docker-compose.yml

```yaml
# docker-compose.yml
include:
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
  - networks.yml  # Add this line
```

### Traefik (traefik/docker-compose.yml)

```yaml
services:
  traefik:
    # ... existing config ...
    networks:
      - media-network      # Keep for backward compatibility
      - dmz-net           # NEW: External access
      - frontend-net      # NEW: Route to frontend services
      - backend-net       # NEW: Route to backend services (for monitoring)
      - security-net      # NEW: Connect to security services
```

### Cloudflared (cloudflared/docker-compose.yml)

```yaml
services:
  cloudflared:
    # ... existing config ...
    networks:
      - media-network      # Keep for backward compatibility
      - dmz-net           # NEW: DMZ network with Traefik
```

### Jellyfin (jellyfin/docker-compose.yml)

```yaml
services:
  jellyfin:
    # ... existing config ...
    networks:
      - media-network      # Keep for backward compatibility
      - frontend-net      # NEW: User-facing service
```

### Jellyseerr (jellyseerr/docker-compose.yml)

```yaml
services:
  jellyseerr:
    # ... existing config ...
    networks:
      - media-network      # Keep for backward compatibility
      - frontend-net      # NEW: User interface
      - backend-net       # NEW: API calls to Sonarr/Radarr
```

### Web UI (web-ui/docker-compose.yml)

```yaml
services:
  web-ui:
    # ... existing config ...
    networks:
      - media-network      # Keep for backward compatibility
      - frontend-net      # NEW: User-facing dashboard
```

### Servarr Services (servarr/docker-compose.yml)

```yaml
services:
  sonarr:
    # ... existing config ...
    networks:
      - media-network      # Keep for backward compatibility
      - backend-net       # NEW: Business logic layer
      - download-net      # NEW: Connect to qBittorrent

  radarr:
    # ... existing config ...
    networks:
      - media-network      # Keep for backward compatibility
      - backend-net       # NEW: Business logic layer
      - download-net      # NEW: Connect to qBittorrent

  prowlarr:
    # ... existing config ...
    networks:
      - media-network      # Keep for backward compatibility
      - backend-net       # NEW: Business logic layer
      - download-net      # NEW: Connect to qBittorrent

  bazarr:
    # ... existing config ...
    networks:
      - media-network      # Keep for backward compatibility
      - backend-net       # NEW: Business logic layer
```

### Download Services (qbittorrent/docker-compose.yml)

```yaml
services:
  gluetun:
    # ... existing config ...
    networks:
      - media-network      # Keep for backward compatibility
      - download-net      # NEW: Isolated download network

  qbittorrent:
    # ... existing config ...
    # network_mode: "service:gluetun" remains unchanged
    # It will use gluetun's network stack

  autoheal:
    # ... existing config ...
    networks:
      - media-network      # Keep for backward compatibility
      - download-net      # NEW: Monitor gluetun
      - mgmt-net          # NEW: Management service
```

### Monitoring Services (monitoring/docker-compose.yml)

```yaml
services:
  prometheus:
    # ... existing config ...
    networks:
      - media-network      # Keep for backward compatibility
      - mgmt-net          # NEW: Management layer
      - frontend-net      # NEW: Scrape frontend services
      - backend-net       # NEW: Scrape backend services
      - download-net      # NEW: Scrape download services

  grafana:
    # ... existing config ...
    networks:
      - media-network      # Keep for backward compatibility
      - mgmt-net          # NEW: Management layer
      - frontend-net      # NEW: User-facing dashboard

  cadvisor:
    # ... existing config ...
    networks:
      - media-network      # Keep for backward compatibility
      - mgmt-net          # NEW: Management layer

  node-exporter:
    # ... existing config ...
    networks:
      - media-network      # Keep for backward compatibility
      - mgmt-net          # NEW: Management layer

  alertmanager:
    # ... existing config ...
    networks:
      - media-network      # Keep for backward compatibility
      - mgmt-net          # NEW: Management layer
```

### Dozzle (dozzle/docker-compose.yml)

```yaml
services:
  dozzle:
    # ... existing config ...
    networks:
      - media-network      # Keep for backward compatibility
      - mgmt-net          # NEW: Management layer
```

### fail2ban (fail2ban/docker-compose.yml)

```yaml
services:
  fail2ban:
    # ... existing config ...
    # network_mode: host remains unchanged
    # Will be migrated to security-net in future iteration
```

---

## Implementation Steps

### Step 1: Create networks.yml

```bash
cd /home/otterammo/media
cat > networks.yml << 'EOF'
# Copy the network definitions from above
EOF
```

### Step 2: Update docker-compose.yml

```bash
# Backup original
cp docker-compose.yml backups/docker-compose.yml.iter0

# Add networks.yml to includes
nano docker-compose.yml
# Add: - networks.yml to the include section
```

### Step 3: Update Individual Service Compose Files

Update each service's docker-compose.yml file with the network assignments shown above.

**Order of updates:**
1. traefik/docker-compose.yml
2. cloudflared/docker-compose.yml
3. jellyfin/docker-compose.yml
4. jellyseerr/docker-compose.yml
5. web-ui/docker-compose.yml
6. servarr/docker-compose.yml
7. qbittorrent/docker-compose.yml
8. monitoring/docker-compose.yml
9. dozzle/docker-compose.yml

### Step 4: Validate Configuration

```bash
# Validate docker-compose syntax
docker-compose config --quiet

# Check for errors
if [ $? -eq 0 ]; then
    echo "✅ Configuration valid"
else
    echo "❌ Configuration errors detected"
    exit 1
fi
```

### Step 5: Create Networks

```bash
# Create all new networks
docker network create --driver bridge --subnet 172.20.0.0/24 dmz-net
docker network create --driver bridge --subnet 172.20.1.0/24 --internal frontend-net
docker network create --driver bridge --subnet 172.20.2.0/24 --internal backend-net
docker network create --driver bridge --subnet 172.20.3.0/24 download-net
docker network create --driver bridge --subnet 172.20.4.0/24 --internal mgmt-net
docker network create --driver bridge --subnet 172.20.5.0/24 security-net

# Verify networks created
docker network ls | grep -E "(dmz-net|frontend-net|backend-net|download-net|mgmt-net|security-net)"
```

### Step 6: Rolling Service Updates

Update services one at a time to minimize disruption:

```bash
# Update Traefik first (gateway)
docker-compose up -d traefik
docker-compose logs -f traefik &  # Monitor logs
sleep 10

# Verify Traefik is healthy
docker inspect traefik | jq '.[0].State.Health.Status'

# Update Cloudflared
docker-compose up -d cloudflared
sleep 5

# Update Frontend services
docker-compose up -d jellyfin jellyseerr web-ui
sleep 10

# Update Backend services
docker-compose up -d sonarr radarr prowlarr bazarr
sleep 10

# Update Download services
docker-compose up -d gluetun autoheal
sleep 10

# Update Monitoring services
docker-compose up -d prometheus grafana cadvisor node-exporter alertmanager
sleep 10

# Update Management services
docker-compose up -d dozzle
```

### Step 7: Verify Service Health

```bash
# Check all services are running
docker-compose ps

# Check health checks
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "(healthy|unhealthy)"

# Check network assignments
docker inspect traefik | jq '.[0].NetworkSettings.Networks | keys'
```

---

## Validation Tests

### Test 1: Network Connectivity

```bash
# Test Traefik can reach Jellyfin
docker exec traefik ping -c 3 jellyfin

# Test Jellyseerr can reach Sonarr
docker exec jellyseerr ping -c 3 sonarr

# Test Sonarr can reach Gluetun
docker exec sonarr ping -c 3 gluetun

# Test Prometheus can reach all exporters
docker exec prometheus ping -c 3 node-exporter
docker exec prometheus ping -c 3 cadvisor
```

### Test 2: Service Discovery

```bash
# Check Traefik discovered all services
curl -s http://localhost:8090/api/http/services | jq '.[] | select(.name | contains("@docker")) | .name'
```

### Test 3: External Access

```bash
# Test Jellyfin via Traefik
curl -I http://jellyfin.local

# Test Jellyseerr via Traefik
curl -I http://jellyseerr.local

# Test Dashboard via Traefik
curl -I http://dashboard.local
```

### Test 4: Application Workflows

**Content Request Flow:**
1. Open Jellyseerr in browser
2. Request a TV show
3. Verify Sonarr receives the request
4. Check qBittorrent downloads via VPN

**Metrics Flow:**
1. Open Grafana
2. Verify dashboards load
3. Check Prometheus targets are up
4. Verify metrics are being collected

---

## Validation Checklist

- [ ] All networks created successfully
- [ ] All services restarted without errors
- [ ] All health checks passing
- [ ] Traefik routing to all services
- [ ] Service-to-service connectivity working
- [ ] External access functional
- [ ] Jellyfin streaming works
- [ ] Jellyseerr can communicate with Sonarr/Radarr
- [ ] Sonarr/Radarr can communicate with qBittorrent
- [ ] qBittorrent downloads via VPN
- [ ] Prometheus collecting metrics from all exporters
- [ ] Grafana dashboards display correctly
- [ ] Dozzle shows logs from all containers
- [ ] No errors in Docker logs
- [ ] Performance unchanged

---

## Troubleshooting

### Issue: Service can't reach another service

**Symptoms:**
```
Error: dial tcp: lookup <service> on 127.0.0.11:53: no such host
```

**Solution:**
```bash
# Verify both services are on a common network
docker inspect <service1> | jq '.[0].NetworkSettings.Networks | keys'
docker inspect <service2> | jq '.[0].NetworkSettings.Networks | keys'

# Add missing network to service
# Edit docker-compose.yml and add the network
docker-compose up -d <service>
```

### Issue: Internal network blocking external access

**Symptoms:**
Service needs internet but network is marked `internal: true`

**Solution:**
Services needing external access (like downloading data) should not be on internal networks. Verify network assignments:
- `frontend-net`, `backend-net`, `mgmt-net` = internal (no internet)
- `dmz-net`, `download-net`, `security-net` = external access allowed

### Issue: Traefik not discovering service

**Symptoms:**
Service not appearing in Traefik dashboard

**Solution:**
```bash
# Verify service is on a network Traefik can reach
docker inspect <service> | jq '.[0].NetworkSettings.Networks | keys'

# Ensure Traefik is on the same network
docker inspect traefik | jq '.[0].NetworkSettings.Networks | keys'

# Check Traefik labels are correct
docker inspect <service> | jq '.[0].Config.Labels'

# Restart Traefik
docker-compose restart traefik
```

### Issue: DNS resolution failing

**Symptoms:**
```
Error: Temporary failure in name resolution
```

**Solution:**
```bash
# Check Docker DNS is working
docker exec <service> cat /etc/resolv.conf

# Verify Docker daemon DNS settings
cat /etc/docker/daemon.json

# Restart Docker daemon if needed (CAUTION: will restart all containers)
# sudo systemctl restart docker
```

---

## Rollback Procedure

If critical issues arise:

### Quick Rollback

```bash
# Stop all services
docker-compose down

# Restore original configuration
cp backups/docker-compose.yml.iter0 docker-compose.yml
cp -r backups/*/docker-compose.yml */

# Remove new networks (optional)
docker network rm dmz-net frontend-net backend-net download-net mgmt-net security-net

# Restart services
docker-compose up -d

# Verify services are running
docker-compose ps
```

### Partial Rollback (Keep Networks, Revert Service Configs)

```bash
# Just restore service configurations
cp -r backups/*/docker-compose.yml */

# Restart affected services
docker-compose up -d
```

---

## Post-Migration Tasks

### Immediate
- [ ] Monitor service logs for 1 hour
  ```bash
  docker-compose logs -f --tail=100
  ```
- [ ] Check Grafana dashboards for anomalies
- [ ] Verify all user-facing services accessible
- [ ] Test end-to-end workflows (request → download → stream)

### Within 24 Hours
- [ ] Review Docker logs for any errors
- [ ] Check resource utilization (CPU, memory, network)
- [ ] Collect user feedback
- [ ] Document any issues encountered

### Within 1 Week
- [ ] Performance benchmarking
- [ ] Prepare for Iteration 2 (Port Consolidation)
- [ ] Update network architecture diagrams

---

## Success Criteria

✅ **Iteration 1 is successful if:**

1. All services running on both old and new networks
2. Zero service downtime
3. All connectivity tests pass
4. No performance degradation
5. All health checks passing
6. No errors in logs
7. Users can access all services
8. Monitoring dashboards functional

---

## Next Steps

Once Iteration 1 is validated:

1. **Monitor for 3-7 days** to ensure stability
2. **Collect metrics** on network performance
3. **Prepare for Iteration 2**: Port Consolidation
   - Plan which ports to remove
   - Update firewall rules
   - Notify users of URL changes

**Ready for next iteration?** → [Iteration 2: Port Consolidation](iteration-02-port-consolidation.md)

---

## Notes

- Services are now multi-homed (connected to both old and new networks)
- This provides a safety net during migration
- Old `media-network` will be removed in Iteration 2
- Internal networks prevent direct internet access (security improvement)
- Each service is now on networks appropriate to its function
