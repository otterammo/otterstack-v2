import ServiceCard from '@/components/ServiceCard'
import { PUBLIC_SERVICES } from '@/lib/services'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="container mx-auto px-4 py-12">
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent mb-4">
            Media Stack
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 mb-6">
            Your personal media center
          </p>
          <a
            href="/admin"
            className="inline-block px-6 py-3 bg-gradient-to-r from-primary-500 to-secondary-500 text-white font-semibold rounded-lg hover:from-primary-600 hover:to-secondary-600 transition-all shadow-lg hover:shadow-xl"
          >
            Admin Dashboard
          </a>
        </header>

        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
            Available Services
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {PUBLIC_SERVICES.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        </div>

        <footer className="mt-16 text-center text-slate-500 dark:text-slate-500 text-sm">
          <p>Media Stack v1.0</p>
        </footer>
      </div>
    </div>
  )
}
