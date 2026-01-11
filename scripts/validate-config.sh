#!/bin/bash

set -e

cd "$(dirname "$0")/.."

echo "Validating configuration..."
echo ""

# Check docker-compose syntax
echo "Checking docker-compose syntax..."
if docker compose config --quiet 2>/dev/null; then
    echo "  docker-compose syntax OK"
else
    echo "  docker-compose validation FAILED"
    exit 1
fi

# Check for secrets
echo ""
echo "Checking secrets exist..."
required_secrets=(
    "secrets/cloudflare_token"
    "secrets/grafana_admin_password"
    "secrets/webui_admin_password"
    "secrets/wireguard_private_key"
)

secrets_ok=true
for secret in "${required_secrets[@]}"; do
    if [ -f "$secret" ]; then
        echo "  $secret OK"
    else
        echo "  Missing secret: $secret"
        secrets_ok=false
    fi
done

if [ "$secrets_ok" = false ]; then
    echo "  Some secrets are missing!"
    exit 1
fi

# Check file permissions
echo ""
echo "Checking file permissions..."
if [ -d "secrets" ]; then
    secrets_perms=$(stat -c %a secrets/)
    if [ "$secrets_perms" = "700" ]; then
        echo "  secrets/ directory permissions OK (700)"
    else
        echo "  Warning: secrets/ directory permissions are $secrets_perms (should be 700)"
    fi
fi

# Check resource limits
echo ""
echo "Checking resource limits in compose files..."
services_with_limits=$(docker compose config 2>/dev/null | grep -c "memory:" || true)
echo "  Services with memory limits: $services_with_limits"

# Check Traefik labels
echo ""
echo "Checking Traefik-enabled services..."
services_with_traefik=$(docker compose config 2>/dev/null | grep -c "traefik.enable=true" || true)
echo "  Services exposed via Traefik: $services_with_traefik"

# Check autoheal labels
echo ""
echo "Checking autoheal-enabled services..."
services_with_autoheal=$(docker compose config 2>/dev/null | grep -c "autoheal=true" || true)
echo "  Services monitored by autoheal: $services_with_autoheal"

# Check disk space
echo ""
echo "Checking disk space..."
available_space=$(df -BG . | tail -1 | awk '{print $4}' | tr -d 'G')
if [ "$available_space" -lt 50 ]; then
    echo "  Warning: Low disk space (${available_space}GB available)"
else
    echo "  Disk space OK (${available_space}GB available)"
fi

# Check backup destination
echo ""
echo "Checking backup destination..."
backup_dest="${BACKUP_DESTINATION:-/mnt/backups}"
if [ -d "$backup_dest" ]; then
    if [ -w "$backup_dest" ]; then
        echo "  Backup destination $backup_dest OK (writable)"
    else
        echo "  Warning: Backup destination $backup_dest exists but is not writable"
    fi
else
    echo "  Warning: Backup destination $backup_dest does not exist"
    echo "  Create it with: sudo mkdir -p $backup_dest && sudo chown \$USER:\$USER $backup_dest"
fi

echo ""
echo "Configuration validation complete!"
echo ""
