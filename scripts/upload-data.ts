#!/usr/bin/env node
/**
 * Uploads transactions.json or insights.json to Vercel Blob.
 *
 * Usage:
 *   BLOB_READ_WRITE_TOKEN=xxx pnpm tsx scripts/upload-data.ts transactions.json
 *   BLOB_READ_WRITE_TOKEN=xxx pnpm tsx scripts/upload-data.ts insights.json
 *
 * After upload, set the printed URL as BLOB_URL_TRANSACTIONS or BLOB_URL_INSIGHTS
 * in your Vercel project environment variables.
 */
import { put } from '@vercel/blob'
import { readFileSync } from 'fs'
import path from 'path'

async function main() {
  const filename = process.argv[2]
  if (!filename) {
    console.error('Usage: pnpm tsx scripts/upload-data.ts <filename.json>')
    process.exit(1)
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) {
    console.error('Error: BLOB_READ_WRITE_TOKEN environment variable is required')
    process.exit(1)
  }

  const filepath = path.resolve(process.cwd(), filename)
  let content: string
  try {
    content = readFileSync(filepath, 'utf-8')
    JSON.parse(content) // validate it's valid JSON
  } catch (err) {
    console.error(`Error reading or parsing ${filename}:`, err)
    process.exit(1)
  }

  const name = path.basename(filename)
  console.log(`Uploading ${name}...`)

  const blob = await put(name, content, {
    access: 'public',
    contentType: 'application/json',
    token,
    addRandomSuffix: false, // keep filename stable so URL doesn't change
  })

  const envKey = name === 'transactions.json' ? 'BLOB_URL_TRANSACTIONS' : 'BLOB_URL_INSIGHTS'
  console.log(`\nUploaded successfully!`)
  console.log(`URL: ${blob.url}`)
  console.log(`\nSet this in your Vercel environment variables:`)
  console.log(`${envKey}=${blob.url}`)
}

main().catch(err => {
  console.error('Upload failed:', err)
  process.exit(1)
})
