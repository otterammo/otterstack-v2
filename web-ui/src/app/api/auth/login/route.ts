import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { readFileSync } from 'fs'

function getAdminPassword(): string {
  const passwordFile = process.env.ADMIN_PASSWORD_FILE
  if (passwordFile) {
    try {
      return readFileSync(passwordFile, 'utf8').trim()
    } catch {
      console.error('Failed to read ADMIN_PASSWORD_FILE')
    }
  }
  return process.env.ADMIN_PASSWORD || 'admin'
}

const ADMIN_PASSWORD = getAdminPassword()
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
