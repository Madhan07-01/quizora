import { Link } from 'react-router-dom'
import Button from '../components/Button'
import { motion } from 'framer-motion'

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.6, delay: 0.12 * i, ease: [0.22, 1, 0.36, 1] } })
}

export default function Landing() {
  return (
    <div className="relative bg-[linear-gradient(135deg,#0f172a,_#1e1b4b)]">
      {/* Decorative soft gradients */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-[-10%] h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-brand-primary/30 blur-3xl"></div>
        <div className="absolute right-[-10%] top-1/3 h-[28rem] w-[28rem] rounded-full bg-brand-violet/30 blur-3xl"></div>
        <div className="absolute inset-0 backdrop-blur-[2px]"></div>
      </div>

      {/* Hero section */}
      <section className="container-page py-16 sm:py-20 lg:py-28">
        <motion.div
          initial="hidden"
          animate="visible"
          className="mx-auto max-w-3xl text-center"
        >
          <motion.h1 custom={0} variants={fadeUp} className="text-balance text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Challenge. Learn. Level Up.
          </motion.h1>
          <motion.p custom={1} variants={fadeUp} className="mt-4 text-pretty text-base text-gray-200/90 sm:text-lg">
            Join Quizora – where quizzes meet gamification. Create, play, and compete to become a master of knowledge!
          </motion.p>
          <motion.div custom={2} variants={fadeUp} className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
              <Link to="/join" className="btn-primary">Join a Quiz</Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
              <Link to="/create" className="btn-outline">Create a Quiz</Link>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Glass hero card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mt-12 max-w-5xl rounded-2xl border border-white/30 bg-white/20 p-6 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-white/5"
        >
          <div className="grid items-center gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/50 px-3 py-1 text-xs font-medium text-gray-700 ring-1 ring-white/40 backdrop-blur-sm dark:bg-white/10 dark:text-gray-200">
                <span className="h-2 w-2 rounded-full bg-brand-primary"></span> Real-time engagement
              </div>
              <h3 className="text-xl font-semibold text-white">Quizora brings luxury-grade UX to learning</h3>
              <p className="text-sm text-gray-200/90">Experience buttery-smooth interactions, glassmorphism surfaces, and elegant gradients powered by modern web tech.</p>
            </div>
            <div className="rounded-xl border border-white/30 bg-gradient-to-tr from-brand-primary/20 to-brand-violet/20 p-4 shadow-inner backdrop-blur-xl dark:border-white/10">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['Live Quizzes', 'Answer together in real-time'],
                  ['Leaderboards', 'Compete with friends'],
                  ['Smart Insights', 'Track strengths & gaps'],
                  ['Beautiful UI', 'Elevated learning experience'],
                ].map(([title, desc]) => (
                  <div key={title} className="rounded-lg border border-white/40 bg-white/40 p-3 shadow-sm transition hover:shadow-glow dark:border-white/10 dark:bg-white/10">
                    <div className="text-xs font-semibold">{title}</div>
                    <div className="text-[11px] text-gray-600 dark:text-gray-300">{desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section id="features" className="container-page pb-16">
        <div className="mx-auto mb-8 max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">Everything you need to shine</h2>
          <p className="mt-2 text-sm text-gray-200/90">Create, join, and track progress with stunning clarity.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, delay: 0.06 * i, ease: [0.22, 1, 0.36, 1] }}
              className="group rounded-2xl border border-white/30 bg-white/20 p-6 shadow-lg ring-1 ring-white/40 backdrop-blur-xl transition hover:shadow-glow"
            >
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-primary to-brand-violet text-white shadow-sm">
                {f.icon}
              </div>
              <h3 className="text-lg font-semibold text-white">{f.title}</h3>
              <p className="mt-1 text-sm text-gray-200/90">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  )
}

const features = [
  {
    title: 'Gamified Learning',
    desc: 'Earn XP and badges as you play.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M12 2 9 8l-7 .5 5.3 4.1L6 20l6-3.2L18 20l-1.3-7.4L22 8.5 15 8z" />
      </svg>
    ),
  },
  {
    title: 'Play with Friends',
    desc: 'Join sessions or host your own.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M16 11a4 4 0 1 1 4 4h-4v-4ZM10 7a4 4 0 1 1-4 4H2V7h8Z" />
      </svg>
    ),
  },
  {
    title: 'Track Progress',
    desc: 'View leaderboard and improve over time.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M4 3h2v18H4zm7 6h2v12h-2zM20 13h-2v8h2z" />
      </svg>
    ),
  },
]
