'use client'
import { useEffect, useState } from 'react'
import { CheckCircle } from 'lucide-react'

interface ToastProps {
  message: string
  onDone: () => void
  duration?: number
}

export function Toast({ message, onDone, duration = 3000 }: ToastProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Trigger enter animation next frame
    const enterTimer = requestAnimationFrame(() => setVisible(true))

    const exitTimer = setTimeout(() => {
      setVisible(false)
      setTimeout(onDone, 300) // wait for fade-out before removing
    }, duration)

    return () => {
      cancelAnimationFrame(enterTimer)
      clearTimeout(exitTimer)
    }
  }, [duration, onDone])

  return (
    <div
      className="fixed top-4 left-1/2 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-2xl text-[14px] font-medium shadow-lg"
      style={{
        transform: `translateX(-50%) translateY(${visible ? '0' : '-12px'})`,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.25s ease, transform 0.25s ease',
        background: 'rgba(30,30,32,0.92)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '0.5px solid rgba(84,84,88,0.5)',
        color: '#fff',
        maxWidth: 'calc(100vw - 32px)',
        whiteSpace: 'nowrap',
      }}
    >
      <CheckCircle className="h-4 w-4 shrink-0" style={{ color: '#30d158' }} />
      {message}
    </div>
  )
}
