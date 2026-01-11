# Media Stack Monitoring

This monitoring setup provides observability for the media stack using Prometheus for metrics collection and Grafana for visualization.

## Services Included

- **Prometheus** - Metrics collection and alerting
- **Grafana** - Dashboards and visualization
- **cAdvisor** - Container metrics
- **Node Exporter** - System metrics
- **Loki** - Log storage
- **Promtail** - Log shipping

## Quick Start

1. **Start the monitoring stack:**
   ```bash
   ./media-stack.sh start
   ```

2. **Access Grafana:**
   - URL: https://<TAILSCALE_HOST>:3000
   - Credentials: `admin` and the password stored in `secrets/grafana_admin_password`

3. **Access Prometheus:**
   - URL: https://<TAILSCALE_HOST>:9090

4. **Access Alertmanager:**
   - URL: https://<TAILSCALE_HOST>:9093

## Configuration

### Grafana
- Data source: Automatically configured to use Prometheus
- Default dashboard: Media Stack Overview
- Data directory: `./grafana/data`
- Config directory: `./grafana/config`

### Prometheus
- Scrape interval: 15 seconds
- Retention: 200 hours
- Config file: `./prometheus/config/prometheus.yml`
- Data directory: `./prometheus/data`

### Monitored Services
- System metrics (CPU, Memory, Disk, Network)
- Container metrics (Resource usage, Health status)
- Service availability (Up/Down status)
- Media stack specific metrics

## Alerts

The following alerts are configured:
- Service Down (5 minutes)
- High CPU Usage (>80% for 10 minutes)
- High Memory Usage (>90% for 10 minutes)
- Low Disk Space (<10%)
- Container Down (5 minutes)
- High Container Resource Usage

## Mobile Access

Monitoring services are exposed on Traefik entrypoints and are intended for access over Tailscale. Cloudflared is not configured to expose monitoring endpoints by default.

## Customization

### Adding New Metrics Sources
Edit `./prometheus/config/prometheus.yml` to add new scrape targets:

```yaml
scrape_configs:
  - job_name: 'your-service'
    static_configs:
      - targets: ['your-service:port']
```

### Creating Custom Dashboards
1. Access Grafana web interface
2. Create new dashboard
3. Add panels with Prometheus queries
4. Save and export JSON to `./grafana/dashboards/`

### API Keys for Servarr Apps
To enable API monitoring for Sonarr, Radarr, Prowlarr, and Bazarr:

1. Get API keys from each service's settings
2. Update the Prometheus configuration with your API keys
3. Restart Prometheus: `docker compose restart prometheus`

## Troubleshooting

### Check service status:
```bash
docker compose ps
```

### View logs:
```bash
docker compose logs grafana
docker compose logs prometheus
```

### Reset Grafana admin password:
```bash
docker compose exec grafana grafana-cli admin reset-admin-password admin
```

### Prometheus targets not discovered:
1. Verify containers are in the same network
2. Check container names match Prometheus config
3. Ensure services expose metrics endpoints

## Security

- Grafana, Prometheus, and Alertmanager are protected by Authelia on Traefik entrypoints
- Store the Grafana admin password in `secrets/grafana_admin_password`
- Review firewall rules for external access
- Use strong passwords for tunnel access

## Performance Notes

- Prometheus data retention is set to 200 hours
- Scrape intervals are optimized for performance vs. granularity
- cAdvisor metrics are filtered to reduce overhead
- Grafana uses efficient query patterns for dashboards
