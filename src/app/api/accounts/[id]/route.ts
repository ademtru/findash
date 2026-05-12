import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { deleteAccount, updateAccount } from '@/db/queries/accounts'
import { ACCOUNT_TYPES } from '@/db/schema'

const PutBody = z.object({
  name: z.string().min(1).max(120).optional(),
  institution: z.string().max(120).nullable().optional(),
  last4: z.string().regex(/^\d{4}$/).optional(),
  type: z.enum(ACCOUNT_TYPES).optional(),
  startingBalance: z.string().regex(/^-?\d+(\.\d{1,2})?$/).optional(),
  startingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  balanceSnapshot: z.union([z.string().regex(/^-?\d+(\.\d{1,2})?$/), z.null()]).optional(),
  snapshotAt: z.union([z.string().datetime(), z.null()]).optional(),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  let body: z.infer<typeof PutBody>
  try {
    body = PutBody.parse(await request.json())
  } catch (err) {
    const issues = err instanceof z.ZodError ? err.issues : undefined
    return NextResponse.json({ error: 'Invalid body', issues }, { status: 400 })
  }

  const patch: Parameters<typeof updateAccount>[1] = {}
  if (body.name !== undefined) patch.name = body.name
  if (body.institution !== undefined) patch.institution = body.institution
  if (body.last4 !== undefined) patch.last4 = body.last4
  if (body.type !== undefined) patch.type = body.type
  if (body.startingBalance !== undefined) patch.startingBalance = body.startingBalance
  if (body.startingDate !== undefined) patch.startingDate = body.startingDate
  if (body.balanceSnapshot !== undefined) patch.balanceSnapshot = body.balanceSnapshot
  if (body.snapshotAt !== undefined) {
    patch.snapshotAt = body.snapshotAt === null ? null : new Date(body.snapshotAt)
  }

  const account = await updateAccount(id, patch)
  if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  return NextResponse.json({ account })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  await deleteAccount(id)
  return NextResponse.json({ ok: true })
}
