'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock } from 'lucide-react'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (res.ok) {
      router.push('/')
    } else {
      setError('Incorrect password')
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: '#000' }}
    >
      {/* App icon */}
      <div
        className="w-[76px] h-[76px] rounded-[18px] flex items-center justify-center mb-5 select-none"
        style={{
          background: 'linear-gradient(145deg, #0a84ff, #bf5af2)',
          boxShadow: '0 8px 32px rgba(10,132,255,0.35)',
        }}
      >
        <span className="text-white font-bold text-[34px] leading-none">F</span>
      </div>

      {/* Title */}
      <h1 className="text-[28px] font-bold text-white mb-1">Findash</h1>
      <p className="text-[14px] mb-10" style={{ color: 'rgba(235,235,245,0.5)' }}>
        Your personal finance dashboard
      </p>

      {/* Form card */}
      <div className="w-full max-w-[340px] space-y-3">
        <div className="relative">
          <Lock
            className="absolute left-4 top-1/2 -translate-y-1/2 h-[15px] w-[15px]"
            style={{ color: 'rgba(235,235,245,0.35)' }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoFocus
            className="w-full rounded-[14px] pl-11 pr-4 py-[14px] text-[16px] text-white outline-none transition-all"
            style={{
              background: 'rgba(120,120,128,0.24)',
              caretColor: '#0a84ff',
            }}
            onFocus={e => (e.currentTarget.style.outline = '2px solid rgba(10,132,255,0.6)')}
            onBlur={e => (e.currentTarget.style.outline = 'none')}
          />
        </div>

        {error && (
          <p className="text-[13px] text-center" style={{ color: '#ff453a' }}>
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || !password}
          className="w-full py-[14px] rounded-[14px] text-[16px] font-semibold text-white transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
          style={{
            background: loading || !password ? 'rgba(10,132,255,0.5)' : '#0a84ff',
          }}
        >
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </div>
    </div>
  )
}
