#!/bin/bash

# Exit on error, but handle permission issues gracefully
set -e

cd "$(dirname "$0")/.."

BACKUP_DIR="backups/manual-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "Creating backup in $BACKUP_DIR..."

# Backup docker-compose files
echo "  Backing up docker-compose files..."
cp docker-compose.yml "$BACKUP_DIR/"
cp networks.yml "$BACKUP_DIR/"
for dir in */; do
    if [ -f "${dir}docker-compose.yml" ]; then
        mkdir -p "$BACKUP_DIR/$dir"
        cp "${dir}docker-compose.yml" "$BACKUP_DIR/$dir"
    fi
done

# Backup environment
echo "  Backing up environment..."
if [ -f ".env" ]; then
    cp .env "$BACKUP_DIR/.env.backup"
fi

# Backup secrets (encrypted)
echo "  Backing up secrets..."
if [ -d "secrets" ]; then
    cp -r secrets/ "$BACKUP_DIR/secrets/"
fi

# Backup critical configs
echo "  Backing up Authelia config..."
if [ -d "authelia/config" ]; then
    cp -r authelia/config/ "$BACKUP_DIR/authelia-config/"
fi

echo "  Backing up Authelia data..."
if [ -d "authelia/data" ]; then
    # Use cp with --no-preserve=ownership to handle permission issues
    # Skip files we can't read (container-owned logs)
    mkdir -p "$BACKUP_DIR/authelia-data/"
    cp -r --no-preserve=ownership authelia/data/* "$BACKUP_DIR/authelia-data/" 2>/dev/null || \
        echo "    Warning: Some Authelia data files skipped (permission denied)"
fi

echo "  Backing up Traefik config..."
if [ -d "traefik/config" ]; then
    mkdir -p "$BACKUP_DIR/traefik-config/"
    cp -r --no-preserve=ownership traefik/config/* "$BACKUP_DIR/traefik-config/" 2>/dev/null || \
        echo "    Warning: Some Traefik config files skipped (permission denied)"
fi

echo "  Backing up monitoring config..."
if [ -d "monitoring/prometheus/config" ]; then
    cp -r monitoring/prometheus/config/ "$BACKUP_DIR/prometheus-config/"
fi
if [ -d "monitoring/alertmanager/config" ]; then
    cp -r monitoring/alertmanager/config/ "$BACKUP_DIR/alertmanager-config/"
fi

# Create archive
echo "  Creating archive..."
tar czf "$BACKUP_DIR.tar.gz" -C backups "$(basename "$BACKUP_DIR")"

# Cleanup uncompressed backup
rm -rf "$BACKUP_DIR"

echo "Backup created: $BACKUP_DIR.tar.gz"

# Cleanup old backups (keep last 10)
echo "  Cleaning old backups..."
backup_count=$(ls -1 backups/manual-*.tar.gz 2>/dev/null | wc -l)
if [ "$backup_count" -gt 10 ]; then
    ls -t backups/manual-*.tar.gz | tail -n +11 | xargs -r rm
    echo "  Removed $(( backup_count - 10 )) old backup(s)"
fi

echo ""
echo "Backup complete!"
