# Backup

Scheduled backups of service configuration and data using `offen/docker-volume-backup`.

## What gets backed up
- Jellyfin config
- Jellyseerr config
- Sonarr/Radarr/Prowlarr/Bazarr configs
- qBittorrent config
- Prometheus, Grafana, and Loki data
- Traefik config and logs
- Authelia config and data

## Schedule and retention
- `BACKUP_CRON` (default `0 2 * * *`)
- `BACKUP_RETENTION_DAYS` (default `30`)
- `BACKUP_DESTINATION` (default `/mnt/backups`)
- Archive name: `media-server-backup-%Y%m%d-%H%M%S.tar.gz`

## Requirements
- Backup destination exists and is writable on the host.
- Docker socket mounted read-only for container coordination.

## Start/stop
```bash
docker compose up -d
docker compose logs -f backup
```
