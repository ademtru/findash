'use client'
import { useState, useRef, useCallback } from 'react'
import { CloudUpload, CheckCircle, AlertCircle, X } from 'lucide-react'

interface UploadResult {
  added: number
  duplicates: number
  total: number
}

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [result, setResult] = useState<UploadResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const f = e.dataTransfer.files[0]
    if (f?.name.endsWith('.json')) setFile(f)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => setIsDragging(false), [])

  async function handleUpload() {
    if (!file) return
    setStatus('uploading')
    setError(null)
    setResult(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/transactions/upload', { method: 'POST', body: formData })
      const data = await res.json() as UploadResult & { error?: string }
      if (!res.ok) {
        setStatus('error')
        setError(data.error ?? 'Upload failed')
      } else {
        setStatus('success')
        setResult(data)
      }
    } catch {
      setStatus('error')
      setError('Network error — please try again')
    }
  }

  function reset() {
    setFile(null)
    setStatus('idle')
    setResult(null)
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="px-4 py-5 md:px-6 md:py-6 space-y-5 max-w-lg mx-auto">
      <h1 className="text-[28px] font-bold text-white tracking-tight">Upload Data</h1>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => status === 'idle' && inputRef.current?.click()}
        className="ios-card p-10 flex flex-col items-center gap-4 transition-all duration-200 border-2 border-dashed"
        style={{
          cursor: status === 'idle' ? 'pointer' : 'default',
          borderColor: isDragging ? '#0a84ff' : 'rgba(84,84,88,0.5)',
          background: isDragging ? 'rgba(10,132,255,0.06)' : '#1c1c1e',
        }}
      >
        <CloudUpload
          className="h-10 w-10 transition-colors"
          style={{ color: isDragging ? '#0a84ff' : 'rgba(235,235,245,0.25)' }}
        />
        <div className="text-center">
          <p className="text-[15px] font-medium text-white">
            {file ? file.name : 'Drop transactions.json here'}
          </p>
          <p className="text-[13px] mt-1" style={{ color: 'rgba(235,235,245,0.4)' }}>
            {file ? `${(file.size / 1024).toFixed(1)} KB` : 'or tap to browse'}
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) { setFile(f); setStatus('idle') } }}
        />
      </div>

      {/* Upload button */}
      {file && status === 'idle' && (
        <div className="flex gap-2.5">
          <button
            onClick={handleUpload}
            className="flex-1 py-3.5 rounded-[14px] text-[16px] font-semibold text-white cursor-pointer transition-all active:scale-[0.98]"
            style={{ background: '#0a84ff' }}
          >
            Upload &amp; Merge
          </button>
          <button
            onClick={reset}
            className="px-4 py-3.5 rounded-[14px] cursor-pointer transition-colors active:opacity-60"
            style={{ background: 'rgba(120,120,128,0.24)', color: 'rgba(235,235,245,0.6)' }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Loading */}
      {status === 'uploading' && (
        <div className="ios-card p-6 flex items-center justify-center gap-3">
          <div
            className="animate-spin rounded-full h-5 w-5 border-2 border-t-transparent"
            style={{ borderColor: '#0a84ff', borderTopColor: 'transparent' }}
          />
          <span className="text-[14px]" style={{ color: 'rgba(235,235,245,0.6)' }}>
            Merging transactions…
          </span>
        </div>
      )}

      {/* Success */}
      {status === 'success' && result && (
        <div className="ios-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" style={{ color: '#30d158' }} />
            <span className="font-semibold text-[15px]" style={{ color: '#30d158' }}>
              Upload successful
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: 'Added',   value: result.added,      color: '#30d158' },
              { label: 'Skipped', value: result.duplicates, color: 'rgba(235,235,245,0.4)' },
              { label: 'Total',   value: result.total,      color: '#ffffff' },
            ].map(({ label, value, color }) => (
              <div key={label} className="ios-card-elevated rounded-xl p-3">
                <p className="text-[24px] font-bold tabular-nums" style={{ color }}>{value}</p>
                <p className="text-[11px] mt-1 uppercase tracking-wide" style={{ color: 'rgba(235,235,245,0.4)' }}>
                  {label}
                </p>
              </div>
            ))}
          </div>
          <button
            onClick={reset}
            className="w-full text-[14px] pt-1 cursor-pointer"
            style={{ color: 'rgba(235,235,245,0.4)' }}
          >
            Upload another file
          </button>
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div className="ios-card p-5 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" style={{ color: '#ff453a' }} />
          <div>
            <p className="text-[14px] font-semibold" style={{ color: '#ff453a' }}>Upload failed</p>
            <p className="text-[13px] mt-1" style={{ color: 'rgba(235,235,245,0.5)' }}>{error}</p>
            <button
              onClick={() => setStatus('idle')}
              className="text-[13px] mt-3 cursor-pointer"
              style={{ color: '#0a84ff' }}
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="ios-card p-5 space-y-2">
        <p className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'rgba(235,235,245,0.4)' }}>
          How it works
        </p>
        <ul className="space-y-1.5 text-[13px]" style={{ color: 'rgba(235,235,245,0.55)' }}>
          <li>• Upload a JSON file with new transactions</li>
          <li>• Duplicates (matching <code style={{ color: '#0a84ff' }}>id</code>) are automatically skipped</li>
          <li>• New transactions are appended to existing data</li>
          <li>• Accepts <code style={{ color: '#0a84ff' }}>{`{ transactions: [...] }`}</code> or a bare array</li>
        </ul>
      </div>
    </div>
  )
}
