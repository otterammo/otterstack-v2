# Monitoring

Observability stack for the media services using Prometheus, Grafana, and Loki.

See `DETAILS.md` for full configuration, alerts, and customization.

## Access
- Grafana: `https://<TAILSCALE_HOST>:3000` (user `admin`, password in `secrets/grafana_admin_password`)
- Prometheus: `https://<TAILSCALE_HOST>:9090`
- Alertmanager: `https://<TAILSCALE_HOST>:9093`
- cAdvisor: `https://<TAILSCALE_HOST>:8081`

## Configuration
- Components:
  - Prometheus (metrics + alerts)
  - Grafana (dashboards)
  - Loki + Promtail (logs)
  - cAdvisor + node-exporter (host/container metrics)
  - Alertmanager (alert routing)
  - Autoheal (restarts unhealthy containers)
- Prometheus:
  - Config: `monitoring/prometheus/config/prometheus.yml` (scrape interval 15s)
  - Retention: 200h (set in compose)
  - Data: `monitoring/prometheus/data`
- Grafana:
  - Config: `monitoring/grafana/config`
  - Dashboards: `monitoring/grafana/dashboards`
  - Data: `monitoring/grafana/data`
- Alertmanager:
  - Config: `monitoring/alertmanager/config/alertmanager.yml`
  - Data: `monitoring/alertmanager/data`
- Loki:
  - Config: `monitoring/loki-config.yml`
  - Data: `monitoring/loki/data`
- Promtail:
  - Config: `monitoring/promtail-config.yml`
  - Ships `/var/log`, Docker logs, and `traefik/logs`
- Alerts configured:
  - Service down
  - High CPU usage
  - High memory usage
  - Low disk space
  - Container down
  - High container resource usage
- Servarr API monitoring:
  - Add API keys to Prometheus config and restart Prometheus.

## Environment
- `PUID`, `PGID`, `TZ`
- `TAILSCALE_HOST`
- Grafana admin password secret: `secrets/grafana_admin_password`

## Start/stop
```bash
docker compose up -d
docker compose logs -f grafana
```

## Troubleshooting
- Status: `docker compose ps`
- Logs: `docker compose logs grafana` or `docker compose logs prometheus`
- Reset Grafana admin password:
  ```bash
  docker compose exec grafana grafana-cli admin reset-admin-password admin
  ```
- Prometheus targets not discovered:
  - Verify containers are on the same network
  - Check target names match Prometheus config
  - Ensure metrics endpoints are exposed

## Security
- Access is via Traefik entrypoints and Authelia.
- Monitoring endpoints are intended for Tailscale access only.
- Store Grafana password in `secrets/grafana_admin_password`.
