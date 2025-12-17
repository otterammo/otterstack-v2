'use client'

import { Service } from '@/types/service'

interface DisplayUrlOptions {
  preferLocalUrl?: boolean
}

export function getServiceDisplayUrl(
  service: Service,
  options: DisplayUrlOptions = {}
): string {
  const { preferLocalUrl = false } = options

  if (!preferLocalUrl) {
    // Public services always use otterammo.xyz subdomains
    if (service.id === 'jellyfin') {
      return 'https://jellyfin.otterammo.xyz'
    }
    if (service.id === 'jellyseerr') {
      return 'https://jellyseerr.otterammo.xyz'
    }
  }
  
  // All other services use their displayUrl (IP:PORT)
  return service.displayUrl || service.url
}
