import { motion } from 'framer-motion'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { API } from '../lib/api'
import { db } from '../lib/firebase'
import { collection, onSnapshot } from 'firebase/firestore'

export default function Results() {
  const navigate = useNavigate()
  const { roomCode } = useParams()
  const location = useLocation()

  const passed = location.state?.result || null
  const name = location.state?.name || ''
  const myName = useMemo(() => {
    if (name) return name
    try { return localStorage.getItem(`room:${roomCode}`) || '' } catch { return '' }
  }, [name, roomCode])
  const [results, setResults] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    if (!passed && roomCode) {
      ;(async () => {
        try {
          const list = await API.results(roomCode)
          if (!active) return
          setResults(list)
        } catch (e) {
          setError(e.message)
        }
      })()
    }
    // Realtime Firestore subscription to leaderboard entries
    let unsub = null
    if (roomCode) {
      try {
        const col = collection(db, 'leaderboards', roomCode, 'entries')
        unsub = onSnapshot(col, (snap) => {
          if (!active) return
          const items = snap.docs.map(d => ({ id: d.id, ...(d.data()||{}) }))
          // Sort score desc, duration asc and compute ranks
          items.sort((a,b) => (b.score||0) - (a.score||0) || (a.durationSeconds||0) - (b.durationSeconds||0))
          let last = { score: null, dur: null, rank: 0 }
          const ranked = items.map((it, idx) => {
            if (it.score !== last.score || it.durationSeconds !== last.dur) {
              last.rank = idx + 1
              last.score = it.score
              last.dur = it.durationSeconds
            }
            return {
              participantName: it.name || it.id,
              totalScore: it.score||0,
              totalCorrect: undefined,
              totalQuestions: undefined,
              durationSeconds: it.durationSeconds||0,
              rank: last.rank,
            }
          })
          // Prefer realtime rows when available; fallback to API otherwise
          if (ranked.length) setResults(ranked)
        })
      } catch {}
    }
    return () => { active = false; if (unsub) unsub() }
  }, [roomCode, passed])

  const latest = useMemo(() => {
    if (passed) return passed
    if (!results?.length) return null
    if (name) {
      const mine = results.find(r => r.participantName === name)
      if (mine) return mine
    }
    return results[0]
  }, [passed, results, name])

  if (error) {
    return <div className="rounded-2xl border border-white/20 bg-white/30 p-4 text-white">{error}</div>
  }

  if (!latest) {
    return <div className="rounded-2xl border border-white/20 bg-white/30 p-4 text-white">Loading results...</div>
  }

  const summary = [
    ['Total Score', String(latest.totalScore ?? 0)],
    ['Correct Answers', String(latest.totalCorrect ?? 0)],
    ['Wrong Answers', String((latest.totalQuestions ?? 0) - (latest.totalCorrect ?? 0))],
    ['Time (s)', String(latest.durationSeconds ?? 0)],
  ]

  return (
    <div className="relative">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        {Array.from({ length: 40 }).map((_, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: i * 0.02 }}
            className="absolute h-2 w-2 rounded-sm"
            style={{
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
              background: i % 3 === 0 ? '#6366f1' : i % 3 === 1 ? '#8b5cf6' : '#22c55e',
              filter: 'blur(0.2px)'
            }}
          />
        ))}
      </div>

      <div className="rounded-2xl border border-white/15 bg-white/10 p-6 text-center shadow-lg backdrop-blur-sm">
        <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-2xl font-bold text-white">
          Quiz Results
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="mt-1 text-sm text-gray-200/90">
          {name ? `Good job, ${name}!` : 'Great work! Here’s how you performed.'}
        </motion.p>
        <div className="mt-6 grid gap-3 md:grid-cols-4">
          {summary.map(([t, v], i) => (
            <motion.div key={t} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.05 * i }} className="rounded-xl border border-white/15 bg-white/10 p-4 text-sm text-white">
              <div className="opacity-80">{t}</div>
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 280, damping: 18, delay: 0.05 * i + 0.05 }} className="mt-1 text-lg font-semibold">
                {v}
              </motion.div>
            </motion.div>
          ))}
        </div>

        <div className="mt-8 text-left">
          <div className="mb-2 text-sm font-semibold text-white">Leaderboard (by score, tiebreaker: fastest)</div>
          <div className="overflow-hidden rounded-xl border border-white/15 bg-white/10">
            <table className="min-w-full text-sm text-white/90">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">Score</th>
                  <th className="px-3 py-2 text-left">Correct</th>
                  <th className="px-3 py-2 text-left">Time (s)</th>
                </tr>
              </thead>
              <tbody>
                {(results?.length ? results : [latest]).map((r, i) => {
                  const rank = r.rank ?? (i + 1)
                  const corr = (r.totalCorrect ?? '-')
                  const tot = (r.totalQuestions ?? '-')
                  const isMe = (r.participantName ?? name) === myName && myName
                  return (
                    <tr
                      key={r.id ?? (r.participantName || i)}
                      className={(isMe ? 'bg-white/15 ring-1 ring-white/25 ' : '') + 'odd:bg-white/0 even:bg-white/5 backdrop-blur-sm'}
                    >
                      <td className="px-3 py-2">{rank}</td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-2">
                          {r.participantName ?? name}
                          {isMe ? (
                            <span className="rounded-full border border-white/30 bg-white/20 px-2 py-[2px] text-[10px] text-white/90">You</span>
                          ) : null}
                        </span>
                      </td>
                      <td className="px-3 py-2">{r.totalScore}</td>
                      <td className="px-3 py-2">{corr}/{tot}</td>
                      <td className="px-3 py-2">{r.durationSeconds}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button onClick={() => navigate(`/leaderboard/${roomCode || ''}`)} className="btn-outline">View Leaderboard</button>
          <button onClick={() => navigate('/join')} className="btn-primary">Try Another Quiz</button>
        </div>
      </div>
    </div>
  )
}
