import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { apiFetch } from '../services/api'
import { db } from '../lib/firebase'
import { collection, onSnapshot } from 'firebase/firestore'

function secsToMMSS(secs) {
  const s = Math.max(0, Number(secs) || 0)
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2,'0')}:${String(r).padStart(2,'0')}`
}

export default function RoomLeaderboard() {
  const { roomCode } = useParams()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  function getCookie(name) {
    try {
      const m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[.$?*|{}()\[\]\\\/\+^]/g, '\\$&') + '=([^;]*)'))
      return m ? decodeURIComponent(m[1]) : ''
    } catch { return '' }
  }
  const myName = (() => {
    try {
      const ls = localStorage.getItem(`room:${roomCode}`) || ''
      if (ls) return ls
      return getCookie(`quizora_room_${roomCode}`)
    } catch { return getCookie(`quizora_room_${roomCode}`) }
  })()

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        setError('')
        const data = await apiFetch(`/quizzes/${roomCode}/leaderboard`, { method: 'GET' })
        if (!cancelled) setRows(Array.isArray(data) ? data : [])
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Failed to load leaderboard')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    // Realtime Firestore subscription (backend mirrors entries)
    let unsub = null
    try {
      const col = collection(db, 'leaderboards', roomCode, 'entries')
      unsub = onSnapshot(col, (snap) => {
        if (cancelled) return
        const items = snap.docs.map(d => ({ id: d.id, ...(d.data()||{}) }))
        // Sort client-side: score desc, duration asc
        items.sort((a,b) => (b.score||0) - (a.score||0) || (a.durationSeconds||0) - (b.durationSeconds||0))
        // Assign rank with ties handled
        let last = { score: null, dur: null, rank: 0 }
        const ranked = items.map((it, idx) => {
          if (it.score !== last.score || it.durationSeconds !== last.dur) {
            last.rank = idx + 1
            last.score = it.score
            last.dur = it.durationSeconds
          }
          return { name: it.name || it.id, score: it.score||0, durationSeconds: it.durationSeconds||0, rank: last.rank }
        })
        setRows(ranked)
      })
    } catch {}
    return () => { cancelled = true; if (unsub) unsub() }
  }, [roomCode])

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/20 bg-white/30 p-6 shadow-lg backdrop-blur-xl">
        <h1 className="text-2xl font-bold text-white">Leaderboard</h1>
        <p className="text-sm text-gray-200/90">Rankings for room <span className="font-mono">{roomCode}</span></p>
      </div>

      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border border-red-300/30 bg-red-500/20 p-3 text-sm text-red-100">
          {error}
        </motion.div>
      )}

      <div className="overflow-hidden rounded-2xl border border-white/20 bg-white/10 shadow-lg backdrop-blur-xl">
        <div className="bg-gradient-to-r from-brand-primary/30 to-brand-violet/30 p-4 text-sm font-semibold text-white">Top Rankings</div>
        <div className="divide-y divide-white/10">
          {loading && (
            <div className="p-6 text-center text-gray-200">Loading...</div>
          )}
          {!loading && rows.length === 0 && (
            <div className="p-6 text-center text-gray-200">No submissions yet.</div>
          )}
          {!loading && rows.map((r, i) => (
            <motion.div
              key={(r.name || 'user') + '-' + i}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: 0.04 * i }}
              className={(r.name === myName && myName ? 'bg-white/20 ring-1 ring-white/30 ' : '') + 'flex items-center justify-between px-4 py-3 backdrop-blur-xl'}
            >
              <div className="flex items-center gap-3">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-white/20 text-white">{r.rank}</div>
                <div className="text-white flex items-center gap-2">
                  {r.name || 'Anonymous'}
                  {r.name === myName && myName ? (
                    <span className="rounded-full border border-white/30 bg-white/20 px-2 py-[2px] text-[10px] text-white/90">You</span>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-white"><span className="text-xs text-gray-200/80">Score</span> <span className="ml-1 font-semibold">{r.score}</span></div>
                <div className="text-white"><span className="text-xs text-gray-200/80">Time</span> <span className="ml-1 font-semibold">{secsToMMSS(r.durationSeconds)}</span></div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <Link to={`/results/${roomCode}`} className="btn-outline">Back to Results</Link>
        <Link to="/dashboard" className="btn-outline">Dashboard</Link>
      </div>
    </div>
  )
}
