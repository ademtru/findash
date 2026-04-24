import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { listAccounts, insertAccount } from '@/db/queries/accounts'

const PostBody = z.object({
  name: z.string().min(1).max(120),
  institution: z.string().max(120).optional(),
  last4: z.string().regex(/^\d{4}$/, 'Must be exactly 4 digits'),
})

export async function GET() {
  const rows = await listAccounts()
  return NextResponse.json({ accounts: rows })
}

export async function POST(request: NextRequest) {
  let body: z.infer<typeof PostBody>
  try {
    body = PostBody.parse(await request.json())
  } catch (err) {
    const issues = err instanceof z.ZodError ? err.issues : undefined
    return NextResponse.json({ error: 'Invalid body', issues }, { status: 400 })
  }

  const account = await insertAccount({
    name: body.name,
    institution: body.institution ?? null,
    last4: body.last4,
  })
  return NextResponse.json({ account }, { status: 201 })
}
