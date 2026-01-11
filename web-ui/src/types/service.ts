export interface Service {
  id: string
  name: string
  description: string
  url: string
  displayUrl?: string  // URL to display to users (for external access)
  localUrl?: string    // Local access URL (e.g., https://host:8989)
  publicUrl?: string   // Public-facing URL (e.g., routed through Traefik/Cloudflare)
  category: 'public' | 'media' | 'download' | 'infrastructure' | 'monitoring'
  icon?: string
  healthEndpoint?: string
}

export interface ServiceStatus {
  id: string
  status: 'online' | 'offline' | 'checking'
  responseTime?: number
  lastChecked: string
}

export interface ServiceWithStatus extends Service {
  status: ServiceStatus
}
