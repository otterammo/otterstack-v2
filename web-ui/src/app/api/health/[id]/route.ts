import { NextRequest, NextResponse } from 'next/server'
import { fetch } from 'undici'
import { SERVICES } from '@/lib/services'

const TIMEOUT_MS = 60000

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const serviceId = params.id
  const service = SERVICES.find((s) => s.id === serviceId)

  if (!service) {
    return NextResponse.json(
      { error: 'Service not found' },
      { status: 404 }
    )
  }

  const startTime = Date.now()
  const checkUrl = service.healthEndpoint
    ? `${service.url}${service.healthEndpoint}`
    : service.url

  try {
    const response = await fetch(checkUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })

    const responseTime = Date.now() - startTime

    return NextResponse.json({
      id: service.id,
      status: response.ok ? 'online' : 'offline',
      responseTime,
      lastChecked: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json({
      id: service.id,
      status: 'offline',
      lastChecked: new Date().toISOString(),
    })
  }
}
