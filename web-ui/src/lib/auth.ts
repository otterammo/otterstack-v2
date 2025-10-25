import { cookies } from 'next/headers'

const SESSION_COOKIE = 'admin_session'

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies()
  const session = cookieStore.get(SESSION_COOKIE)
  return session?.value === 'authenticated'
}
