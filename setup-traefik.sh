#!/bin/bash

# Traefik Media Server Setup
# This script helps configure local DNS for easier access to your media services

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Get the current IP address
IP=$(hostname -I | awk '{print $1}')

echo -e "${PURPLE}Media Server Traefik Setup${NC}"
echo "================================"
echo -e "Current server IP: ${CYAN}$IP${NC}"
echo ""

# Function to extract domains from Traefik labels
get_service_domains() {
    # Check if docker is available and any containers are running
    if ! command -v docker &> /dev/null; then
        return
    fi
    
    # Get all containers with traefik.enable=true and extract their domains
    local domains=$(docker ps --format "table {{.Names}}" 2>/dev/null | tail -n +2 | while read container; do
        if [ ! -z "$container" ]; then
            # Get the Traefik router rule for this container
            local host_rule=$(docker inspect "$container" 2>/dev/null | jq -r '.[0].Config.Labels["traefik.http.routers.'$container'.rule"] // empty' 2>/dev/null)
            
            # Alternative: try to find any router rule for this container
            if [ -z "$host_rule" ] || [ "$host_rule" == "null" ]; then
                # Try to find any router rule for this container
                host_rule=$(docker inspect "$container" 2>/dev/null | jq -r '.[0].Config.Labels | to_entries[] | select(.key | startswith("traefik.http.routers.") and endswith(".rule")) | .value' 2>/dev/null | head -n1)
            fi
            
            # Extract domain from Host() rule
            if [ ! -z "$host_rule" ] && [ "$host_rule" != "null" ]; then
                local domain=$(echo "$host_rule" | grep -oP 'Host\(`\K[^`]+' 2>/dev/null)
                if [ ! -z "$domain" ]; then
                    echo "$domain"
                fi
            fi
        fi
    done | sort -u)
    
    echo "$domains"
}

echo -e "${BLUE}[INFO]${NC} Discovering services with Traefik routing..."

# Get dynamic service domains
SERVICE_DOMAINS=$(get_service_domains)

# Create hosts entries dynamically
HOSTS_ENTRIES="
# Media Server Services (Auto-discovered)"

if [ ! -z "$SERVICE_DOMAINS" ]; then
    while read -r domain; do
        if [ ! -z "$domain" ]; then
            HOSTS_ENTRIES="$HOSTS_ENTRIES
$IP $domain"
        fi
    done <<< "$SERVICE_DOMAINS"
else
    echo -e "${YELLOW}[WARNING]${NC} No running services found. Using fallback domains..."
    # Fallback to static list if discovery fails
    HOSTS_ENTRIES="$HOSTS_ENTRIES
$IP bazarr.local
$IP dashboard.local
$IP jellyfin.local
$IP jellyseerr.local
$IP prowlarr.local
$IP qbittorrent.local
$IP radarr.local
$IP sonarr.local
$IP traefik.local"
fi

echo -e "${GREEN}[HOSTS]${NC} To access services from other devices, add these entries to their hosts file:"
echo "$HOSTS_ENTRIES"

echo ""
echo -e "${CYAN}[LOCATIONS]${NC} Hosts file locations:"
echo -e "  ${WHITE}•${NC} Windows: C:\\Windows\\System32\\drivers\\etc\\hosts"
echo -e "  ${WHITE}•${NC} macOS/Linux: /etc/hosts"
echo -e "  ${WHITE}•${NC} Android: /system/etc/hosts (requires root)"
echo -e "  ${WHITE}•${NC} iOS: Use a DNS app or configure router DNS"

echo ""
echo -e "${BLUE}[STARTING]${NC} Starting services..."

# Start the services
docker compose up -d

echo ""
echo -e "${GREEN}[SUCCESS]${NC} Setup complete! Your services will be available at:"

# Display discovered services dynamically
if [ ! -z "$SERVICE_DOMAINS" ]; then
    while read -r domain; do
        if [ ! -z "$domain" ]; then
            # Capitalize first letter for display
            service_name=$(echo "$domain" | sed 's/\.local//' | sed 's/^./\U&/')
            echo -e "  ${WHITE}•${NC} $service_name: ${CYAN}http://$domain${NC}"
        fi
    done <<< "$SERVICE_DOMAINS"
else
    # Fallback display
    echo -e "  ${WHITE}•${NC} Jellyfin: ${CYAN}http://jellyfin.local${NC}"
    echo -e "  ${WHITE}•${NC} Jellyseerr: ${CYAN}http://jellyseerr.local${NC}"
    echo -e "  ${WHITE}•${NC} Sonarr: ${CYAN}http://sonarr.local${NC}"
    echo -e "  ${WHITE}•${NC} Radarr: ${CYAN}http://radarr.local${NC}"
    echo -e "  ${WHITE}•${NC} Prowlarr: ${CYAN}http://prowlarr.local${NC}"
    echo -e "  ${WHITE}•${NC} Bazarr: ${CYAN}http://bazarr.local${NC}"
    echo -e "  ${WHITE}•${NC} qBittorrent: ${CYAN}http://qbittorrent.local${NC}"
    echo -e "  ${WHITE}•${NC} Traefik Dashboard: ${CYAN}http://traefik.local${NC}"
fi
echo ""
echo -e "${PURPLE}[DASHBOARD]${NC} Or use the dashboard: ${CYAN}file://$(pwd)/dashboard/dashboard.html${NC}"
echo ""

# Function to get service ports dynamically
get_service_ports() {
    echo -e "${YELLOW}[ALTERNATIVE]${NC} Alternative access using IP:PORT (if DNS not configured):"
    
    # Define known service ports for better mapping
    declare -A service_ports=(
        ["jellyfin"]="8096"
        ["jellyseerr"]="5055"
        ["sonarr"]="8989"
        ["radarr"]="7878"
        ["prowlarr"]="9696"
        ["bazarr"]="6767"
        ["qbittorrent"]="8080"
        ["traefik"]="8090"
        ["media-dashboard"]="3000"
    )
    
    # Check if docker is available
    if ! command -v docker &> /dev/null; then
        echo -e "  ${RED}[ERROR]${NC} Docker not available - using default ports"
        for service in "${!service_ports[@]}"; do
            service_name=$(echo "$service" | sed 's/^./\U&/' | sed 's/-/ /')
            echo -e "  ${WHITE}•${NC} $service_name: ${CYAN}http://$IP:${service_ports[$service]}${NC}"
        done | sort
        return
    fi
    
    # Get running containers
    local running_containers=$(docker ps --format "{{.Names}}" 2>/dev/null | grep -v cloudflared)
    
    if [ -z "$running_containers" ]; then
        echo -e "  ${YELLOW}[INFO]${NC} No containers running - showing default ports:"
        for service in "${!service_ports[@]}"; do
            service_name=$(echo "$service" | sed 's/^./\U&/' | sed 's/-/ /')
            echo -e "  ${WHITE}•${NC} $service_name: ${CYAN}http://$IP:${service_ports[$service]}${NC}"
        done | sort
    else
        # Show ports for running containers
        echo "$running_containers" | while read container; do
            if [ ! -z "$container" ]; then
                # Use known port if available
                if [ ! -z "${service_ports[$container]}" ]; then
                    port="${service_ports[$container]}"
                else
                    # Fallback: extract the first HTTP port (skip UDP ports and secondary ports)
                    ports=$(docker ps --filter "name=$container" --format "{{.Ports}}" 2>/dev/null)
                    port=$(echo "$ports" | grep -oP '0\.0\.0\.0:\K\d+(?=->)' | head -n1)
                fi
                
                if [ ! -z "$port" ]; then
                    # Capitalize first letter for display
                    service_name=$(echo "$container" | sed 's/^./\U&/' | sed 's/-/ /')
                    echo -e "  ${WHITE}•${NC} $service_name: ${CYAN}http://$IP:$port${NC}"
                fi
            fi
        done | sort
    fi
}

get_service_ports