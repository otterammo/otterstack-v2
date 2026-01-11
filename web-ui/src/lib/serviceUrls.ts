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

  if (preferLocalUrl && service.localUrl) {
    return service.localUrl
  }

  if (!preferLocalUrl && service.publicUrl) {
    return service.publicUrl
  }
  
  // All other services use their displayUrl (IP:PORT)
  return service.displayUrl || service.url
}
