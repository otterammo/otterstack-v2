# Media Stack Dashboard

A modern, responsive dashboard for monitoring your media stack services with real-time health checks and system information.

## Features

- **Real-time Service Monitoring**: Live health checks for all your media stack services
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile devices
- **Dark/Light Theme**: Toggle between themes with persistent preference storage
- **Service Categories**: Organized sections for Media, Downloads, Infrastructure, and Monitoring
- **Status Indicators**: Visual indicators showing service health at a glance
- **Quick Actions**: One-click access to common tasks and services
- **System Information**: Display server hostname, IP, and service counts
- **Auto-refresh**: Automatic status updates every 5 minutes
- **Health Check API**: REST API for programmatic service monitoring

## Services Monitored

### Media Services
- **Jellyfin** (Port 8096) - Media server
- **Jellyseerr** (Port 5055) - Media request management
- **Sonarr** (Port 8989) - TV series management
- **Radarr** (Port 7878) - Movie management

### Download & Indexing
- **Prowlarr** (Port 9696) - Indexer management
- **Bazarr** (Port 6767) - Subtitle management
- **qBittorrent** (Port 8080) - Torrent client

### Infrastructure
- **Traefik** (Port 8090) - Reverse proxy
- **Dashboard** (Port 3000) - This dashboard

### Monitoring
- **Grafana** (Port 3001) - Metrics visualization
- **Prometheus** (Port 9090) - Metrics collection
- **cAdvisor** (Port 8081) - Container monitoring

## API Endpoints

The dashboard includes a health check API accessible at:

- `GET /api/health` - Check all services
- `GET /api/health/:service` - Check specific service
- `GET /api/system` - Get system information

Example API response:
```json
{
  "success": true,
  "timestamp": "2025-10-10T12:00:00.000Z",
  "host": "192.168.86.111",
  "summary": {
    "total": 11,
    "online": 10,
    "offline": 1,
    "percentage": 91
  },
  "services": {
    "jellyfin": {
      "online": true,
      "name": "Jellyfin",
      "port": 8096,
      "lastChecked": "2025-10-10T12:00:00.000Z"
    }
  }
}
```

## Quick Start

1. **Build and start the dashboard:**
   ```bash
   cd /home/otterammo/media/dashboard
   docker-compose up -d --build
   ```

2. **Access the dashboard:**
   - Direct IP: http://192.168.86.111:3000
   - mDNS: http://dell-optiplex-3040.local:3000
   - Via Traefik: http://dashboard.local (if configured)

3. **Monitor services:**
   - Click the "🔄 Refresh Status" button to manually check all services
   - Services are automatically checked every 5 minutes
   - Status indicators show green (online), yellow (checking), or red (offline)

## Customization

### Adding New Services

1. **Update the health API** (`health-api.js`):
   ```javascript
   const services = {
     // ... existing services
     myservice: { port: 1234, name: 'My Service' }
   };
   ```

2. **Add to the dashboard HTML** (`dashboard.html`):
   ```html
   <a href="http://192.168.86.111:1234" class="service-card" data-service="myservice" data-port="1234">
     <div class="status-indicator checking"></div>
     <div class="service-icon">🔧</div>
     <div class="service-name">My Service</div>
     <div class="service-url">:1234</div>
   </a>
   ```

### Changing IP Address

Update the IP address in the following files:
- `dashboard.html` - Update all service URLs
- `health-api.js` - Update default host if needed

### Theming

The dashboard supports CSS custom properties for easy theming. Modify the `:root` and `[data-theme="dark"]` sections in the CSS to customize colors.

## Troubleshooting

### Services Show as Offline

1. **Check if services are actually running:**
   ```bash
   docker ps
   ```

2. **Check if ports are accessible:**
   ```bash
   netstat -tulpn | grep :8096  # Replace with your service port
   ```

3. **Check health API logs:**
   ```bash
   docker logs media-dashboard
   ```

### Dashboard Not Loading

1. **Check container status:**
   ```bash
   docker-compose ps
   ```

2. **View container logs:**
   ```bash
   docker-compose logs dashboard
   ```

3. **Rebuild if needed:**
   ```bash
   docker-compose down
   docker-compose up -d --build
   ```

## Architecture

The dashboard consists of two main components:

1. **Static Frontend**: HTML/CSS/JavaScript served by Nginx
2. **Health Check API**: Node.js Express server for service monitoring

Both run in the same container:
- Nginx serves the dashboard on port 80
- Node.js API runs on port 3002
- Nginx proxies `/api/*` requests to the Node.js server

## Contributing

Feel free to submit issues or pull requests to improve the dashboard. Common improvements might include:

- Additional service integrations
- More detailed system monitoring
- Enhanced mobile responsiveness
- Additional themes
- Notification systems