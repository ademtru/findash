// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { createSessionCookie, verifySessionCookie, hashPassword, verifyPassword } from '@/lib/auth'

describe('auth', () => {
  it('creates and verifies a valid session cookie', async () => {
    const cookie = await createSessionCookie('test-secret')
    const valid = await verifySessionCookie(cookie, 'test-secret')
    expect(valid).toBe(true)
  })

  it('rejects cookie signed with wrong secret', async () => {
    const cookie = await createSessionCookie('test-secret')
    const valid = await verifySessionCookie(cookie, 'wrong-secret')
    expect(valid).toBe(false)
  })

  it('verifies correct password against hash', async () => {
    const hash = await hashPassword('mypassword')
    const match = await verifyPassword('mypassword', hash)
    expect(match).toBe(true)
  })

  it('rejects wrong password', async () => {
    const hash = await hashPassword('mypassword')
    const match = await verifyPassword('wrong', hash)
    expect(match).toBe(false)
  })
})
