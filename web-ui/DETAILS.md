# Web UI Details

Modern Next.js-based web interface for the media stack that replaces both the private dashboard and public dashboard.

## Features
- Public landing page with Jellyfin and Jellyseerr links
- Admin dashboard with services organized by category
- Real-time health monitoring with response times
- Built with Next.js, React, TypeScript, and Tailwind CSS
- Dark mode support
- Responsive design for desktop and mobile

## Architecture

### Tech Stack
- Framework: Next.js 14 (App Router)
- Language: TypeScript
- Styling: Tailwind CSS
- HTTP client: undici (fetch)
- Container: Node.js 20 Alpine

### Routes
- `/` - Public landing page
- `/admin` - Admin login page
- `/admin/dashboard` - Protected admin dashboard
- `/api/health` - Health status for all services
- `/api/health/[id]` - Health status for a specific service
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

# Admin authentication (local development)
ADMIN_PASSWORD=your-secure-password-here
```

For Docker deployment, the admin password is read from `secrets/webui_admin_password` via `ADMIN_PASSWORD_FILE`.

### Service Categories
Services are organized into categories:
- Public: Jellyfin, Jellyseerr
- Media: Sonarr, Radarr, Prowlarr, Bazarr
- Download: qBittorrent
- Infrastructure: Traefik, Dozzle
- Monitoring: Grafana, Prometheus, cAdvisor

### Adding New Services
Edit `web-ui/src/lib/services.ts` to add new services:

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

## Docker Deployment

### Build and Run
```bash
# Build the image
docker build -t media-web-ui .

# Run with docker-compose
docker compose up -d
```

### Access
- Public site: https://<PUBLIC_DASHBOARD_DOMAIN> (via Cloudflared) or http://<PUBLIC_DASHBOARD_DOMAIN> on LAN
- Admin site: https://<TAILSCALE_HOST>:3001 (Authelia protected)

### Traefik Integration
The service exposes two Traefik routes:
1. Public route on the main domain (`PUBLIC_DASHBOARD_DOMAIN`) via entrypoint `web` (port 80)
2. Admin route on the Tailscale host (`TAILSCALE_HOST`) via entrypoint `web-ui` (port 3001)

## Security

### Authentication
Admin routes are protected with Authelia plus a Web UI password:
- Password is loaded from `secrets/webui_admin_password` via `ADMIN_PASSWORD_FILE`
- Session stored in an HTTP-only cookie
- Sessions expire after 24 hours

Important: Change the default password in production.

### Recommendations
1. Use a strong password in `secrets/webui_admin_password` (or `ADMIN_PASSWORD` for local dev)
2. Use HTTPS (Cloudflare or similar) for public access
3. Keep services accessible only via Traefik
4. Update dependencies regularly

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
3. Optional: archive old dashboard directories
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
3. Check network connectivity: `docker network inspect frontend-net`
4. Review logs: `docker logs media-web-ui`

### Cannot access admin dashboard
1. Verify `secrets/webui_admin_password` (or `ADMIN_PASSWORD` for local dev) is set correctly
2. Clear browser cookies and try again
3. Check container logs for errors

### Build fails
1. Ensure Node.js 20+ is installed
2. Delete `node_modules` and `.next`: `rm -rf node_modules .next`
3. Reinstall dependencies: `npm ci`
4. Try building again: `npm run build`

## Customization

### Styling
Tailwind configuration is in `web-ui/tailwind.config.ts`. Modify colors, fonts, and layout there:

```typescript
theme: {
  extend: {
    colors: {
      // custom colors
    },
    fontFamily: {
      // custom fonts
    },
  },
},
```
