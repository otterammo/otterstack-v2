import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const SESSION_COOKIE = 'admin_session'

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
  
  return NextResponse.json({ success: true })
}
