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
    <div className="p-4 md:p-6 space-y-6 max-w-lg mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Upload Data</h1>
        <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest">Update transactions from anywhere</p>
      </div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => status === 'idle' && inputRef.current?.click()}
        className={`glass rounded-2xl p-10 border-2 border-dashed flex flex-col items-center gap-4 transition-all duration-200 ${
          status === 'idle' ? 'cursor-pointer' : 'cursor-default'
        } ${
          isDragging
            ? 'border-cyan-500/50 bg-cyan-500/5'
            : 'border-white/10 hover:border-white/20'
        }`}
      >
        <CloudUpload className={`h-10 w-10 transition-colors ${isDragging ? 'text-cyan-400' : 'text-slate-600'}`} />
        <div className="text-center">
          <p className="text-sm text-slate-300 font-medium">
            {file ? file.name : 'Drop transactions.json here'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {file ? `${(file.size / 1024).toFixed(1)} KB selected` : 'or tap to browse'}
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

      {/* Actions */}
      {file && status === 'idle' && (
        <div className="flex gap-3">
          <button
            onClick={handleUpload}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 cursor-pointer hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)' }}
          >
            Upload &amp; Merge
          </button>
          <button
            onClick={reset}
            className="px-4 py-3 rounded-xl text-sm text-slate-500 hover:text-slate-300 glass transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Loading */}
      {status === 'uploading' && (
        <div className="glass rounded-2xl p-6 flex items-center justify-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-cyan-500 border-t-transparent" />
          <span className="text-sm text-slate-400">Merging transactions…</span>
        </div>
      )}

      {/* Success */}
      {status === 'success' && result && (
        <div className="glass rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle className="h-5 w-5" />
            <span className="font-semibold text-sm">Upload successful</span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="glass rounded-xl p-3">
              <p className="text-2xl font-bold text-emerald-400">{result.added}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Added</p>
            </div>
            <div className="glass rounded-xl p-3">
              <p className="text-2xl font-bold text-slate-500">{result.duplicates}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Skipped</p>
            </div>
            <div className="glass rounded-xl p-3">
              <p className="text-2xl font-bold text-white">{result.total}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Total</p>
            </div>
          </div>
          <button
            onClick={reset}
            className="w-full text-sm text-slate-500 hover:text-slate-300 transition-colors cursor-pointer pt-2"
          >
            Upload another file
          </button>
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div className="glass rounded-2xl p-5 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-400">Upload failed</p>
            <p className="text-xs text-slate-400 mt-1">{error}</p>
            <button
              onClick={() => setStatus('idle')}
              className="text-xs text-slate-500 hover:text-slate-300 mt-3 cursor-pointer"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="glass rounded-2xl p-5 space-y-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">How it works</p>
        <ul className="space-y-1.5 text-xs text-slate-400">
          <li>• Upload a JSON file containing new transactions</li>
          <li>• Duplicates (matching <code className="text-cyan-400">id</code>) are automatically skipped</li>
          <li>• New transactions are appended to existing data</li>
          <li>• Accepts <code className="text-cyan-400">{`{ transactions: [...] }`}</code> or a bare array</li>
        </ul>
      </div>
    </div>
  )
}
