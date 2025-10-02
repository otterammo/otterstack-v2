#!/bin/bash

# Traefik Media Server Setup
# This script helps configure local DNS for easier access to your media services

# Get the current IP address
IP=$(hostname -I | awk '{print $1}')

echo "🎬 Media Server Traefik Setup"
echo "================================"
echo "Current server IP: $IP"
echo ""

# Create hosts entries
HOSTS_ENTRIES="
# Media Server Services
$IP jellyfin.local
$IP jellyseerr.local
$IP sonarr.local
$IP radarr.local
$IP prowlarr.local
$IP bazarr.local
$IP qbittorrent.local
$IP traefik.local
"

echo "📝 To access services from other devices, add these entries to their hosts file:"
echo "$HOSTS_ENTRIES"

echo ""
echo "📍 Hosts file locations:"
echo "  • Windows: C:\\Windows\\System32\\drivers\\etc\\hosts"
echo "  • macOS/Linux: /etc/hosts"
echo "  • Android: /system/etc/hosts (requires root)"
echo "  • iOS: Use a DNS app or configure router DNS"

echo ""
echo "🚀 Starting services..."

# Start the services
docker-compose up -d

echo ""
echo "✅ Setup complete! Your services will be available at:"
echo "  • Jellyfin: http://jellyfin.local"
echo "  • Jellyseerr: http://jellyseerr.local"
echo "  • Sonarr: http://sonarr.local"
echo "  • Radarr: http://radarr.local"
echo "  • Prowlarr: http://prowlarr.local"
echo "  • Bazarr: http://bazarr.local"
echo "  • qBittorrent: http://qbittorrent.local"
echo "  • Traefik Dashboard: http://traefik.local"
echo ""
echo "📊 Or use the dashboard: file://$(pwd)/dashboard.html"
echo ""
echo "💡 Alternative access using IP:PORT (if DNS not configured):"
echo "  • Jellyfin: http://$IP:8096"
echo "  • Jellyseerr: http://$IP:5055"
echo "  • Sonarr: http://$IP:8989"
echo "  • Radarr: http://$IP:7878"
echo "  • Prowlarr: http://$IP:9696"
echo "  • Bazarr: http://$IP:6767"
echo "  • qBittorrent: http://$IP:8080"
echo "  • Traefik Dashboard: http://$IP:8090"