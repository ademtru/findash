#!/usr/bin/env node
import { readFileSync } from 'fs'
import { resolve } from 'path'

try {
  readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8')
    .split('\n')
    .forEach(line => {
      const m = line.match(/^([^#=]+)=(.*)$/)
      if (m && !process.env[m[1].trim()]) process.env[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, '')
    })
} catch { /* no .env.local */ }

import('@vercel/blob').then(async ({ head }) => {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  const url = process.env.BLOB_URL_TRANSACTIONS

  console.log('Token set:', !!token)
  console.log('URL:', url)

  if (!url || !token) { console.error('Missing env vars'); process.exit(1) }

  console.log('\nCalling head()...')
  const result = await head(url, { token })
  console.log('head() result:', JSON.stringify(result, null, 2))

  console.log('\nFetching with Authorization header...')
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  console.log('Status:', res.status)
  const text = await res.text()
  console.log('Body (first 200 chars):', text.slice(0, 200))
})
