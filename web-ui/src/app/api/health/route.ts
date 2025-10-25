import { NextResponse } from 'next/server'
import { fetch } from 'undici'
import { SERVICES } from '@/lib/services'
import { ServiceStatus } from '@/types/service'

const TIMEOUT_MS = 5000

async function checkServiceHealth(
  url: string,
  healthEndpoint?: string
): Promise<{ status: 'online' | 'offline'; responseTime?: number }> {
  const startTime = Date.now()
  const checkUrl = healthEndpoint ? `${url}${healthEndpoint}` : url

  try {
    const response = await fetch(checkUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })

    const responseTime = Date.now() - startTime

    if (response.ok) {
      return { status: 'online', responseTime }
    }
    
    return { status: 'offline' }
  } catch (error) {
    return { status: 'offline' }
  }
}

export async function GET() {
  const statusPromises = SERVICES.map(async (service) => {
    const { status, responseTime } = await checkServiceHealth(
      service.url,
      service.healthEndpoint
    )

    return {
      id: service.id,
      status,
      responseTime,
      lastChecked: new Date().toISOString(),
    } as ServiceStatus
  })

  const statuses = await Promise.all(statusPromises)
  
  return NextResponse.json(statuses)
}
