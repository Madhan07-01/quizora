import { memo, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import QuickActionButton from '../components/dashboard/QuickActionButton'
import StatCard from '../components/dashboard/StatCard'
import RecentQuizCard from '../components/dashboard/RecentQuizCard'
import { PlayCircle, PlusCircle, Trophy, UserCircle } from 'lucide-react'
import useAuth from '../hooks/useAuth'
import { getUserProfile, ensureUserProfile } from '../services/user'
import { db } from '../lib/firebase'
import { collection, onSnapshot, orderBy, limit, query } from 'firebase/firestore'
import { apiFetch } from '../services/api'

const spring = { type: 'spring', stiffness: 80, damping: 12 }

function Dashboard() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [recent, setRecent] = useState([])

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        await ensureUserProfile()
        const p = await getUserProfile()
        if (active) setProfile(p)
      } catch {}
    })()
    return () => { active = false }
  }, [user?.uid])

  // Recent Activity: combine last awards (played quizzes) and recently created quizzes
  useEffect(() => {
    if (!user?.uid) return
    let cancelled = false
    const unsubs = []
    ;(async () => {
      try {
        // Awards (quizzes played) from Firestore
        const awardsQ = query(collection(db, 'users', user.uid, 'awards'), orderBy('awardedAt', 'desc'), limit(6))
        unsubs.push(onSnapshot(awardsQ, async (snap) => {
          if (cancelled) return
          const items = await Promise.all(snap.docs.map(async d => {
            const data = d.data() || {}
            const code = data.quizCode || d.id
            let title = code
            try {
              const api = await apiFetch(`/quizzes/code/${encodeURIComponent(code)}`, { method: 'GET', auth: false })
              if (api && api.title) title = api.title
            } catch {}
            return {
              title,
              code,
              date: data.awardedAt || '',
              status: 'played',
              badge: data.badge,
              rank: data.rank,
            }
          }))
          setRecent(prev => {
            const others = (prev || []).filter(x => x.__source !== 'created')
            return [...items.map(x => ({ ...x, __source: 'played' })), ...others].slice(0, 9)
          })
        }))

        // Recently created quizzes from backend
        const created = await apiFetch(`/quizzes/users/${user.uid}/quizzes`, { method: 'GET' })
        if (!cancelled && Array.isArray(created)) {
          const mapped = created.slice(0, 6).map(q => ({
            title: q.title || q.quizCode,
            code: q.quizCode,
            date: q.createdAt || '',
            status: 'created',
            __source: 'created',
          }))
          setRecent(prev => {
            const played = (prev || []).filter(x => x.__source !== 'created')
            return [...played, ...mapped].slice(0, 9)
          })
        }
      } catch {}
    })()
    return () => { cancelled = true; unsubs.forEach(u => { try { u() } catch {} }) }
  }, [user?.uid])

  const displayName = user?.displayName || profile?.name || 'Player'
  const stats = useMemo(() => {
    const played = Number(profile?.quizzesPlayed || 0)
    const xp = Number(profile?.xp || 0)
    const created = Number(profile?.quizzesCreated || 0)
    const totalQ = Number(profile?.totalQuestions || 0)
    const totalC = Number(profile?.totalCorrect || 0)
    const acc = totalQ > 0 ? Math.round((totalC / totalQ) * 100) : 0
    return [
      { title: 'Quizzes Created', value: created },
      { title: 'Total Played', value: played },
      { title: 'Accuracy', value: acc, suffix: '%' },
      { title: 'XP Points', value: xp },
    ]
  }, [profile])
  const recentList = recent

  return (
    <div className="relative min-h-screen w-full text-white">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(1200px_600px_at_10%_-10%,rgba(99,102,241,0.25),transparent),radial-gradient(1000px_600px_at_90%_-20%,rgba(124,58,237,0.28),transparent)]" />
      <div className="absolute inset-0 -z-20 bg-[linear-gradient(135deg,#0f172a,_#1e1b4b_50%,_#312e81)]" />

      <header className="sticky top-0 z-30 border-b border-white/10 bg-white/10 backdrop-blur-xl">
        <div className="container-page flex h-16 items-center justify-between">
          <div className="relative">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} className="text-sm text-gray-200/90">Welcome back,</motion.div>
            <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="text-xl font-extrabold tracking-tight">
              {displayName}!
            </motion.h1>
            <div aria-hidden className="pointer-events-none absolute -inset-x-6 -top-3 h-12 bg-gradient-to-r from-indigo-500/10 via-violet-500/10 to-fuchsia-500/10 blur-2xl" />
          </div>
          <Link to="/join" className="btn-primary hidden sm:inline-flex transition will-change-transform hover:-translate-y-0.5 hover:shadow-[0_0_24px_rgba(139,92,246,0.55)]">Start Playing</Link>
        </div>
      </header>

      <section className="container-page py-6 sm:py-10">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <QuickActionButton to="/join" icon={PlayCircle} label="Join Quiz" />
          <QuickActionButton to="/create" icon={PlusCircle} label="Create Quiz" />
          <QuickActionButton to="/leaderboard" icon={Trophy} label="Leaderboard" />
          <QuickActionButton to="/profile" icon={UserCircle} label="Profile" />
        </motion.div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <StatCard key={s.title} title={s.title} value={s.value} suffix={s.suffix} />
          ))}
        </div>

        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.5, ease: [0.22,1,0.36,1] }} className="mt-8 rounded-2xl border border-violet-400/20 bg-white/10 p-5 shadow-[0_0_15px_rgba(139,92,246,0.25)] backdrop-blur-lg ring-1 ring-white/10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent Activity</h2>
            <Link to="/leaderboard" className="text-sm text-indigo-200 underline-offset-4 hover:underline">View all</Link>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {(recentList || []).map((r) => (
              <RecentQuizCard key={r.code + r.status} title={r.title} code={r.code} date={r.date} status={r.status} badge={r.badge} rank={r.rank} />
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.6 }} className="mt-10 text-center text-sm text-gray-200/80">
          Made with 💜 by Quizora Team
        </motion.div>
      </section>
    </div>
  )
}

export default memo(Dashboard)
