'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Zap, Lock } from 'lucide-react'

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
      setError('Invalid password')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative">
      {/* Extra glow for login page */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-96 h-96 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.4) 0%, transparent 70%)' }} />
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)', boxShadow: '0 0 40px rgba(6,182,212,0.3)' }}>
            <Zap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Findash</h1>
          <p className="text-xs text-slate-500 uppercase tracking-widest mt-1">Finance OS</p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-6 glow-cyan">
          <div className="flex items-center gap-2 mb-5">
            <Lock className="w-3.5 h-3.5 text-cyan-400" />
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Secure Access</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoFocus
                className="w-full glass rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none focus:border-cyan-500/50 transition-colors"
              />
            </div>

            {error && (
              <p className="text-xs text-red-400 flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-red-400 inline-block" />
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)', boxShadow: loading ? 'none' : '0 0 30px rgba(6,182,212,0.2)' }}>
              {loading ? 'Authenticating...' : 'Access Dashboard'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
