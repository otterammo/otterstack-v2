#!/bin/bash

set -e

cd "$(dirname "$0")/.."

if [ -z "$1" ]; then
    echo "Usage: $0 <backup-file>"
    echo ""
    echo "Available backups:"
    ls -lh backups/manual-*.tar.gz 2>/dev/null || echo "  No manual backups found"
    echo ""
    ls -lh /mnt/backups/*.tar.gz 2>/dev/null || echo "  No automated backups found in /mnt/backups"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "WARNING: This will restore configuration from backup!"
echo "Backup file: $BACKUP_FILE"
echo ""
echo "Current configuration will be backed up first."
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 0
fi

# Backup current state first
echo ""
echo "Creating backup of current state..."
./scripts/backup-all.sh

# Create temp directory for extraction
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Extract backup
echo ""
echo "Extracting backup..."
tar xzf "$BACKUP_FILE" -C "$TEMP_DIR"

# Find the extracted directory
BACKUP_NAME=$(ls "$TEMP_DIR")

echo "Restoring from: $BACKUP_NAME"

# Restore docker-compose files
if [ -f "$TEMP_DIR/$BACKUP_NAME/docker-compose.yml" ]; then
    echo "  Restoring docker-compose.yml..."
    cp "$TEMP_DIR/$BACKUP_NAME/docker-compose.yml" .
fi

if [ -f "$TEMP_DIR/$BACKUP_NAME/networks.yml" ]; then
    echo "  Restoring networks.yml..."
    cp "$TEMP_DIR/$BACKUP_NAME/networks.yml" .
fi

# Restore service compose files
for dir in "$TEMP_DIR/$BACKUP_NAME"/*/; do
    service_name=$(basename "$dir")
    if [ -f "${dir}docker-compose.yml" ]; then
        echo "  Restoring $service_name/docker-compose.yml..."
        mkdir -p "$service_name"
        cp "${dir}docker-compose.yml" "$service_name/"
    fi
done

# Restore environment
if [ -f "$TEMP_DIR/$BACKUP_NAME/.env.backup" ]; then
    echo "  Restoring .env..."
    cp "$TEMP_DIR/$BACKUP_NAME/.env.backup" .env
fi

# Restore secrets
if [ -d "$TEMP_DIR/$BACKUP_NAME/secrets" ]; then
    echo "  Restoring secrets..."
    cp -r "$TEMP_DIR/$BACKUP_NAME/secrets/"* secrets/
    chmod 700 secrets
    chmod 600 secrets/*
fi

# Restore configs
if [ -d "$TEMP_DIR/$BACKUP_NAME/authelia-config" ]; then
    echo "  Restoring Authelia config..."
    cp -r "$TEMP_DIR/$BACKUP_NAME/authelia-config/"* authelia/config/
fi

if [ -d "$TEMP_DIR/$BACKUP_NAME/traefik-config" ]; then
    echo "  Restoring Traefik config..."
    cp -r "$TEMP_DIR/$BACKUP_NAME/traefik-config/"* traefik/config/
fi

echo ""
echo "Restore complete!"
echo ""
echo "To apply changes, restart the stack:"
echo "  docker compose down"
echo "  docker compose up -d"
