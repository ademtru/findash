# Per-File Sequential Extraction Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upload multiple files and automatically extract them one-by-one to avoid Gemini rate limits, showing per-file progress and filenames in the Recent list.

**Architecture:** The upload endpoint creates one `extraction_batches` record per file (instead of one for all). The uploader receives an array of batchIds and works through them sequentially — firing the run endpoint, polling until complete, then moving to the next — before redirecting to `/capture`. The Recent list shows the actual filename from `fileRefs[0].name`.

**Tech Stack:** Next.js App Router, Drizzle ORM (Neon), `@vercel/blob`, `fetchJson` client helper, Vitest

---

### Task 1: Update /api/extract to create one batch per file

**Files:**
- Modify: `src/app/api/extract/route.ts`

**Context:** Currently the route collects all files into one `blobRefs` array and calls `createBatch` once at the end. The response is `{ batchId: string }`. We need it to create one batch per file and return `{ batches: [{ batchId, name }] }`.

**Step 1: Remove the mixed-types validation**

The check `if (kinds.size > 1)` that rejects mixed image+PDF uploads is no longer needed — each file gets its own batch so mixing types is fine. Delete lines 84–89:

```ts
// DELETE this block entirely:
if (kinds.size > 1) {
  return NextResponse.json(
    { error: 'Mix of file types in one batch is not supported. Upload images, PDFs, or CSVs separately.' },
    { status: 400 },
  )
}
```

Also delete the `kinds` Set declaration (line 64: `const kinds = new Set<Classification>()`) and the `kinds.add(cls)` call inside the loop (line 81).

**Step 2: Replace the single-batch creation with per-file batch creation**

Delete lines 90–117 (from `const only: Classification = ...` to the final `return NextResponse.json`) and replace with:

```ts
  const yearRaw = formData.get('assumeYear') as string | null
  const assumeYear =
    yearRaw && /^\d{4}$/.test(yearRaw) ? Number(yearRaw) : new Date().getFullYear()

  // Create one batch per file
  const batches: { batchId: string; name: string }[] = []

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
    const fileRef: FileRef = { blobUrl: blob.url, name: file.name, mimeType: mime, size: file.size }
    const batchKind = cls === 'image' ? 'screenshot' : cls
    const batch = await createBatch(batchKind as 'screenshot' | 'pdf' | 'csv', [fileRef])
    await setBatchStatus(batch.id, 'pending', { rawResponse: { assumeYear } })
    batches.push({ batchId: batch.id, name: file.name })
  }

  return NextResponse.json({ batches }, { status: 201 })
```

Note `assumeYear` is now declared before the loop (moved from its previous location after the now-deleted `batchKind` line). Move the `yearRaw` / `assumeYear` declaration to appear before the `classified` array loop — or just add it at the top of the function after `token` and before the `classified` loop.

**Step 3: Verify TypeScript compiles**

```bash
pnpm build 2>&1 | grep -E "error TS|✓ Compiled"
```

Expected: `✓ Compiled successfully`

**Step 4: Commit**

```bash
git add src/app/api/extract/route.ts
git commit -m "feat: create one batch per file in upload endpoint"
```

---

### Task 2: Update CaptureUploader with sequential queue

**Files:**
- Modify: `src/app/(dashboard)/capture/CaptureUploader.tsx`

**Context:** The uploader currently posts all files, gets back `{ batchId }`, and immediately redirects to `/capture/[batchId]`. It needs to handle `{ batches: [{ batchId, name }] }`, then work through each batch sequentially while showing progress, then redirect to `/capture`.

**Step 1: Add queue state**

Replace the existing state declarations:
```ts
const [files, setFiles] = useState<File[]>([])
const [assumeYear, setAssumeYear] = useState(String(new Date().getFullYear()))
const [busy, setBusy] = useState(false)
const [error, setError] = useState<string | null>(null)
```

with:
```ts
const [files, setFiles] = useState<File[]>([])
const [assumeYear, setAssumeYear] = useState(String(new Date().getFullYear()))
const [uploading, setUploading] = useState(false)
const [queue, setQueue] = useState<{ current: number; total: number; name: string } | null>(null)
const [error, setError] = useState<string | null>(null)
```

**Step 2: Rewrite the submit function**

Replace the entire `submit` function with:

```ts
async function submit() {
  setError(null)
  if (files.length === 0) {
    setError('Add at least one file')
    return
  }
  setUploading(true)

  const fd = new FormData()
  for (const f of files) fd.append('files', f)
  if (assumeYear) fd.append('assumeYear', assumeYear)

  const { ok, data, error: err } = await fetchJson<{ batches: { batchId: string; name: string }[] }>('/api/extract', {
    method: 'POST',
    body: fd,
  })
  if (!ok || !data?.batches?.length) {
    setError(err ?? 'Upload failed')
    setUploading(false)
    return
  }

  setUploading(false)

  // Process each batch sequentially
  const { batches } = data
  for (let i = 0; i < batches.length; i++) {
    const { batchId, name } = batches[i]
    setQueue({ current: i + 1, total: batches.length, name })

    // Trigger extraction
    await fetchJson(`/api/extract/${batchId}/run`, { method: 'POST' })

    // Poll until terminal status
    let done = false
    while (!done) {
      await new Promise((r) => setTimeout(r, 3000))
      const { ok: pollOk, data: pollData } = await fetchJson<{ batch: { status: string } }>(
        `/api/extract/${batchId}`,
      )
      if (!pollOk || !pollData) continue
      const s = pollData.batch.status
      if (s === 'review' || s === 'failed' || s === 'committed' || s === 'discarded') {
        done = true
      }
    }
  }

  router.push('/capture')
}
```

**Step 3: Update the busy UI**

Replace the `{busy ? (...) : (...)}` conditional. The component now has two loading states — `uploading` (blob upload in progress) and `queue` (sequential extraction). Replace the entire return block's conditional:

```tsx
return (
  <div className="ios-card p-5 space-y-5">
    {uploading ? (
      <div className="flex flex-col items-center gap-3 py-6">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: '#0a84ff' }} />
        <p className="text-[14px]" style={{ color: 'rgba(235,235,245,0.7)' }}>
          Uploading files…
        </p>
      </div>
    ) : queue ? (
      <div className="flex flex-col items-center gap-3 py-6">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: '#0a84ff' }} />
        <p className="text-[14px] font-medium text-white">
          Extracting {queue.current} of {queue.total}
        </p>
        <p className="text-[13px] text-center truncate max-w-full px-4" style={{ color: 'rgba(235,235,245,0.55)' }}>
          {queue.name}
        </p>
        <p className="text-[12px]" style={{ color: 'rgba(235,235,245,0.35)' }}>
          You can navigate away — remaining files will continue after you return.
        </p>
      </div>
    ) : (
      <>
        {/* ... existing file picker UI unchanged ... */}
      </>
    )}
  </div>
)
```

Keep the entire existing file picker UI (camera/library/document buttons, file preview grid, year field, error, submit button) inside the final `<>` block — copy it exactly from the current file.

**Step 4: Verify TypeScript compiles**

```bash
pnpm build 2>&1 | grep -E "error TS|✓ Compiled"
```

Expected: `✓ Compiled successfully`

**Step 5: Commit**

```bash
git add src/app/(dashboard)/capture/CaptureUploader.tsx
git commit -m "feat: sequential per-file extraction queue with progress in uploader"
```

---

### Task 3: Show filename in Recent list

**Files:**
- Modify: `src/app/(dashboard)/capture/page.tsx`

**Context:** Each batch now has exactly one file. `batch.fileRefs` is a `jsonb` column typed as `unknown`. We need to safely extract the filename from `fileRefs[0].name`.

**Step 1: Add a helper to extract the label**

Inside `capture/page.tsx`, add this helper above the `CapturePage` component:

```ts
function batchLabel(b: { kind: string; fileRefs: unknown }): string {
  if (Array.isArray(b.fileRefs) && b.fileRefs.length > 0) {
    const name = (b.fileRefs[0] as { name?: string }).name
    if (name) return name
  }
  return b.kind === 'screenshot' ? 'Screenshot' : b.kind.toUpperCase()
}
```

**Step 2: Use it in the recent list**

Replace:
```tsx
<p className="text-[14px] text-white">
  {b.kind === 'screenshot' ? 'Screenshot' : b.kind.toUpperCase()} batch
</p>
```

with:
```tsx
<p className="text-[14px] text-white truncate max-w-[200px]">
  {batchLabel(b)}
</p>
```

**Step 3: Verify TypeScript compiles**

```bash
pnpm build 2>&1 | grep -E "error TS|✓ Compiled"
```

Expected: `✓ Compiled successfully`

**Step 4: Commit**

```bash
git add src/app/(dashboard)/capture/page.tsx
git commit -m "feat: show filename in Recent list instead of generic batch label"
```
