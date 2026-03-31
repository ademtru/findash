import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'

export const COOKIE_NAME = 'findash_session'
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

export async function createSessionCookie(secret: string): Promise<string> {
  const key = new TextEncoder().encode(secret)
  return new SignJWT({ authenticated: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(key)
}

export async function verifySessionCookie(token: string, secret: string): Promise<boolean> {
  try {
    const key = new TextEncoder().encode(secret)
    await jwtVerify(token, key)
    return true
  } catch {
    return false
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}
