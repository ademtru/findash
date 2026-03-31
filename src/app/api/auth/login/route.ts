import { NextRequest, NextResponse } from 'next/server'
import { verifyPassword, createSessionCookie, COOKIE_NAME, COOKIE_MAX_AGE } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const { password } = await request.json()
  const hash = process.env.PASSWORD_HASH ?? ''
  const secret = process.env.JWT_SECRET ?? hash

  const valid = await verifyPassword(password, hash)
  if (!valid) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

  const token = await createSessionCookie(secret)
  const response = NextResponse.json({ success: true })
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })
  return response
}
