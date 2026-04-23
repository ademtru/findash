'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, ImagePlus, Loader2, X } from 'lucide-react'
import { fetchJson } from '@/lib/fetch-json'

export function CaptureUploader() {
  const router = useRouter()
  const [files, setFiles] = useState<File[]>([])
  const [assumeYear, setAssumeYear] = useState(String(new Date().getFullYear()))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const libraryRef = useRef<HTMLInputElement>(null)

  function addFiles(list: FileList | null) {
    if (!list || list.length === 0) return
    const incoming = Array.from(list)
    setFiles((prev) => {
      const combined = [...prev, ...incoming]
      return combined.slice(0, 10)
    })
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  async function submit() {
    setError(null)
    if (files.length === 0) {
      setError('Add at least one screenshot')
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
            Extracting transactions… this can take 10–30 seconds.
          </p>
        </div>
      ) : (
        <>
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

          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />
          <input
            ref={libraryRef}
            type="file"
            accept="image/*"
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
              <div className="grid grid-cols-3 gap-2">
                {files.map((f, i) => (
                  <FilePreview key={`${f.name}-${i}`} file={f} onRemove={() => removeFile(i)} />
                ))}
              </div>
            </div>
          )}

          <label className="block">
            <span
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: 'rgba(235,235,245,0.45)' }}
            >
              Year (if not shown)
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

function FilePreview({ file, onRemove }: { file: File; onRemove: () => void }) {
  const [url, setUrl] = useState<string | null>(null)
  if (typeof window !== 'undefined' && !url) {
    setUrl(URL.createObjectURL(file))
  }
  return (
    <div
      className="relative rounded-lg overflow-hidden aspect-square"
      style={{ background: 'rgba(120,120,128,0.12)' }}
    >
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={file.name} className="w-full h-full object-cover" />
      )}
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.65)', color: '#fff' }}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
