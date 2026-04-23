import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

declare global {
  // eslint-disable-next-line no-var
  var __drizzle_db: ReturnType<typeof drizzle<typeof schema>> | undefined
}

function createClient() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set')
  return drizzle(neon(url), { schema })
}

export const db = globalThis.__drizzle_db ?? createClient()
if (process.env.NODE_ENV !== 'production') globalThis.__drizzle_db = db

export { schema }
