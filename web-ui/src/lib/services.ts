import { Service } from '@/types/service'

const serverIP = process.env.SERVER_IP || '127.0.0.1'

export const SERVICES: Service[] = [
  // Public Services
  {
    id: 'jellyfin',
    name: 'Jellyfin',
    description: 'Stream your media library',
    url: `http://jellyfin:8096`,
    displayUrl: `http://${serverIP}:8096`,
    category: 'public',
    healthEndpoint: '/health',
  },
  {
    id: 'jellyseerr',
    name: 'Jellyseerr',
    description: 'Request movies and TV shows',
    url: `http://jellyseerr:5055`,
    displayUrl: `http://${serverIP}:5055`,
    category: 'public',
    healthEndpoint: '/api/v1/status',
  },
  
  // Media Management
  {
    id: 'sonarr',
    name: 'Sonarr',
    description: 'TV show management',
    url: `http://sonarr:8989`,
    displayUrl: `http://${serverIP}:8989`,
    category: 'media',
    healthEndpoint: '/ping',
  },
  {
    id: 'radarr',
    name: 'Radarr',
    description: 'Movie management',
    url: `http://radarr:7878`,
    displayUrl: `http://${serverIP}:7878`,
    category: 'media',
    healthEndpoint: '/ping',
  },
  {
    id: 'prowlarr',
    name: 'Prowlarr',
    description: 'Indexer management',
    url: `http://prowlarr:9696`,
    displayUrl: `http://${serverIP}:9696`,
    category: 'media',
    healthEndpoint: '/ping',
  },
  {
    id: 'bazarr',
    name: 'Bazarr',
    description: 'Subtitle management',
    url: `http://bazarr:6767`,
    displayUrl: `http://${serverIP}:6767`,
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
    category: 'download',
    healthEndpoint: '/',
  },
  
  // Infrastructure
  {
    id: 'traefik',
    name: 'Traefik',
    description: 'Reverse proxy',
    url: `http://traefik:8080`,
    displayUrl: `http://${serverIP}:8090`,
    category: 'infrastructure',
    healthEndpoint: '/ping',
  },
  {
    id: 'dozzle',
    name: 'Dozzle',
    description: 'Container logs',
    url: `http://dozzle:8080`,
    displayUrl: `http://${serverIP}:9999`,
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
    category: 'monitoring',
    healthEndpoint: '/api/health',
  },
  {
    id: 'prometheus',
    name: 'Prometheus',
    description: 'Metrics collection',
    url: `http://prometheus:9090`,
    displayUrl: `http://${serverIP}:9090`,
    category: 'monitoring',
    healthEndpoint: '/-/healthy',
  },
  {
    id: 'cadvisor',
    name: 'cAdvisor',
    description: 'Container metrics',
    url: `http://cadvisor:8080`,
    displayUrl: `http://${serverIP}:8081`,
    category: 'monitoring',
    healthEndpoint: '/healthz',
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
