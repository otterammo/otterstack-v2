'use client'

import { Service } from '@/types/service'

export function getServiceDisplayUrl(service: Service): string {
  // Public services always use otterammo.xyz subdomains
  if (service.id === 'jellyfin') {
    return 'https://jellyfin.otterammo.xyz'
  }
  if (service.id === 'jellyseerr') {
    return 'https://jellyseerr.otterammo.xyz'
  }
  
  // All other services use their displayUrl (IP:PORT)
  return service.displayUrl || service.url
}
