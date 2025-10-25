import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin'
const SESSION_COOKIE = 'admin_session'

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()

    if (password === ADMIN_PASSWORD) {
      const response = NextResponse.json({ success: true })
      
      const cookieStore = await cookies()
      cookieStore.set(SESSION_COOKIE, 'authenticated', {
        httpOnly: true,
        secure: false, // Allow HTTP for local network access
        sameSite: 'lax', // Allow cookies across different local hostnames
        maxAge: 60 * 60 * 24,
      })

      return response
    }

    return NextResponse.json(
      { error: 'Invalid password' },
      { status: 401 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    )
  }
}
