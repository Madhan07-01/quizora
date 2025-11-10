import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { updateUserProfile, getUserProfile, ensureUserProfile, recomputeStatsFromAwards } from '../services/user'
import { db } from '../lib/firebase'
import { doc, onSnapshot } from 'firebase/firestore'
import useAuth from '../hooks/useAuth'
import { apiFetch } from '../services/api'
import { Link } from 'react-router-dom'

export default function Profile() {
  const { user: authUser } = useAuth()
  const [profile, setProfile] = useState({ name: authUser?.displayName || '', bio: '', level: 1, xp: 0, xpMax: 100 })
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: profile.name, bio: profile.bio })
  const user = profile
  const [created, setCreated] = useState([])
  const [xpSeries, setXpSeries] = useState([])
  const badges = []
  const quizzesPlayed = Number(user.quizzesPlayed ?? 0)
  const totalCorrect = Number(user.totalCorrect ?? 0)
  const totalQuestions = Number(user.totalQuestions ?? 0)
  const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0
  const totalXp = Number((user.totalXp ?? user.xp) || 0)
  const level = Math.max(1, Math.floor(totalXp / 100) + 1)
  const levelProgress = totalXp % 100

  const spring = { type: 'spring', stiffness: 80, damping: 12 }

  useEffect(() => {
    let unsub = null
    ;(async () => {
      try {
        await ensureUserProfile()
        const p = await getUserProfile()
        try { await recomputeStatsFromAwards(authUser?.uid) } catch {}
        setProfile(prev => ({
          ...prev,
          name: p?.name || authUser?.displayName || prev.name || '',
          bio: p?.bio || '',
          xp: p?.xp ?? 0,
          level: p?.level ?? 1,
          xpMax: p?.xpMax ?? 100,
          quizzesPlayed: p?.quizzesPlayed ?? 0,
          quizzesCreated: p?.quizzesCreated ?? 0,
          totalCorrect: p?.totalCorrect ?? 0,
          totalQuestions: p?.totalQuestions ?? 0,
          badgesCount: p?.badgesCount ?? 0,
        }))
        if (authUser?.uid) {
          const ref = doc(db, 'users', authUser.uid)
          unsub = onSnapshot(ref, (snap) => {
            const d = snap.data() || {}
            setProfile(prev => ({
              ...prev,
              name: d?.name || prev.name,
              bio: d?.bio || prev.bio,
              xp: d?.xp ?? prev.xp,
              level: d?.level ?? prev.level,
              xpMax: d?.xpMax ?? prev.xpMax,
              quizzesPlayed: d?.quizzesPlayed ?? prev.quizzesPlayed,
              quizzesCreated: d?.quizzesCreated ?? prev.quizzesCreated,
              totalCorrect: d?.totalCorrect ?? prev.totalCorrect,
              totalQuestions: d?.totalQuestions ?? prev.totalQuestions,
              badgesCount: d?.badgesCount ?? prev.badgesCount,
            }))
          })
        }
      } catch {}
    })()
    return () => { try { if (unsub) unsub() } catch {} }
  }, [authUser?.uid])

  useEffect(() => {
    let unsubAwards = null
    ;(async () => {
      if (!authUser?.uid) return
      try {
        const { collection, onSnapshot, query, orderBy, limit } = await import('firebase/firestore')
        const ref = collection(db, 'users', authUser.uid, 'awards')
        const q = query(ref, orderBy('awardedAt', 'desc'), limit(20))
        unsubAwards = onSnapshot(q, async (snap) => {
          try { await recomputeStatsFromAwards(authUser.uid) } catch {}
          try {
            const rows = snap.docs
              .map(d => ({ id: d.id, ...(d.data()||{}) }))
              .filter(r => typeof r.xp === 'number' || !isNaN(Number(r.xp)))
              .map(r => ({ xp: Number(r.xp)||0, at: r.awardedAt }))
            // Sort ascending by time
            rows.sort((a,b) => String(a.at).localeCompare(String(b.at)))
            // Build cumulative series (limit to last 20 for the mini chart)
            let sum = 0
            const series = rows.map(r => ({ x: r.at, y: (sum += r.xp) }))
            const last20 = series.slice(-20)
            setXpSeries(last20)
          } catch {}
        })
      } catch {}
    })()
    return () => { try { if (unsubAwards) unsubAwards() } catch {} }
  }, [authUser?.uid])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!authUser?.uid) return
      try {
        const rows = await apiFetch(`/quizzes/users/${authUser.uid}/quizzes`)
        if (!cancelled) setCreated(Array.isArray(rows) ? rows : [])
      } catch {}
    })()
    return () => { cancelled = true }
  }, [authUser?.uid])

  function openEdit() {
    setForm({ name: profile.name, bio: profile.bio || '' })
    setEditing(true)
  }
  function saveEdit(e) {
    e?.preventDefault?.()
    ;(async () => {
      const nextName = form.name.trim()
      setProfile(p => ({ ...p, name: nextName || p.name, bio: form.bio }))
      try { await updateUserProfile({ name: nextName, bio: form.bio }) } catch {}
      setEditing(false)
    })()
  }
  function cancelEdit() {
    setEditing(false)
  }

  return (
    <div className="relative">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(1200px_600px_at_10%_-10%,rgba(99,102,241,0.25),transparent),radial-gradient(1000px_600px_at_90%_-20%,rgba(124,58,237,0.28),transparent)]" />
      <div className="absolute inset-0 -z-20 bg-[linear-gradient(135deg,#0f172a,_#1e1b4b_50%,_#312e81)]" />

      <div className="space-y-6">
        {/* Header */}
        <div className="rounded-2xl border border-violet-400/20 bg-white/10 p-6 text-white shadow-[0_0_15px_rgba(139,92,246,0.25)] backdrop-blur-xl ring-1 ring-white/10">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:text-left">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-gradient-to-tr from-indigo-500 to-fuchsia-500 text-xl font-extrabold shadow-[0_0_10px_rgba(99,102,241,0.6)]">
              {user.name[0]}
            </div>
            <div>
              <div className="text-xl font-semibold text-white">{user.name}</div>
              <div className="text-xs text-gray-200/90">Level {user.level}</div>
              <div className="mt-1 text-xs text-gray-200/80">{user.bio}</div>
            </div>
            <div className="ml-auto">
              <motion.button whileHover={{ y: -2, boxShadow: '0 0 18px rgba(139,92,246,0.5)' }} whileTap={{ scale: 0.98 }} onClick={openEdit} className="btn-outline">
                Edit Profile
              </motion.button>
            </div>
          </div>
          <div className="mt-5">
            <div className="mb-1 text-xs text-gray-200/90">XP Progress</div>
            <div className="h-3 w-full rounded-full bg-white/20">
              <motion.div initial={{ width: 0 }} animate={{ width: `${(levelProgress / 100) * 100}%` }} transition={{ duration: 0.8, ease: [0.22,1,0.36,1] }} className="h-3 rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500"></motion.div>
            </div>
            <div className="mt-1 text-xs text-gray-200/90">Level {level} • {levelProgress}/100 XP • Total {totalXp} XP</div>
          </div>
        </div>

        {/* Badges and Stats */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-violet-400/20 bg-white/10 p-6 text-white shadow-[0_0_15px_rgba(139,92,246,0.25)] backdrop-blur-xl ring-1 ring-white/10">
            <h3 className="text-lg font-semibold text-white">Stats</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {[
                ['Total XP', String(totalXp)],
                ['Quizzes Played', String(quizzesPlayed)],
                ['Quizzes Created', String(created.length)],
                ['Accuracy', `${accuracy}%`],
                ['Badges', String(user.badgesCount ?? 0)],
              ].map(([t, v], i) => (
                <motion.div key={t} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: 0.05 * i }} className="rounded-xl border border-violet-400/20 bg-white/10 p-4 text-sm text-white ring-1 ring-white/10">
                  <div className="opacity-80">{t}</div>
                  <div className="mt-1 text-lg font-semibold">{v}</div>
                </motion.div>
              ))}
            </div>
          </div>
          {/* XP over time chart (from awards) */}
          <div className="rounded-2xl border border-violet-400/20 bg-white/10 p-6 text-white shadow-[0_0_15px_rgba(139,92,246,0.25)] backdrop-blur-xl ring-1 ring-white/10">
            <h3 className="text-lg font-semibold text-white">XP Over Time</h3>
            <div className="mt-4">
              <svg viewBox="0 0 320 80" className="h-24 w-full">
                <defs>
                  <linearGradient id="xpGrad" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0.5" />
                  </linearGradient>
                </defs>
                {(() => {
                  const pts = xpSeries
                  const maxY = Math.max(1, ...pts.map(p => p.y))
                  const stepX = pts.length > 1 ? 300 / (pts.length - 1) : 300
                  const path = pts.map((p, i) => {
                    const x = 10 + i * stepX
                    const y = 70 - (p.y / maxY) * 60
                    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
                  }).join(' ')
                  const area = path ? `${path} L 310 70 L 10 70 Z` : ''
                  return (
                    <g>
                      <rect x="10" y="10" width="300" height="60" rx="6" className="fill-transparent stroke-white/15" />
                      {area && <path d={area} fill="url(#xpGrad)" />}
                      {path && <path d={path} className="stroke-white" fill="none" strokeWidth="2" />}
                    </g>
                  )
                })()}
              </svg>
            </div>
          </div>
        </div>

        {/* Removed Past Quizzes dummy section */}

        <div className="rounded-2xl border border-violet-400/20 bg-white/10 p-6 text-white shadow-[0_0_15px_rgba(139,92,246,0.25)] backdrop-blur-xl ring-1 ring-white/10">
          <h3 className="text-lg font-semibold text-white">Created Quizzes</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {created.map((q, i) => (
              <motion.div key={q.id + '-' + q.quizCode} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.35, delay: 0.04 * i }} className="rounded-xl border border-violet-400/20 bg-white/10 p-4 text-sm ring-1 ring-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white font-semibold">{q.title}</div>
                    <div className="text-xs text-gray-200/80">Code: <span className="font-mono">{q.quizCode}</span></div>
                    <div className="text-xs text-gray-200/70">Created: {q.createdAt ? new Date(q.createdAt).toLocaleString() : '-'}</div>
                    <div className="text-xs text-gray-200/70">Participants: {q.participants}</div>
                  </div>
                  <div className="flex gap-2">
                    <Link to={`/leaderboard/${q.quizCode}`} className="btn-outline">Leaderboard</Link>
                    <button className="btn-ghost" onClick={() => navigator.clipboard?.writeText(q.quizCode)}>Copy</button>
                  </div>
                </div>
              </motion.div>
            ))}
            {created.length === 0 && (
              <div className="text-sm text-gray-200/80">You have not created any quizzes yet.</div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {editing && (
          <motion.div className="fixed inset-0 z-40 grid place-items-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={cancelEdit} />
            <motion.form onSubmit={saveEdit} initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }} transition={spring} className="relative z-10 w-full max-w-md rounded-2xl border border-violet-400/20 bg-white/10 p-6 text-white shadow-[0_0_24px_rgba(139,92,246,0.45)] backdrop-blur-xl ring-1 ring-white/10">
              <div className="text-lg font-semibold">Edit Profile</div>
              <div className="mt-4 grid gap-3">
                <input value={form.name} onChange={(e)=>setForm(f=>({ ...f, name: e.target.value }))} placeholder="Name" className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white outline-none ring-2 ring-transparent placeholder:text-gray-300/80 focus:ring-brand-primary/50" />
                <textarea value={form.bio} onChange={(e)=>setForm(f=>({ ...f, bio: e.target.value }))} placeholder="Bio" rows={3} className="w-full resize-none rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white outline-none ring-2 ring-transparent placeholder:text-gray-300/80 focus:ring-brand-primary/50" />
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <motion.button type="button" onClick={cancelEdit} whileHover={{ y: -1 }} className="btn-ghost">Cancel</motion.button>
                <motion.button type="submit" whileHover={{ y: -1, boxShadow: '0 0 18px rgba(139,92,246,0.5)' }} className="btn-primary">Save</motion.button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
