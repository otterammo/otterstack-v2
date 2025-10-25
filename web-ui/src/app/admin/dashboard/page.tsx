import { redirect } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'
import { cookies } from 'next/headers'
import ServiceCard from '@/components/ServiceCard'
import { ADMIN_SERVICES } from '@/lib/services'

export default async function AdminDashboardPage() {
  const authenticated = await isAuthenticated()
  
  if (!authenticated) {
    redirect('/admin')
  }

  const categories = {
    media: ADMIN_SERVICES.filter((s) => s.category === 'media'),
    download: ADMIN_SERVICES.filter((s) => s.category === 'download'),
    infrastructure: ADMIN_SERVICES.filter((s) => s.category === 'infrastructure'),
    monitoring: ADMIN_SERVICES.filter((s) => s.category === 'monitoring'),
  }

  const handleLogout = async () => {
    'use server'
    const cookieStore = await cookies()
    cookieStore.delete('admin_session')
    redirect('/admin')
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <nav className="bg-white dark:bg-slate-800 shadow-md border-b border-slate-200 dark:border-slate-700">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Admin Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="/"
              className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              Public Site
            </a>
            <form action={handleLogout}>
              <button
                type="submit"
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Logout
              </button>
            </form>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
            <span className="w-2 h-8 bg-gradient-to-b from-primary-500 to-secondary-500 rounded"></span>
            Media Management
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.media.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
            <span className="w-2 h-8 bg-gradient-to-b from-green-500 to-emerald-500 rounded"></span>
            Downloads
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.download.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
            <span className="w-2 h-8 bg-gradient-to-b from-blue-500 to-cyan-500 rounded"></span>
            Infrastructure
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.infrastructure.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
            <span className="w-2 h-8 bg-gradient-to-b from-yellow-500 to-orange-500 rounded"></span>
            Monitoring
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.monitoring.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
