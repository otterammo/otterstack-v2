# Web UI

Modern Next.js-based web interface for the Media Stack that replaces both the private dashboard and public dashboard.

## Features

- **Public Landing Page**: User-facing interface for accessing Jellyfin and Jellyseerr
- **Admin Dashboard**: Protected admin panel with all services organized by category
- **Real-time Health Monitoring**: Live service status checks with response times
- **Modern UI**: Built with Next.js, React, TypeScript, and Tailwind CSS
- **Dark Mode Support**: Automatic dark/light theme detection
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## Architecture

### Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **HTTP Client**: undici (fetch)
- **Container**: Node.js 20 Alpine

### Routes
- `/` - Public landing page with user-facing services
- `/admin` - Admin login page
- `/admin/dashboard` - Protected admin dashboard with all services
- `/api/health` - Get health status of all services
- `/api/health/[id]` - Get health status of specific service
- `/api/auth/login` - Admin authentication
- `/api/auth/logout` - Admin logout

## Configuration

### Environment Variables

```bash
# Timezone
TZ=UTC

# Public domain
PUBLIC_DASHBOARD_DOMAIN=otterammo.xyz

# Local access (used for admin links)
TAILSCALE_HOST=optiplex-7040.husky-escalator.ts.net
SERVER_IP=192.168.86.111

# Admin authentication
ADMIN_PASSWORD=your-secure-password-here
```

### Service Categories

Services are organized into categories:
- **Public**: Jellyfin, Jellyseerr (shown on landing page)
- **Media**: Sonarr, Radarr, Prowlarr, Bazarr
- **Download**: qBittorrent
- **Infrastructure**: Traefik, Dozzle
- **Monitoring**: Grafana, Prometheus, cAdvisor

## Development

### Prerequisites
- Node.js 20+
- npm or yarn

### Setup

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

The app will be available at http://localhost:3000

### Adding New Services

Edit `/src/lib/services.ts` to add new services:

```typescript
{
  id: 'service-id',
  name: 'Service Name',
  description: 'Service description',
  url: `http://service${baseDomain}`,
  category: 'media', // or 'download', 'infrastructure', 'monitoring', 'public'
  healthEndpoint: '/health', // optional
}
```

## Docker Deployment

### Build and Run

```bash
# Build the image
docker build -t media-web-ui .

# Run with docker-compose
docker compose up -d
```

### Access

- **Public Site**: https://otterammo.xyz (or your configured domain)
- **Admin Site**: https://<TAILSCALE_HOST>:3001 (or http://<SERVER_IP>:3001)

### Traefik Integration

The service exposes two Traefik routes:
1. Public route on the main domain (`PUBLIC_DASHBOARD_DOMAIN`)
2. Admin route on the Tailscale host (`TAILSCALE_HOST`) via the `web-ui` entrypoint

## Security

### Authentication

Admin routes are protected with simple password authentication:
- Password is set via `ADMIN_PASSWORD` environment variable
- Session stored in HTTP-only cookie
- Sessions expire after 24 hours

**Important**: Change the default password in production!

### Recommendations

1. **Use Strong Password**: Set a strong `ADMIN_PASSWORD`
2. **HTTPS**: Use Cloudflare or similar for TLS termination
3. **Network Isolation**: Services should only be accessible via Traefik
4. **Regular Updates**: Keep dependencies up to date

## Migration from Old Dashboards

### Removing Old Dashboards

1. Remove from root `docker-compose.yml`:
   ```yaml
   # Remove these lines:
   - dashboard/docker-compose.yml
   - public-dashboard/docker-compose.yml
   ```

2. Stop and remove old containers:
   ```bash
   docker stop media-dashboard public-media-dashboard
   docker rm media-dashboard public-media-dashboard
   ```

3. Optional: Archive old dashboard directories
   ```bash
   mkdir -p archive
   mv dashboard archive/dashboard-old
   mv public-dashboard archive/public-dashboard-old
   ```

### Service URLs

All service URLs remain the same. The new web-ui accesses services via Traefik just like the old dashboards.

## Troubleshooting

### Services show as offline

1. Check service is running: `docker ps`
2. Verify service health endpoint is correct
3. Check network connectivity: `docker network inspect media-network`
4. Review logs: `docker logs media-web-ui`

### Can't access admin dashboard

1. Verify `ADMIN_PASSWORD` is set correctly
2. Clear browser cookies and try again
3. Check container logs for errors

### Build fails

1. Ensure Node.js 20+ is installed
2. Delete `node_modules` and `.next`: `rm -rf node_modules .next`
3. Reinstall dependencies: `npm ci`
4. Try building again: `npm run build`

## Customization

### Styling

Tailwind configuration is in `tailwind.config.ts`. Modify colors, fonts, etc.:

```typescript
theme: {
  extend: {
    colors: {
      primary: {
        500: '#your-color',
      },
    },
  },
}
```

### Adding Features

The codebase is organized for easy extension:
- `/src/app` - Pages and API routes
- `/src/components` - React components
- `/src/lib` - Utilities and configuration
- `/src/types` - TypeScript types
