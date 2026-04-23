'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Loader2, Upload, X } from 'lucide-react'
import { fetchJson } from '@/lib/fetch-json'

export function DocumentUploader() {
  const router = useRouter()
  const [files, setFiles] = useState<File[]>([])
  const [assumeYear, setAssumeYear] = useState(String(new Date().getFullYear()))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pickerRef = useRef<HTMLInputElement>(null)

  function addFiles(list: FileList | null) {
    if (!list || list.length === 0) return
    const incoming = Array.from(list)
    setFiles((prev) => [...prev, ...incoming].slice(0, 10))
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  async function submit() {
    setError(null)
    if (files.length === 0) {
      setError('Add at least one file')
      return
    }
    setBusy(true)

    const fd = new FormData()
    for (const f of files) fd.append('files', f)
    if (assumeYear) fd.append('assumeYear', assumeYear)

    const { ok, data, error: err } = await fetchJson<{ batchId: string }>('/api/extract', {
      method: 'POST',
      body: fd,
    })
    if (!ok || !data?.batchId) {
      setError(err ?? 'Extraction failed')
      setBusy(false)
      return
    }
    router.push(`/capture/${data.batchId}`)
  }

  return (
    <div className="ios-card p-5 space-y-5">
      {busy ? (
        <div className="flex flex-col items-center gap-3 py-6">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: '#0a84ff' }} />
          <p className="text-[14px]" style={{ color: 'rgba(235,235,245,0.7)' }}>
            Extracting transactions… PDFs with lots of pages can take a minute.
          </p>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => pickerRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-medium border-2 border-dashed"
            style={{
              background: 'rgba(10,132,255,0.06)',
              color: '#0a84ff',
              borderColor: 'rgba(10,132,255,0.35)',
            }}
          >
            <Upload className="h-4 w-4" />
            Choose PDF or CSV files
          </button>
          <input
            ref={pickerRef}
            type="file"
            accept=".pdf,.csv,application/pdf,text/csv"
            multiple
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />

          {files.length > 0 && (
            <div className="space-y-2">
              <p
                className="text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: 'rgba(235,235,245,0.45)' }}
              >
                {files.length} file{files.length === 1 ? '' : 's'} ready
              </p>
              <div className="space-y-1">
                {files.map((f, i) => (
                  <FileRow key={`${f.name}-${i}`} file={f} onRemove={() => removeFile(i)} />
                ))}
              </div>
            </div>
          )}

          <label className="block">
            <span
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: 'rgba(235,235,245,0.45)' }}
            >
              Year (if unclear)
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={assumeYear}
              onChange={(e) => setAssumeYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className="mt-1 w-full bg-transparent text-[15px] outline-none text-white border-b border-[rgba(84,84,88,0.5)] py-1"
            />
          </label>

          {error && <p className="text-[14px]" style={{ color: '#ff453a' }}>{error}</p>}

          <button
            type="button"
            onClick={submit}
            disabled={files.length === 0}
            className="w-full rounded-xl py-3 text-[17px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: '#0a84ff', color: '#fff' }}
          >
            Extract transactions
          </button>
        </>
      )}
    </div>
  )
}

function FileRow({ file, onRemove }: { file: File; onRemove: () => void }) {
  const sizeKb = Math.round(file.size / 1024)
  const sizeDisplay = sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`
  const kind = file.name.toLowerCase().endsWith('.csv') ? 'CSV' : 'PDF'
  return (
    <div
      className="flex items-center gap-3 px-3 py-2 rounded-lg"
      style={{ background: 'rgba(120,120,128,0.1)' }}
    >
      <FileText className="h-5 w-5 shrink-0" style={{ color: 'rgba(235,235,245,0.55)' }} />
      <div className="flex-1 min-w-0">
        <p className="text-[14px] text-white truncate">{file.name}</p>
        <p className="text-[11px]" style={{ color: 'rgba(235,235,245,0.45)' }}>
          {kind} · {sizeDisplay}
        </p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
        style={{ background: 'rgba(120,120,128,0.2)', color: 'rgba(235,235,245,0.65)' }}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
