# Monitoring Details

This monitoring setup provides observability for the media stack using Prometheus for metrics, Grafana for visualization, and Loki for logs.

## Services Included
- Prometheus - Metrics collection and alerting
- Grafana - Dashboards and visualization
- cAdvisor - Container metrics
- Node Exporter - System metrics
- Loki - Log storage
- Promtail - Log shipping
- Alertmanager - Alert routing
- Autoheal - Restarts unhealthy containers

## Quick Start

1. Start the monitoring stack:
   ```bash
   ./media-stack.sh start
   ```

2. Access Grafana:
   - URL: https://<TAILSCALE_HOST>:3000
   - Credentials: `admin` and the password stored in `secrets/grafana_admin_password`

3. Access Prometheus:
   - URL: https://<TAILSCALE_HOST>:9090

4. Access Alertmanager:
   - URL: https://<TAILSCALE_HOST>:9093

## Configuration

### Grafana
- Data source: Automatically configured to use Prometheus
- Default dashboard: Media Stack Overview
- Data directory: `monitoring/grafana/data`
- Config directory: `monitoring/grafana/config`

### Prometheus
- Scrape interval: 15 seconds
- Retention: 200 hours
- Config file: `monitoring/prometheus/config/prometheus.yml`
- Data directory: `monitoring/prometheus/data`

### Monitored Services
- System metrics (CPU, memory, disk, network)
- Container metrics (resource usage, health status)
- Service availability (up/down status)
- Media stack specific metrics

## Alerts
The following alerts are configured:
- Service down (5 minutes)
- High CPU usage (>80% for 10 minutes)
- High memory usage (>90% for 10 minutes)
- Low disk space (<10%)
- Container down (5 minutes)
- High container resource usage

## Mobile Access
Monitoring services are exposed on Traefik entrypoints and are intended for access over Tailscale. Cloudflared is not configured to expose monitoring endpoints by default.

## Customization

### Adding New Metrics Sources
Edit `monitoring/prometheus/config/prometheus.yml` to add new scrape targets:

```yaml
scrape_configs:
  - job_name: 'your-service'
    static_configs:
      - targets: ['your-service:port']
```

### Creating Custom Dashboards
1. Access Grafana web interface
2. Create a new dashboard
3. Add panels with Prometheus queries
4. Save and export JSON to `monitoring/grafana/dashboards`

### API Keys for Servarr Apps
To enable API monitoring for Sonarr, Radarr, Prowlarr, and Bazarr:

1. Get API keys from each service's settings
2. Update the Prometheus configuration with your API keys
3. Restart Prometheus:
   ```bash
   docker compose restart prometheus
   ```

## Troubleshooting

### Check service status
```bash
docker compose ps
```

### View logs
```bash
docker compose logs grafana
docker compose logs prometheus
```

### Reset Grafana admin password
```bash
docker compose exec grafana grafana-cli admin reset-admin-password admin
```

### Prometheus targets not discovered
1. Verify containers are in the same network
2. Check container names match Prometheus config
3. Ensure services expose metrics endpoints

## Security
- Grafana, Prometheus, and Alertmanager are protected by Authelia on Traefik entrypoints.
- Store the Grafana admin password in `secrets/grafana_admin_password`.
- Review firewall rules for external access.
- Use strong passwords for tunnel access.

## Performance Notes
- Prometheus data retention is set to 200 hours.
- Scrape intervals are optimized for performance vs. granularity.
- cAdvisor metrics are filtered to reduce overhead.
- Grafana uses efficient query patterns for dashboards.
