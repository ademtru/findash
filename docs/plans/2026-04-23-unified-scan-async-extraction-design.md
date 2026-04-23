# Unified Scan Screen + Async Extraction Design

**Date:** 2026-04-23

## Problem

1. PDF imports time out — the single `/api/extract` call does blob upload + AI extraction synchronously, hitting Vercel Hobby's 60s limit on large documents.
2. The capture (`/capture`) and import (`/import`) screens are split — scan shows recent batches, import does not; users must context-switch between two screens.
3. No way to retry a failed extraction without re-uploading files (blobs are stored but unused after failure).

## Goals

- Fix PDF timeouts without Vercel Pro or a paid queue service.
- Merge capture and import into one unified "Scan" screen.
- Enable retry of failed batches from stored blobs.
- Background extraction: user can navigate away and return to a live-updating review page.

## Decisions

### AI: Switch to Gemini 2.0 Flash

Replace `@ai-sdk/gateway` (Anthropic Claude) for extraction with `@ai-sdk/google` (Gemini 2.0 Flash). Gemini Flash is free (1,500 req/day, 1M tokens/min), supports PDFs natively as file parts, and is 3–5× faster than Claude Sonnet — most bank statements (1–10 pages) will complete well within Vercel Hobby's 60s limit. Requires `GOOGLE_GENERATIVE_AI_API_KEY` from Google AI Studio.

Insights (weekly/monthly) can stay on Anthropic via gateway for now.

### Async Extraction: Two-step split

Split the single synchronous extract call into two endpoints:

1. **`POST /api/extract`** — upload blobs + create batch (`status: pending`), return `{batchId}` in ~5s. No AI.
2. **`POST /api/extract/[batchId]/run`** — fetch blobs, run Gemini extraction, update batch to `extracting` → `review` or `failed`. Idempotent: skips if already `extracting`/`review`/`committed`; resets and reruns if `pending` or `failed`.

The review page (`/capture/[batchId]`) gets a `<BatchPoller>` client component:
- On mount: if status is `pending`, fires the run endpoint then polls every 3s.
- If status is `extracting`: polls only (handles returning after navigation).
- On `review`: calls `router.refresh()` to re-render the server component with transactions.
- On `failed`: shows error + "Retry" button.

Navigate-away resilience: if the browser cancels the run fetch mid-flight, the batch stays `pending` or reverts to `failed`. On return, `BatchPoller` re-triggers the run automatically.

### Unified Screen

`/capture` becomes the single entry point. The uploader card has three actions:
- **Take photo** — camera, images only (existing)
- **From library** — image picker, images only (existing)
- **Choose file** — file picker accepting PDF + CSV (new)

File type is auto-detected from the picked files. Mixing incompatible types (image + PDF/CSV) shows a friendly error before submit. Year field retained.

Below the uploader: existing recent batches list unchanged (already shows all kinds).

`/import` page is removed. The "Go to Import →" link on the capture page is removed.

### Retry

On the review page for a `failed` batch: show existing error banner + a "Retry extraction" button. Clicking calls `POST /api/extract/[batchId]/run`. The run endpoint clears old pending transactions, resets batch to `extracting`, re-downloads from stored `fileRefs` blob URLs, and reruns Gemini. UI transitions to polling state.

## Files Affected

| File | Change |
|------|--------|
| `src/lib/ai/gateway.ts` | Add Gemini Flash models for extraction |
| `src/app/api/extract/route.ts` | Remove AI call; upload + create batch only |
| `src/app/api/extract/[batchId]/run/route.ts` | New — runs extraction, idempotent |
| `src/app/(dashboard)/capture/page.tsx` | Remove import link; recents list already correct |
| `src/app/(dashboard)/capture/CaptureUploader.tsx` | Add "Choose file" (PDF/CSV) action, unify with DocumentUploader logic |
| `src/app/(dashboard)/capture/[batchId]/page.tsx` | Handle `pending`/`extracting` status; mount `<BatchPoller>` |
| `src/app/(dashboard)/capture/[batchId]/BatchPoller.tsx` | New client component — fires run, polls, refreshes |
| `src/app/(dashboard)/import/` | Delete directory |
| `src/db/queries/batches.ts` | Add `clearPendingByBatch` helper |
