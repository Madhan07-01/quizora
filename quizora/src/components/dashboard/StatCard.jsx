import { memo, useEffect } from 'react'
import { motion, useAnimation, useInView } from 'framer-motion'

const spring = { type: 'spring', stiffness: 80, damping: 12 }

function StatCard({ title, value = 0, suffix = '', icon: Icon }) {
  const controls = useAnimation()
  const ref = useInView({ amount: 0.3, once: true })

  useEffect(() => {
    if (ref) controls.start('visible')
  }, [ref, controls])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={controls}
      variants={{ visible: { opacity: 1, y: 0, transition: spring } }}
      className="rounded-2xl border border-violet-400/20 bg-white/10 p-4 text-white shadow-[0_0_15px_rgba(139,92,246,0.25)] backdrop-blur-lg ring-1 ring-white/10"
    >
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500/80 to-fuchsia-500/80 text-white shadow-[0_0_10px_rgba(99,102,241,0.6)]">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div>
          <div className="text-xs uppercase tracking-wider text-gray-200/80">{title}</div>
          <AnimatedNumber value={value} suffix={suffix} />
        </div>
      </div>
    </motion.div>
  )
}

function AnimatedNumber({ value, suffix }) {
  // Lightweight count-up using Framer Motion
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      className="block text-2xl font-extrabold"
    >
      {value}{suffix}
    </motion.span>
  )
}

export default memo(StatCard)
