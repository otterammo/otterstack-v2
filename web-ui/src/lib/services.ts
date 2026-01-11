import { Service } from '@/types/service'

const serverIP = process.env.SERVER_IP || '127.0.0.1'
const tailscaleHost = process.env.TAILSCALE_HOST
const localAccessScheme = tailscaleHost ? 'https' : 'http'
const localAccessHost = tailscaleHost || serverIP
const localUrlForPort = (port: number) =>
  `${localAccessScheme}://${localAccessHost}:${port}`
const publicJellyfinDomain = process.env.PUBLIC_JELLYFIN_DOMAIN || 'jellyfin.otterammo.xyz'
const publicJellyseerrDomain = process.env.PUBLIC_JELLYSEERR_DOMAIN || 'jellyseerr.otterammo.xyz'

export const SERVICES: Service[] = [
  // Public Services
  {
    id: 'jellyfin',
    name: 'Jellyfin',
    description: 'Stream your media library',
    url: `http://jellyfin:8096`,
    displayUrl: `http://${serverIP}:8096`,
    localUrl: localUrlForPort(8096),
    publicUrl: `https://${publicJellyfinDomain}`,
    category: 'public',
    healthEndpoint: '/health',
  },
  {
    id: 'jellyseerr',
    name: 'Jellyseerr',
    description: 'Request movies and TV shows',
    url: `http://jellyseerr:5055`,
    displayUrl: `http://${serverIP}:5055`,
    localUrl: localUrlForPort(5055),
    publicUrl: `https://${publicJellyseerrDomain}`,
    category: 'public',
    healthEndpoint: '/api/v1/status/appdata',
  },
  
  // Media Management
  {
    id: 'sonarr',
    name: 'Sonarr',
    description: 'TV show management',
    url: `http://sonarr:8989`,
    displayUrl: `http://${serverIP}:8989`,
    localUrl: localUrlForPort(8989),
    category: 'media',
    healthEndpoint: '/ping',
  },
  {
    id: 'radarr',
    name: 'Radarr',
    description: 'Movie management',
    url: `http://radarr:7878`,
    displayUrl: `http://${serverIP}:7878`,
    localUrl: localUrlForPort(7878),
    category: 'media',
    healthEndpoint: '/ping',
  },
  {
    id: 'prowlarr',
    name: 'Prowlarr',
    description: 'Indexer management',
    url: `http://prowlarr:9696`,
    displayUrl: `http://${serverIP}:9696`,
    localUrl: localUrlForPort(9696),
    category: 'media',
    healthEndpoint: '/ping',
  },
  {
    id: 'bazarr',
    name: 'Bazarr',
    description: 'Subtitle management',
    url: `http://bazarr:6767`,
    displayUrl: `http://${serverIP}:6767`,
    localUrl: localUrlForPort(6767),
    category: 'media',
    healthEndpoint: '/ping',
  },
  
  // Download
  {
    id: 'qbittorrent',
    name: 'qBittorrent',
    description: 'Torrent client',
    url: `http://gluetun:8080`,
    displayUrl: `http://${serverIP}:8080`,
    localUrl: localUrlForPort(8080),
    category: 'download',
    healthEndpoint: '/',
  },
  
  // Infrastructure
  {
    id: 'traefik',
    name: 'Traefik',
    description: 'Reverse proxy',
    url: `http://traefik:80`,
    displayUrl: `http://${serverIP}:8085`,
    localUrl: localUrlForPort(8085),
    category: 'infrastructure',
    healthEndpoint: '/ping',
  },
  {
    id: 'dozzle',
    name: 'Dozzle',
    description: 'Container logs',
    url: `http://dozzle:8080`,
    displayUrl: `http://${serverIP}:9999`,
    localUrl: localUrlForPort(8082),
    category: 'infrastructure',
    healthEndpoint: '/healthcheck',
  },
  
  // Monitoring
  {
    id: 'grafana',
    name: 'Grafana',
    description: 'Metrics dashboard',
    url: `http://grafana:3000`,
    displayUrl: `http://${serverIP}:3001`,
    localUrl: localUrlForPort(3000),
    category: 'monitoring',
    healthEndpoint: '/api/health',
  },
  {
    id: 'prometheus',
    name: 'Prometheus',
    description: 'Metrics collection',
    url: `http://prometheus:9090`,
    displayUrl: `http://${serverIP}:9090`,
    localUrl: localUrlForPort(9090),
    category: 'monitoring',
    healthEndpoint: '/-/healthy',
  },
  {
    id: 'cadvisor',
    name: 'cAdvisor',
    description: 'Container metrics',
    url: `http://cadvisor:8080`,
    displayUrl: `http://${serverIP}:8081`,
    localUrl: localUrlForPort(8081),
    category: 'monitoring',
    healthEndpoint: '/healthz',
  },
  {
    id: 'alertmanager',
    name: 'Alertmanager',
    description: 'Alert routing and notifications',
    url: `http://alertmanager:9093`,
    displayUrl: `http://${serverIP}:9093`,
    localUrl: localUrlForPort(9093),
    category: 'monitoring',
    healthEndpoint: '/',
  },
]

export const PUBLIC_SERVICES = SERVICES.filter((s) => s.category === 'public')

const ADMIN_PUBLIC_SERVICE_OVERRIDES: Record<string, Pick<Service, 'category'>> = {
  jellyfin: { category: 'media' },
  jellyseerr: { category: 'media' },
}

const adminPublicServices = SERVICES
  .filter((service) => ADMIN_PUBLIC_SERVICE_OVERRIDES[service.id])
  .map((service) => ({
    ...service,
    ...ADMIN_PUBLIC_SERVICE_OVERRIDES[service.id],
  }))

export const ADMIN_SERVICES = [
  ...SERVICES.filter((s) => s.category !== 'public'),
  ...adminPublicServices,
]
