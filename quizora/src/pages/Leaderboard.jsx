import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import useAuth from '../hooks/useAuth'
import { db } from '../lib/firebase'
import { collection, onSnapshot, orderBy, limit, query } from 'firebase/firestore'

export default function Leaderboard() {
  const { user } = useAuth()
  const [rows, setRows] = useState([])
  useEffect(() => {
    if (!user) {
      setRows([])
      return () => {}
    }
    const ref = collection(db, 'users')
    const q = query(ref, orderBy('totalXp', 'desc'), limit(50))
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ uid: d.id, ...(d.data() || {}) }))
      setRows(list)
    })
    return () => unsub()
  }, [user?.uid])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-white/15 bg-white/10 p-6 shadow-lg backdrop-blur-sm">
        <h1 className="text-2xl font-bold text-white">Leaderboard</h1>
        <p className="text-sm text-gray-200/90">Top users by XP and badges</p>
      </div>

      {/* Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {!user ? (
          <div className="rounded-2xl border border-white/15 bg-white/10 p-4 text-white/80">Sign in to view the global leaderboard.</div>
        ) : (
          rows.map((r, i) => (
            <motion.div
              key={(r.uid || i) + (r.name || '')}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: 0.03 * i }}
              className={`flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 shadow-md backdrop-blur-sm ${user && r.uid === user.uid ? 'ring-1 ring-white/25' : ''}`}
            >
              <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-tr from-indigo-500 to-fuchsia-500 text-white text-sm font-bold">
                {i + 1}
              </div>
              <img src={r.photoURL || `https://api.dicebear.com/8.x/identicon/svg?seed=${encodeURIComponent(r.name || r.uid || 'user')}`} alt="avatar" className="h-10 w-10 rounded-full border border-white/20 object-cover" />
              <div className="min-w-0">
                <div className="truncate text-white font-semibold">{r.name || 'Anonymous'}</div>
                <div className="text-xs text-white/80">Badges: {r.badgesCount ?? 0}</div>
              </div>
              <div className="ml-auto text-right">
                <div className="text-white font-semibold">{r.totalXp ?? r.xp ?? 0} XP</div>
                <div className="text-xs text-white/70">Rank #{i + 1}</div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      <div>
        <Link to="/dashboard" className="btn-outline">Back to Dashboard</Link>
      </div>
    </div>
  )
}
