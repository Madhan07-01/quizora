import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import Button from '../components/Button'
import { apiFetch } from '../services/api'
import { auth } from '../lib/firebase'
import { currentIdToken } from '../services/auth'

export default function Quiz() {
  const { roomCode } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const nameFromState = location.state?.name || ''

  const [quiz, setQuiz] = useState(null)
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState({})
  const [error, setError] = useState('')
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    let t = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const data = await apiFetch(`/quizzes/code/${encodeURIComponent(roomCode)}`, { method: 'GET', auth: false })
        if (!active) return
        setQuiz(data)
      } catch (e) {
        setError(e.message)
      }
    })()
    return () => {
      active = false
    }
  }, [roomCode])

  const total = quiz?.questions?.length || 0
  const current = useMemo(() => (quiz && total > 0 ? quiz.questions[idx] : null), [quiz, idx, total])

  function selectOption(optKey) {
    if (!current) return
    setAnswers((prev) => ({ ...prev, [current.id]: optKey }))
  }

  function next() {
    if (idx < total - 1) setIdx((i) => i + 1)
  }

  async function submit() {
    try {
      const token = await currentIdToken().catch(() => null)
      if (!token) {
        setError('Please sign in to submit your quiz and earn XP/badges.')
        return
      }
      const displayName = auth.currentUser?.displayName || nameFromState || ''
      const payload = Object.entries(answers).map(([questionId, selected]) => ({ questionId: Number(questionId), selected }))
      const res = await apiFetch('/quizzes/submit', {
        method: 'POST',
        auth: true,
        body: { quizCode: roomCode, name: displayName, durationSeconds: elapsed, answers: payload },
      })
      navigate(`/results/${roomCode}`, { state: { result: res, name: displayName, quizCode: roomCode } })
    } catch (e) {
      setError(e.message)
    }
  }

  if (error) {
    return <div className="rounded-2xl border border-white/20 bg-white/30 p-4 text-white">{error}</div>
  }

  if (!quiz) {
    return <div className="rounded-2xl border border-white/20 bg-white/30 p-4 text-white">Loading...</div>
  }

  const qIndex = idx + 1
  const sel = current ? answers[current.id] : null

  return (
    <div className="relative bg-[linear-gradient(135deg,#0f172a,_#1e1b4b)]">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-[-10%] h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-brand-primary/30 blur-3xl"></div>
        <div className="absolute right-[-10%] top-1/3 h-[24rem] w-[24rem] rounded-full bg-brand-violet/30 blur-3xl"></div>
        <div className="absolute inset-0 backdrop-blur-[2px]"></div>
      </div>

      <section className="container-page py-8 sm:py-12">
        <div className="mb-4 rounded-2xl border border-white/30 bg-white/20 p-4 text-white shadow-lg backdrop-blur-xl">
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <div className="text-sm font-semibold tracking-wide text-gray-100/90">Quiz Session</div>
              <div className="mt-1 text-xs text-gray-200/80">
                {roomCode && <span className="mr-3">Room: <span className="font-medium">{roomCode}</span></span>}
                {nameFromState && <span>You: <span className="font-medium">{nameFromState}</span></span>}
              </div>
            </div>
            <div className="w-full sm:w-auto">
              <div className="flex items-center justify-between gap-6 text-right text-xs text-gray-100/90">
                <div>Time: <span className="font-semibold">{elapsed}s</span></div>
                <div>Question <span className="font-semibold">{qIndex}</span>/<span className="opacity-90">{total}</span></div>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-white/20 sm:w-72">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-brand-primary to-brand-violet shadow-inner"
                  style={{ width: `${(qIndex / Math.max(total, 1)) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="rounded-2xl border border-white/30 bg-white/20 p-6 shadow-lg backdrop-blur-xl"
        >
          <h2 className="mb-5 text-balance text-xl font-semibold leading-snug text-white sm:text-2xl">
            {current?.questionText}
          </h2>

          <div className="grid gap-3 sm:gap-4">
            {['A','B','C','D'].map((key) => {
              const label = current?.[`option${key}`]
              if (!label) return null
              const active = sel === key
              return (
                <button
                  key={key}
                  onClick={() => selectOption(key)}
                  className={`group w-full rounded-xl border px-4 py-3 text-left text-[0.95rem] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/70 focus-visible:ring-offset-0 ${
                    active
                      ? 'border-brand-primary/70 bg-white text-gray-900 shadow-sm'
                      : 'border-white/40 bg-white/60 text-white hover:border-brand-primary/60 hover:bg-white/80 hover:text-gray-900'
                  }`}
                >
                  <span className="inline-flex items-center gap-3">
                    <span className={`flex h-6 w-6 items-center justify-center rounded-md text-xs font-semibold ${active ? 'bg-gradient-to-tr from-brand-primary to-brand-violet text-white' : 'bg-white/70 text-gray-700'}`}>
                      {key}
                    </span>
                    <span>{label}</span>
                  </span>
                </button>
              )
            })}
          </div>

          <div className="mt-6 flex flex-col-reverse justify-between gap-3 sm:flex-row">
            <Button variant="ghost" onClick={next}>Next</Button>
            <Button onClick={submit}>Submit</Button>
          </div>
        </motion.div>
      </section>
    </div>
  )
}
