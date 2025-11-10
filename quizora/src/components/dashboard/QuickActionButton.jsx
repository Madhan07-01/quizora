import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

function QuickActionButton({ to, icon: Icon, label, onClick }) {
  const content = (
    <motion.div
      whileHover={{ y: -3, scale: 1.02, boxShadow: '0 0 24px rgba(139,92,246,0.55)' }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 280, damping: 18 }}
      className="group relative flex items-center gap-3 rounded-xl border border-violet-400/20 bg-white/10 px-4 py-3 text-white shadow-[0_0_15px_rgba(139,92,246,0.25)] backdrop-blur-lg ring-1 ring-white/10"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-500/80 to-fuchsia-500/80 text-white shadow-[0_0_10px_rgba(99,102,241,0.6)]">
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-sm font-semibold tracking-wide">{label}</div>
      <div aria-hidden className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition group-hover:opacity-100" style={{
        background: 'radial-gradient(600px circle at var(--x,50%) var(--y,50%), rgba(139,92,246,0.20), transparent 40%)'
      }} />
    </motion.div>
  )

  if (to) return <Link to={to} className="block">{content}</Link>
  return (
    <button type="button" onClick={onClick} className="w-full text-left">
      {content}
    </button>
  )
}

export default motion(QuickActionButton)
