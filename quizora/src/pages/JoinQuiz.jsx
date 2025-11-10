import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { API } from '../lib/api'
import Button from '../components/Button'
import useAuth from '../hooks/useAuth'

export default function JoinQuiz() {
  const { user } = useAuth()
  const [code, setCode] = useState('')
  const [name, setName] = useState(user?.displayName || '')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    setName(user?.displayName || '')
  }, [user?.displayName])

  async function onSubmit(e) {
    e.preventDefault()
    const room = code.trim().toUpperCase()
    // Derive a sensible participant name. If auto-generated and too generic, append a short suffix for uniqueness.
    const base = (name || user?.displayName || user?.email?.split('@')[0] || 'Player').trim()
    const shortId = (user?.uid ? user.uid.slice(0, 4) : Math.random().toString(36).slice(2, 6)).toUpperCase()
    const derivedName = (/^player$/i.test(base) || base.length < 2) ? `Player-${shortId}` : base
    if (!room) {
      setError('Please enter a Room Code.')
      return
    }
    try {
      setError('')
      await API.joinQuiz(room, derivedName)
      try {
        localStorage.setItem(`room:${room}`, derivedName)
        // cookie fallback (7 days)
        const expires = new Date(Date.now() + 7*24*60*60*1000).toUTCString()
        document.cookie = `quizora_room_${room}=${encodeURIComponent(derivedName)}; expires=${expires}; path=/`;
      } catch {}
      navigate(`/quiz/${room}`, { state: { name: derivedName } })
    } catch (err) {
      setError(err?.message || 'Invalid quiz code or server unavailable.')
    }
  }

  return (
    <div className="flex min-h-[60svh] items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22,1,0.36,1] }}
        className="mx-auto w-full max-w-md rounded-2xl border border-white/30 bg-white/20 p-6 shadow-lg backdrop-blur-xl"
      >
        <h2 className="mb-1 text-center text-xl font-semibold text-white">Join a Quiz Session</h2>
        <p className="mb-4 text-center text-sm text-gray-200/90">Enter your session code and name to participate.</p>
        <form className="space-y-3" onSubmit={onSubmit}>
          <input value={code} onChange={(e)=>setCode(e.target.value)} className="w-full rounded-lg border border-white/30 bg-white/70 px-3 py-2 text-sm outline-none ring-2 ring-transparent transition placeholder:text-gray-500 focus:ring-brand-primary/50 dark:border-white/10 dark:bg-white/10 dark:text-gray-100" placeholder="Room Code" />
          {(!user || !user?.displayName) && (
            <input value={name} onChange={(e)=>setName(e.target.value)} className="w-full rounded-lg border border-white/30 bg-white/70 px-3 py-2 text-sm outline-none ring-2 ring-transparent transition placeholder:text-gray-500 focus:ring-brand-primary/50 dark:border-white/10 dark:bg-white/10 dark:text-gray-100" placeholder="Participant Name" />
          )}
          <Button type="submit" className="w-full">Join Now</Button>
        </form>
        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 rounded-lg border border-red-200/40 bg-red-500/20 px-3 py-2 text-center text-xs text-red-100">
            {error}
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
