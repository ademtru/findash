# Per-File Sequential Extraction Design

**Date:** 2026-04-24

## Problem

Uploading multiple PDFs at once sends all files to Gemini in a single API call, hitting rate limits. Users have no way to process files one at a time without re-uploading.

## Goals

- Each uploaded file becomes its own batch (independent extraction budget, independent retry)
- Multiple files are processed sequentially and automatically — no tapping required
- Recent list shows individual filenames, not generic "PDF batch" labels
- Failed files don't block remaining files in the queue

## Design

### 1. Upload API — one batch per file

`POST /api/extract` creates one batch record per file instead of one for all files. Each file is uploaded to Vercel Blob and gets its own `extraction_batches` row (status: `pending`).

Response changes from:
```json
{ "batchId": "..." }
```
to:
```json
{ "batches": [{ "batchId": "...", "name": "statement-jan.pdf" }, ...] }
```

### 2. Sequential queue in CaptureUploader

After upload returns N batchIds, the uploader enters a processing state and works through the queue:

1. Fire `POST /api/extract/[batchId]/run`
2. Poll `GET /api/extract/[batchId]` every 3s until `review` or `failed`
3. Show progress: "Extracting 1 of 3 — statement-jan.pdf"
4. Advance to next batch regardless of success/failure
5. Redirect to `/capture` when all batches are done

No new components — queue logic lives in `CaptureUploader`. Failed files are noted but don't stop the queue.

### 3. Recent list — show filename

`capture/page.tsx` shows `fileRefs[0]?.name` instead of the generic `b.kind.toUpperCase() + ' batch'` label for each recent batch row.

## Files Affected

| File | Change |
|------|--------|
| `src/app/api/extract/route.ts` | Create one batch per file; return `{ batches: [...] }` |
| `src/app/(dashboard)/capture/CaptureUploader.tsx` | Handle batches array; sequential queue UI with progress |
| `src/app/(dashboard)/capture/page.tsx` | Show filename in recent list |
