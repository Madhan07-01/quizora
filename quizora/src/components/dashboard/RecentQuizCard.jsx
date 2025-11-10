import { memo } from 'react'
import { motion } from 'framer-motion'

function RecentQuizCard({ title, code, date, status, badge, rank }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ type: 'spring', stiffness: 80, damping: 12 }}
      className="rounded-xl border border-violet-400/20 bg-white/10 p-4 text-white shadow-[0_0_15px_rgba(139,92,246,0.25)] backdrop-blur-lg ring-1 ring-white/10 transition hover:shadow-[0_0_24px_rgba(139,92,246,0.45)] hover:-translate-y-0.5"
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold">{title}</div>
          <div className="text-xs text-gray-200/80">Code: {code}</div>
        </div>
        <div className="flex items-center gap-2">
          {typeof rank !== 'undefined' && (
            <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] text-gray-100 ring-1 ring-white/10">Rank #{rank}</span>
          )}
          {badge && (
            <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] text-gray-100 ring-1 ring-white/10">{badge}</span>
          )}
          <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] uppercase tracking-wider text-gray-100 ring-1 ring-white/10">
            {status}
          </span>
        </div>
      </div>
      <div className="mt-2 text-xs text-gray-300">{date}</div>
    </motion.div>
  )
}

export default memo(RecentQuizCard)
