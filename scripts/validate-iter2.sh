#!/bin/bash
#
# Iteration 2: Port Consolidation Validation Script
# Tests that all services are accessible via Traefik and direct ports are blocked
#

# Note: Not using set -e because arithmetic expressions can return non-zero

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS=0
FAIL=0
WARN=0

# Get server IP from environment or default
SERVER_IP="${SERVER_IP:-192.168.86.111}"

print_header() {
    echo ""
    echo "=============================================="
    echo "$1"
    echo "=============================================="
}

check_traefik_access() {
    local service=$1
    local hostname=$2
    local expected_code=${3:-200}

    # Use Host header to test via Traefik (avoids DNS dependency)
    response=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 -H "Host: $hostname" http://127.0.0.1:80 2>/dev/null || echo "000")

    if [[ "$response" == "$expected_code" ]] || [[ "$response" == "302" ]] || [[ "$response" == "301" ]] || [[ "$response" == "307" ]]; then
        echo -e "${GREEN}[PASS]${NC} $service accessible via Traefik (http://$hostname) - HTTP $response"
        ((PASS++))
        return 0
    else
        echo -e "${RED}[FAIL]${NC} $service NOT accessible via Traefik (http://$hostname) - HTTP $response (expected $expected_code)"
        ((FAIL++))
        return 1
    fi
}

check_port_blocked() {
    local service=$1
    local port=$2

    # Try to connect to the port - should fail
    if timeout 2 bash -c "echo > /dev/tcp/localhost/$port" 2>/dev/null; then
        echo -e "${RED}[FAIL]${NC} Port $port ($service) is STILL OPEN - should be blocked"
        ((FAIL++))
        return 1
    else
        echo -e "${GREEN}[PASS]${NC} Port $port ($service) is blocked as expected"
        ((PASS++))
        return 0
    fi
}

check_port_open() {
    local service=$1
    local port=$2

    if timeout 2 bash -c "echo > /dev/tcp/localhost/$port" 2>/dev/null; then
        echo -e "${GREEN}[PASS]${NC} Port $port ($service) is open as expected"
        ((PASS++))
        return 0
    else
        echo -e "${RED}[FAIL]${NC} Port $port ($service) should be open but is blocked"
        ((FAIL++))
        return 1
    fi
}

check_container_health() {
    local container=$1

    health=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "none")
    status=$(docker inspect --format='{{.State.Status}}' "$container" 2>/dev/null || echo "unknown")

    if [[ "$status" != "running" ]]; then
        echo -e "${RED}[FAIL]${NC} $container is not running (status: $status)"
        ((FAIL++))
        return 1
    elif [[ "$health" == "healthy" ]] || [[ "$health" == "none" ]]; then
        echo -e "${GREEN}[PASS]${NC} $container is running (health: $health)"
        ((PASS++))
        return 0
    else
        echo -e "${YELLOW}[WARN]${NC} $container is running but health: $health"
        ((WARN++))
        return 0
    fi
}

check_cloudflare_tunnel() {
    local url=$1
    local service=$2

    response=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 "$url" 2>/dev/null || echo "000")

    if [[ "$response" == "200" ]] || [[ "$response" == "302" ]] || [[ "$response" == "301" ]] || [[ "$response" == "307" ]]; then
        echo -e "${GREEN}[PASS]${NC} $service accessible via Cloudflare Tunnel ($url) - HTTP $response"
        ((PASS++))
        return 0
    else
        echo -e "${RED}[FAIL]${NC} $service NOT accessible via Cloudflare Tunnel ($url) - HTTP $response"
        ((FAIL++))
        return 1
    fi
}

# =============================================================================
# MAIN VALIDATION
# =============================================================================

print_header "ITERATION 2: PORT CONSOLIDATION VALIDATION"
echo "Server IP: $SERVER_IP"
echo "Timestamp: $(date)"

# -----------------------------------------------------------------------------
print_header "1. SERVICE ACCESS VIA TRAEFIK (Local)"
# -----------------------------------------------------------------------------

check_traefik_access "Traefik Dashboard" "traefik.lan"
check_traefik_access "Jellyfin" "jellyfin.lan"
check_traefik_access "Jellyseerr" "jellyseerr.lan"
check_traefik_access "Sonarr" "sonarr.lan"
check_traefik_access "Radarr" "radarr.lan"
check_traefik_access "Prowlarr" "prowlarr.lan"
check_traefik_access "Bazarr" "bazarr.lan"
check_traefik_access "qBittorrent" "qbittorrent.lan"
check_traefik_access "Prometheus" "prometheus.lan"
check_traefik_access "Grafana" "grafana.lan"
check_traefik_access "cAdvisor" "cadvisor.lan"
check_traefik_access "Alertmanager" "alertmanager.lan"
check_traefik_access "Dozzle" "dozzle.lan"
check_traefik_access "Dashboard" "dashboard.lan"

# -----------------------------------------------------------------------------
print_header "2. PUBLIC ACCESS VIA CLOUDFLARE TUNNEL (Critical)"
# -----------------------------------------------------------------------------

check_cloudflare_tunnel "https://jellyfin.otterammo.xyz" "Jellyfin (Public)"
check_cloudflare_tunnel "https://jellyseerr.otterammo.xyz" "Jellyseerr (Public)"

# -----------------------------------------------------------------------------
print_header "3. DIRECT PORT ACCESS (Should be BLOCKED)"
# -----------------------------------------------------------------------------

check_port_blocked "Traefik Dashboard" 8090
check_port_blocked "Jellyfin HTTP" 8096
check_port_blocked "Jellyfin HTTPS" 8920
check_port_blocked "Jellyseerr" 5055
check_port_blocked "Sonarr" 8989
check_port_blocked "Radarr" 7878
check_port_blocked "Prowlarr" 9696
check_port_blocked "Bazarr" 6767
check_port_blocked "qBittorrent WebUI" 8080
check_port_blocked "Prometheus" 9090
check_port_blocked "Grafana" 3001
check_port_blocked "cAdvisor" 8081
check_port_blocked "Node Exporter" 9100
check_port_blocked "Alertmanager" 9093
check_port_blocked "Dozzle" 9999
check_port_blocked "Web UI" 3000

# -----------------------------------------------------------------------------
print_header "4. REQUIRED PORTS (Should be OPEN)"
# -----------------------------------------------------------------------------

check_port_open "Traefik HTTP" 80
check_port_open "Traefik HTTPS" 443
check_port_open "BitTorrent" 6881

# -----------------------------------------------------------------------------
print_header "5. CONTAINER HEALTH STATUS"
# -----------------------------------------------------------------------------

containers=(
    "traefik"
    "jellyfin"
    "jellyseerr"
    "sonarr"
    "radarr"
    "prowlarr"
    "bazarr"
    "gluetun"
    "qbittorrent"
    "prometheus"
    "grafana"
    "cadvisor"
    "node-exporter"
    "alertmanager"
    "dozzle"
    "media-web-ui"
    "cloudflared"
)

for container in "${containers[@]}"; do
    check_container_health "$container"
done

# -----------------------------------------------------------------------------
print_header "SUMMARY"
# -----------------------------------------------------------------------------

echo ""
echo -e "${GREEN}Passed:${NC} $PASS"
echo -e "${RED}Failed:${NC} $FAIL"
echo -e "${YELLOW}Warnings:${NC} $WARN"
echo ""

if [[ $FAIL -eq 0 ]]; then
    echo -e "${GREEN}=============================================="
    echo "ITERATION 2 VALIDATION: SUCCESS"
    echo "==============================================${NC}"
    exit 0
else
    echo -e "${RED}=============================================="
    echo "ITERATION 2 VALIDATION: FAILED"
    echo "Please review the failures above."
    echo "==============================================${NC}"
    exit 1
fi
