'use client'

import { Service, ServiceStatus } from '@/types/service'
import { useEffect, useState } from 'react'
import { getServiceDisplayUrl } from '@/lib/serviceUrls'

interface ServiceCardProps {
  service: Service
  showCategory?: boolean
}

export default function ServiceCard({ service, showCategory = false }: ServiceCardProps) {
  const [status, setStatus] = useState<ServiceStatus>({
    id: service.id,
    status: 'checking',
    lastChecked: new Date().toISOString(),
  })

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch(`/api/health/${service.id}`)
        const data = await response.json()
        setStatus(data)
      } catch (error) {
        setStatus({
          id: service.id,
          status: 'offline',
          lastChecked: new Date().toISOString(),
        })
      }
    }

    checkHealth()
    const interval = setInterval(checkHealth, 30000)
    return () => clearInterval(interval)
  }, [service.id])

  const statusColors = {
    online: 'bg-green-500',
    offline: 'bg-red-500',
    checking: 'bg-yellow-500',
  }

  const statusText = {
    online: 'Online',
    offline: 'Offline',
    checking: 'Checking...',
  }

  const displayUrl = getServiceDisplayUrl(service)

  return (
    <a
      href={displayUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group block bg-white dark:bg-slate-800 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-slate-200 dark:border-slate-700"
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
              {service.name}
            </h3>
            {showCategory && (
              <span className="inline-block mt-1 px-2 py-1 text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded">
                {service.category}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${statusColors[status.status]} animate-pulse`} />
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
              {statusText[status.status]}
            </span>
          </div>
        </div>
        
        <p className="text-slate-600 dark:text-slate-400 text-sm mb-3">
          {service.description}
        </p>

        {status.responseTime && (
          <div className="text-xs text-slate-500 dark:text-slate-500">
            Response time: {status.responseTime}ms
          </div>
        )}
      </div>
      
      <div className="h-1 bg-gradient-to-r from-primary-500 to-secondary-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
    </a>
  )
}
