# Unified Scan + Async Extraction Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Merge capture and import into one screen, switch extraction to Gemini 2.0 Flash (free), make extraction async with polling so users can navigate away, and add retry for failed batches.

**Architecture:** The `/api/extract` POST becomes upload-only (fast, ~5s), returning a `batchId` immediately. A new `/api/extract/[batchId]/run` POST does the actual Gemini extraction. The review page mounts a `<BatchPoller>` client component that fires the run endpoint then polls every 3s, calling `router.refresh()` when status flips to `review`.

**Tech Stack:** Next.js App Router, `@ai-sdk/google` (Gemini 2.0 Flash), `@vercel/blob`, Drizzle ORM (Neon), Vitest

---

### Task 1: Install @ai-sdk/google and wire Gemini Flash into gateway

**Files:**
- Modify: `src/lib/ai/gateway.ts`

**Step 1: Install the package**

```bash
pnpm add @ai-sdk/google
```

Expected: package installs, `pnpm-lock.yaml` updated.

**Step 2: Update gateway.ts**

Replace the entire file:

```ts
import { google } from '@ai-sdk/google'
import { createGateway } from '@ai-sdk/gateway'

const gateway = createGateway()

export const MODELS = {
  // Extraction uses Gemini 2.0 Flash — free tier, native PDF/image support
  categorize: 'anthropic/claude-haiku-4.5',
  extractImage: google('gemini-2.0-flash'),
  extractCsv: google('gemini-2.0-flash'),
  weeklyInsight: 'anthropic/claude-sonnet-4.6',
  monthlyInsight: 'anthropic/claude-sonnet-4.6',
} as const

export type ModelKey = keyof typeof MODELS
export { gateway }
```

**Step 3: Add the env var to .env.local**

Go to https://aistudio.google.com/apikey, create a free API key, then add:

```
GOOGLE_GENERATIVE_AI_API_KEY=your_key_here
```

Also add it to Vercel project settings (Settings → Environment Variables).

**Step 4: Verify TypeScript compiles**

```bash
pnpm build 2>&1 | head -30
```

Expected: no type errors on gateway.ts. (Build may fail on other things — only care about gateway for now.)

**Step 5: Commit**

```bash
git add src/lib/ai/gateway.ts pnpm-lock.yaml package.json
git commit -m "feat: switch extraction models to Gemini 2.0 Flash (free)"
```

---

### Task 2: Add clearPendingByBatch helper to batches queries

**Files:**
- Modify: `src/db/queries/batches.ts`

**Step 1: Write a test for the new helper**

Create `src/test/lib/batches.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

// clearPendingByBatch is a DB mutation — we test its signature/export only.
// Integration behaviour is covered by the retry flow in Task 5.
describe('clearPendingByBatch', () => {
  it('is exported from batches queries', async () => {
    const mod = await import('@/db/queries/batches')
    expect(typeof mod.clearPendingByBatch).toBe('function')
  })
})
```

**Step 2: Run test to verify it fails**

```bash
pnpm test:run src/test/lib/batches.test.ts
```

Expected: FAIL — "clearPendingByBatch is not a function".

**Step 3: Add clearPendingByBatch to batches.ts**

At the bottom of `src/db/queries/batches.ts`, add:

```ts
export async function clearPendingByBatch(batchId: string): Promise<void> {
  await db
    .delete(pendingTransactions)
    .where(eq(pendingTransactions.batchId, batchId))
}
```

You'll need to add `delete` to the drizzle imports at the top:

```ts
import { desc, eq, delete as del } from 'drizzle-orm'
```

Wait — `delete` is a reserved word. Use named import alias:

```ts
import { desc, eq } from 'drizzle-orm'
```

The `db.delete(...)` syntax uses the ORM's `.delete()` method directly — no extra import needed. Just add the function body using `db.delete(pendingTransactions).where(eq(pendingTransactions.batchId, batchId))`.

**Step 4: Run test to verify it passes**

```bash
pnpm test:run src/test/lib/batches.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/db/queries/batches.ts src/test/lib/batches.test.ts
git commit -m "feat: add clearPendingByBatch helper"
```

---

### Task 3: Rework /api/extract to upload-only (no AI)

**Files:**
- Modify: `src/app/api/extract/route.ts`

**Step 1: Strip the AI call from the handler**

Replace the `POST` handler body from the `try { const result = await runExtract...` block onwards. The new handler should:
1. Validate files (keep existing validation)
2. Upload each file to Vercel Blob (keep existing loop)
3. Create the batch with `status: 'pending'` via `createBatch`
4. Return `{ batchId: batch.id }` immediately — no AI call

Remove the import of `runExtract` and `ExtractPart`/`ExtractKind` types. Keep `createBatch` and `FileRef` imports.

Final `POST` function (replace from line 42 onwards):

```ts
export async function POST(request: NextRequest) {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) {
    return NextResponse.json({ error: 'Storage not configured' }, { status: 500 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid multipart body' }, { status: 400 })
  }

  const files = formData.getAll('files').filter((v): v is File => v instanceof File)
  if (files.length === 0) {
    return NextResponse.json({ error: 'No files provided' }, { status: 400 })
  }
  if (files.length > MAX_FILES) {
    return NextResponse.json({ error: `Up to ${MAX_FILES} files per batch` }, { status: 400 })
  }

  const classified: { file: File; cls: Classification }[] = []
  const kinds = new Set<Classification>()
  for (const file of files) {
    const cls = classify(file)
    if (!cls) {
      return NextResponse.json(
        { error: `Unsupported file type for "${file.name}". Images, PDF, or CSV only.` },
        { status: 400 },
      )
    }
    if (file.size > sizeLimit(cls)) {
      const mb = Math.round(sizeLimit(cls) / 1024 / 1024)
      return NextResponse.json(
        { error: `"${file.name}" exceeds the ${mb}MB limit for ${cls}.` },
        { status: 400 },
      )
    }
    classified.push({ file, cls })
    kinds.add(cls)
  }

  if (kinds.size > 1) {
    return NextResponse.json(
      { error: 'Mix of file types in one batch is not supported.' },
      { status: 400 },
    )
  }

  const only: Classification = classified[0].cls
  const batchKind = only === 'image' ? 'screenshot' : only

  const yearRaw = formData.get('assumeYear') as string | null
  const assumeYear =
    yearRaw && /^\d{4}$/.test(yearRaw) ? Number(yearRaw) : new Date().getFullYear()

  // Upload files to Blob storage
  const blobRefs: FileRef[] = []
  for (const { file, cls } of classified) {
    const mime = file.type || (cls === 'pdf' ? 'application/pdf' : cls === 'csv' ? 'text/csv' : 'application/octet-stream')
    const bytes = Buffer.from(await file.arrayBuffer())
    const stamp = Date.now()
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const blob = await put(`captures/${stamp}-${safeName}`, bytes, {
      access: 'private',
      contentType: mime,
      token,
      addRandomSuffix: true,
    })
    blobRefs.push({ blobUrl: blob.url, name: file.name, mimeType: mime, size: file.size })
  }

  // Create batch record — extraction runs separately via /api/extract/[batchId]/run
  const batch = await createBatch(batchKind as 'screenshot' | 'pdf' | 'csv', blobRefs)

  // Store assumeYear on the batch so the run endpoint can use it
  // We piggyback it in rawResponse for now (no schema change needed)
  await setBatchStatus(batch.id, 'pending', { rawResponse: { assumeYear } })

  return NextResponse.json({ batchId: batch.id }, { status: 201 })
}
```

Update imports at top — remove `runExtract`, `ExtractKind`, `ExtractPart`. Add `setBatchStatus`:

```ts
import { createBatch, setBatchStatus, type FileRef } from '@/db/queries/batches'
```

**Step 2: Verify TypeScript compiles**

```bash
pnpm build 2>&1 | grep -E "error|Error" | head -20
```

Expected: no errors in extract/route.ts.

**Step 3: Commit**

```bash
git add src/app/api/extract/route.ts
git commit -m "refactor: make /api/extract upload-only, defer AI to run endpoint"
```

---

### Task 4: Create /api/extract/[batchId]/run route

**Files:**
- Create: `src/app/api/extract/[batchId]/run/route.ts`

This endpoint downloads the stored blobs, runs Gemini extraction, and updates the batch. It is idempotent: skips if already `extracting`/`review`/`committed`, re-runs if `pending` or `failed`.

**Step 1: Create the file**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getBatch, setBatchStatus, clearPendingByBatch, insertPendingRows } from '@/db/queries/batches'
import { runExtract } from '@/lib/ai/extract'
import type { ExtractPart } from '@/lib/ai/extract'
import type { FileRef } from '@/db/queries/batches'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> },
) {
  const { batchId } = await params
  const batch = await getBatch(batchId)
  if (!batch) return NextResponse.json({ error: 'Batch not found' }, { status: 404 })

  // Idempotency guard
  if (batch.status === 'extracting' || batch.status === 'review' || batch.status === 'committed') {
    return NextResponse.json({ status: batch.status }, { status: 200 })
  }

  // Reset state for pending or failed (retry case)
  await clearPendingByBatch(batchId)
  await setBatchStatus(batchId, 'extracting')

  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) {
    await setBatchStatus(batchId, 'failed', { error: 'Storage not configured' })
    return NextResponse.json({ error: 'Storage not configured' }, { status: 500 })
  }

  // Recover assumeYear stored during upload
  const assumeYear =
    batch.rawResponse &&
    typeof batch.rawResponse === 'object' &&
    'assumeYear' in batch.rawResponse &&
    typeof (batch.rawResponse as { assumeYear?: unknown }).assumeYear === 'number'
      ? (batch.rawResponse as { assumeYear: number }).assumeYear
      : new Date().getFullYear()

  const fileRefs = batch.fileRefs as FileRef[]
  const parts: ExtractPart[] = []

  // Download each blob and build extract parts
  for (const ref of fileRefs) {
    const res = await fetch(ref.blobUrl, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      await setBatchStatus(batchId, 'failed', { error: `Failed to download ${ref.name}` })
      return NextResponse.json({ error: `Failed to download ${ref.name}` }, { status: 502 })
    }
    const bytes = Buffer.from(await res.arrayBuffer())
    const mime = ref.mimeType.toLowerCase()

    if (mime.startsWith('image/')) {
      parts.push({ kind: 'image', bytes, mimeType: ref.mimeType })
    } else if (mime === 'application/pdf') {
      parts.push({ kind: 'pdf', bytes })
    } else {
      parts.push({ kind: 'csv', text: bytes.toString('utf-8'), filename: ref.name })
    }
  }

  const batchKind = batch.kind as 'screenshot' | 'pdf' | 'csv'

  try {
    await runExtract({
      batchId,
      kind: batchKind,
      files: fileRefs,
      parts,
      assumeYear,
    })
    return NextResponse.json({ status: 'review' }, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await setBatchStatus(batchId, 'failed', { error: message })
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
```

**Step 2: Update runExtract to accept an existing batchId**

The current `runExtract` in `src/lib/ai/extract.ts` always calls `createBatch`. We need it to accept an existing `batchId` instead.

Modify `RunExtractArgs` in `src/lib/ai/extract.ts`:

```ts
export interface RunExtractArgs {
  batchId: string        // always pass existing batch id now
  kind: ExtractKind
  files: FileRef[]
  parts: ExtractPart[]
  assumeYear: number
}
```

Update `runExtract` to use the passed `batchId` instead of calling `createBatch`:

```ts
export async function runExtract(args: RunExtractArgs): Promise<RunExtractResult> {
  // Use existing batch — caller is responsible for creating it
  try {
    const activeCategories = await distinctCategories()
    const { system, user } = buildExtractPrompt({
      assumeYear: args.assumeYear,
      activeCategories,
      sourceKind: args.kind,
    })

    const model = args.kind === 'csv' ? MODELS.extractCsv : MODELS.extractImage
    const content = buildUserContent(user, args.parts)

    const result = await generateObject({
      model,
      schema: ExtractionBatchSchema,
      system,
      messages: [{ role: 'user', content: content as never }],
      temperature: 0,
    })

    const extracted = result.object
    const existing = await listTransactions()
    const pendingRows = extracted.transactions.map((t) => {
      const reference = buildReferenceSet(existing, t.date)
      const dupe = findFuzzyDuplicate(
        { date: t.date, amount: t.amount, description: t.description },
        reference,
      )
      return {
        batchId: args.batchId,
        draft: t,
        suggestedCategory: t.category,
        categoryConfidence: t.confidence ?? null,
        duplicateOf: dupe?.id ?? null,
      }
    })

    await insertPendingRows(pendingRows)
    await setBatchStatus(args.batchId, 'review', { model: String(model), rawResponse: extracted })

    return {
      batchId: args.batchId,
      transactions: extracted.transactions,
      warnings: extracted.warnings ?? [],
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await setBatchStatus(args.batchId, 'failed', { error: message })
    throw err
  }
}
```

Remove `createBatch` from the imports in `extract.ts` since it's no longer called there.

**Step 3: Verify TypeScript compiles**

```bash
pnpm build 2>&1 | grep -E "error|Error" | head -20
```

Expected: no errors in the run route or extract.ts.

**Step 4: Commit**

```bash
git add src/app/api/extract/[batchId]/run/route.ts src/lib/ai/extract.ts
git commit -m "feat: add /api/extract/[batchId]/run for async extraction with retry support"
```

---

### Task 5: Create BatchPoller client component

**Files:**
- Create: `src/app/(dashboard)/capture/[batchId]/BatchPoller.tsx`

This client component fires the run endpoint then polls until status is terminal.

**Step 1: Create the file**

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { fetchJson } from '@/lib/fetch-json'

interface Props {
  batchId: string
  initialStatus: string
}

export function BatchPoller({ batchId, initialStatus }: Props) {
  const router = useRouter()
  const [status, setStatus] = useState(initialStatus)
  const [error, setError] = useState<string | null>(null)
  const ranRef = useRef(false)

  useEffect(() => {
    if (ranRef.current) return
    ranRef.current = true

    let stopped = false

    async function start() {
      // Fire the run endpoint (idempotent — safe to call even if already extracting)
      await fetchJson(`/api/extract/${batchId}/run`, { method: 'POST' })

      // Poll until terminal status
      while (!stopped) {
        await new Promise((r) => setTimeout(r, 3000))
        const { ok, data } = await fetchJson<{ batch: { status: string; error?: string } }>(
          `/api/extract/${batchId}`,
        )
        if (!ok || !data) continue

        const s = data.batch.status
        setStatus(s)

        if (s === 'review') {
          router.refresh()
          return
        }
        if (s === 'failed') {
          setError(data.batch.error ?? 'Extraction failed')
          return
        }
        if (s === 'committed' || s === 'discarded') {
          router.refresh()
          return
        }
      }
    }

    start()
    return () => { stopped = true }
  }, [batchId, router])

  if (status === 'failed' && error) {
    return (
      <div
        className="rounded-xl p-4 text-[14px]"
        style={{ background: 'rgba(255,69,58,0.1)', color: '#ff453a' }}
      >
        Extraction failed: {error}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3 py-10">
      <Loader2 className="h-6 w-6 animate-spin" style={{ color: '#0a84ff' }} />
      <p className="text-[14px]" style={{ color: 'rgba(235,235,245,0.7)' }}>
        {status === 'extracting' ? 'Extracting transactions…' : 'Starting extraction…'}
      </p>
      <p className="text-[12px]" style={{ color: 'rgba(235,235,245,0.45)' }}>
        You can navigate away — this runs in the background.
      </p>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/app/(dashboard)/capture/[batchId]/BatchPoller.tsx
git commit -m "feat: add BatchPoller client component for live extraction status"
```

---

### Task 6: Update review page to handle async states and retry

**Files:**
- Modify: `src/app/(dashboard)/capture/[batchId]/page.tsx`

**Step 1: Add pending/extracting state and retry button**

The page needs to:
1. Show `<BatchPoller>` when status is `pending` or `extracting`
2. Show a "Retry extraction" button on `failed` status
3. Keep existing review/committed UI unchanged

At the top of the file, add the BatchPoller import:

```ts
import { BatchPoller } from './BatchPoller'
```

Replace the JSX section after the header (after the `<div>` with title and description), adding:

```tsx
{/* Async states */}
{(batch.status === 'pending' || batch.status === 'extracting') && (
  <BatchPoller batchId={batchId} initialStatus={batch.status} />
)}

{batch.status === 'failed' && (
  <div className="space-y-3">
    <div
      className="rounded-xl p-4 text-[14px]"
      style={{ background: 'rgba(255,69,58,0.1)', color: '#ff453a' }}
    >
      Extraction failed: {batch.error ?? 'unknown error'}
    </div>
    <BatchPoller batchId={batchId} initialStatus="pending" />
  </div>
)}
```

Wait — for the failed case, we don't want BatchPoller to auto-start. Instead show a "Retry" button that, when clicked, mounts a `<BatchPoller>`.

Create a small `RetryButton` client component inline or in a separate file. Simpler: make it a separate file.

Create `src/app/(dashboard)/capture/[batchId]/RetryButton.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { BatchPoller } from './BatchPoller'

export function RetryButton({ batchId }: { batchId: string }) {
  const [retrying, setRetrying] = useState(false)

  if (retrying) {
    return <BatchPoller batchId={batchId} initialStatus="pending" />
  }

  return (
    <button
      type="button"
      onClick={() => setRetrying(true)}
      className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-[14px] font-medium"
      style={{ background: 'rgba(10,132,255,0.12)', color: '#0a84ff' }}
    >
      <RotateCcw className="h-4 w-4" />
      Retry extraction
    </button>
  )
}
```

Then in the review page, replace the `batch.status === 'failed'` block:

```tsx
{batch.status === 'failed' && (
  <div className="space-y-3">
    <div
      className="rounded-xl p-4 text-[14px]"
      style={{ background: 'rgba(255,69,58,0.1)', color: '#ff453a' }}
    >
      Extraction failed: {batch.error ?? 'unknown error'}
    </div>
    <RetryButton batchId={batchId} />
  </div>
)}
```

Remove the old `batch.status === 'failed'` block that was there before (it was a standalone div).

Also update the `ReviewGrid` condition — only show it when status is `review` or `committed` AND items.length > 0:

```tsx
{(batch.status === 'review' || batch.status === 'committed') && (
  // ... existing ReviewGrid / committed JSX
)}
```

Remove the old standalone failed block (lines 80–88 in the current file).

**Step 2: Verify TypeScript compiles**

```bash
pnpm build 2>&1 | grep -E "error|Error" | head -20
```

**Step 3: Commit**

```bash
git add src/app/(dashboard)/capture/[batchId]/page.tsx \
        src/app/(dashboard)/capture/[batchId]/RetryButton.tsx
git commit -m "feat: show BatchPoller for async states and RetryButton for failed batches"
```

---

### Task 7: Unify the uploader (add PDF/CSV to CaptureUploader)

**Files:**
- Modify: `src/app/(dashboard)/capture/CaptureUploader.tsx`

**Step 1: Add a third file input for PDF/CSV**

The uploader needs a third action button: "Choose file" that accepts `.pdf,.csv`. The submit logic stays the same — it posts to `/api/extract` with all files.

Add to the imports:

```ts
import { Camera, FileText, ImagePlus, Loader2, X } from 'lucide-react'
```

Add a third `ref` in the component:

```ts
const documentRef = useRef<HTMLInputElement>(null)
```

Add a third button in the grid (change to 3-col or stack it):

```tsx
<div className="grid grid-cols-2 gap-3">
  <button
    type="button"
    onClick={() => cameraRef.current?.click()}
    className="flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-medium"
    style={{ background: 'rgba(10,132,255,0.12)', color: '#0a84ff' }}
  >
    <Camera className="h-4 w-4" /> Take photo
  </button>
  <button
    type="button"
    onClick={() => libraryRef.current?.click()}
    className="flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-medium"
    style={{ background: 'rgba(120,120,128,0.16)', color: 'rgba(235,235,245,0.85)' }}
  >
    <ImagePlus className="h-4 w-4" /> From library
  </button>
</div>
<button
  type="button"
  onClick={() => documentRef.current?.click()}
  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-medium border-2 border-dashed"
  style={{
    background: 'rgba(10,132,255,0.06)',
    color: '#0a84ff',
    borderColor: 'rgba(10,132,255,0.35)',
  }}
>
  <FileText className="h-4 w-4" />
  Choose PDF or CSV
</button>
```

Add the hidden input below the existing two:

```tsx
<input
  ref={documentRef}
  type="file"
  accept=".pdf,.csv,application/pdf,text/csv"
  multiple
  className="hidden"
  onChange={(e) => addFiles(e.target.files)}
/>
```

**Step 2: Update loading message**

Change the spinner message from screenshot-specific to generic:

```tsx
<p className="text-[14px]" style={{ color: 'rgba(235,235,245,0.7)' }}>
  Uploading… you'll be able to review transactions shortly.
</p>
```

**Step 3: Commit**

```bash
git add src/app/(dashboard)/capture/CaptureUploader.tsx
git commit -m "feat: add PDF/CSV upload to capture screen, unifying scan and import"
```

---

### Task 8: Update capture page and remove /import

**Files:**
- Modify: `src/app/(dashboard)/capture/page.tsx`
- Delete: `src/app/(dashboard)/import/` (whole directory)

**Step 1: Remove the "Go to Import" link from capture/page.tsx**

Delete these lines from `src/app/(dashboard)/capture/page.tsx`:

```tsx
<p className="text-[13px]" style={{ color: 'rgba(235,235,245,0.5)' }}>
  Importing a bank statement PDF or CSV?{' '}
  <Link href="/import" className="font-medium" style={{ color: '#0a84ff' }}>
    Go to Import →
  </Link>
</p>
```

Also remove the `Link` import if it becomes unused.

**Step 2: Update the page title and description**

Update the heading and subtitle to reflect that it handles all file types now:

```tsx
<h1 className="text-[28px] font-bold text-white tracking-tight">Scan</h1>
<p className="text-[14px] mt-1" style={{ color: 'rgba(235,235,245,0.55)' }}>
  Take a screenshot of your banking app, or import a PDF statement or CSV export. AI extracts the transactions — you review and commit.
</p>
```

**Step 3: Delete the /import directory**

```bash
rm -rf src/app/(dashboard)/import
```

**Step 4: Verify the build**

```bash
pnpm build 2>&1 | grep -E "error|Error" | head -30
```

Expected: clean build with no references to /import.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: remove /import page, update capture page title and description"
```

---

### Task 9: Manual end-to-end verification

No automated test needed here — verify the full flow manually.

**Screenshot flow:**
1. Open `/capture`
2. Tap "Take photo" or "From library" → pick an image
3. Tap "Extract transactions" → should redirect to `/capture/[batchId]` quickly (< 5s)
4. Review page shows spinner with "Extracting transactions…"
5. Navigate to `/` and back — spinner still shows
6. After ~15–30s, page auto-updates with extracted transactions
7. Review and commit → status becomes "committed"

**PDF flow:**
1. Open `/capture`
2. Tap "Choose PDF or CSV" → pick a bank statement PDF
3. Same async flow as above

**Retry flow:**
1. Find a batch with `status: 'failed'` in recent list (or manually set one via DB)
2. Open `/capture/[batchId]`
3. See error banner + "Retry extraction" button
4. Tap retry → spinner appears → page updates when done

**Verify /import is gone:**
1. Navigate to `/import` → should 404

**Step: Commit any fixes found during testing**

```bash
git add -A
git commit -m "fix: <describe what you fixed>"
```
