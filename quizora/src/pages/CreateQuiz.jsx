import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Timer as TimerIcon, Copy } from 'lucide-react'
import { apiFetch } from '../services/api'
import { auth, db } from '../lib/firebase'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import useAuth from '../hooks/useAuth'

export default function CreateQuiz() {
  const { user } = useAuth()
  // Quiz meta state
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [difficulty, setDifficulty] = useState('Easy')
  const [sessionMinutes, setSessionMinutes] = useState('') // optional

  // Questions state
  const [questions, setQuestions] = useState([newQuestion(1)])

  // Flow state
  const [code, setCode] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  function newQuestion(id) {
    return {
      id,
      text: '',
      options: { A: '', B: '', C: '', D: '' },
      correct: 'A',
      marks: 1,
      timer: '', // seconds (optional)
    }
  }

  function genCode() {
    const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let s = ''
    for (let i = 0; i < 6; i++) s += charset[Math.floor(Math.random() * charset.length)]
    const generated = `QZ-${s}`
    setCode(generated)
  }

  function addQuestion() {
    setQuestions((qs) => [...qs, newQuestion(qs.length + 1)])
  }

  function deleteQuestion(id) {
    setQuestions((qs) => qs.filter((q) => q.id !== id).map((q, i) => ({ ...q, id: i + 1 })))
  }

  function updateQuestion(id, updater) {
    setQuestions((qs) => qs.map((q) => (q.id === id ? updater(q) : q)))
  }

  const totals = computeTotals(questions, sessionMinutes)

  async function onSave() {
    setError('')
    // Basic validation
    if (!title.trim()) return setError('Please enter a Quiz Title.')
    if (!desc.trim()) return setError('Please enter a Description.')
    if (questions.length === 0) return setError('Add at least one question.')
    for (const q of questions) {
      if (!q.text.trim()) return setError('Each question must have text.')
      if (!q.options.A.trim() || !q.options.B.trim() || !q.options.C.trim() || !q.options.D.trim()) return setError('All options (A–D) are required.')
      if (!q.correct) return setError('Select a correct answer for each question.')
      if (!q.marks || q.marks <= 0) return setError('Marks should be a positive number.')
    }

    // Build payload
    const payload = {
      title: title.trim(),
      description: desc.trim(),
      difficulty,
      sessionTimer: sessionMinutes ? parseInt(sessionMinutes) : null,
      questions: questions.map(q => ({
        questionText: q.text,
        optionA: q.options.A,
        optionB: q.options.B,
        optionC: q.options.C,
        optionD: q.options.D,
        correctAnswer: q.correct,
        marks: q.marks,
        timer: q.timer ? parseInt(q.timer) : null,
      })),
      creatorUid: user?.uid || auth.currentUser?.uid || null,
      creatorName: user?.displayName || auth.currentUser?.displayName || null,
    }

    try {
      setSaving(true)
      // 1) Persist to backend (PostgreSQL + roomCode generation)
      const resp = await apiFetch('/quizzes/create', { method: 'POST', body: payload })
      setSaving(false)
      if (resp?.quizCode) setCode(resp.quizCode)
      // 2) Persist full quiz to Firestore (dual-write)
      if (resp?.quizCode) {
        const quizId = String(resp.quizCode)
        await setDoc(doc(db, 'quizzes', quizId), {
          roomCode: quizId,
          title: payload.title,
          description: payload.description,
          difficulty: payload.difficulty,
          sessionTimer: payload.sessionTimer,
          questions: payload.questions,
          creatorUid: payload.creatorUid,
          creatorName: payload.creatorName,
          createdAt: serverTimestamp(),
        }, { merge: true })
      }
      setSuccess(true)
    } catch (e) {
      setSaving(false)
      setError(e?.message || 'Failed to create quiz')
    }
  }

  function copyCode() {
    if (code) navigator.clipboard?.writeText(code)
  }

  return (
    <div className="relative bg-[linear-gradient(135deg,#0f172a,_#1e1b4b)]">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-[-10%] h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-brand-primary/30 blur-3xl"></div>
        <div className="absolute right-[-10%] top-1/3 h-[26rem] w-[26rem] rounded-full bg-brand-violet/30 blur-3xl"></div>
        <div className="absolute inset-0 backdrop-blur-[2px]"></div>
      </div>

      <div className="container-page grid grid-cols-1 gap-6 py-6 lg:grid-cols-[260px_1fr]">
      {/* Sidebar (kept consistent with Dashboard) */}
      <aside className="rounded-2xl border border-white/20 bg-white/10 p-4 text-white backdrop-blur-xl">
        <nav className="grid gap-1 text-sm">
          {[
            ['Dashboard','/dashboard'],
            ['Create Quiz','/create'],
            ['Join Quiz','/join'],
            ['Leaderboard','/leaderboard'],
            ['Profile','/profile'],
            ['Logout','/login'],
          ].map(([label, href]) => (
            <a key={label} href={href} className="rounded-lg px-3 py-2 text-white/90 transition hover:bg-white/20">{label}</a>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <div className="space-y-6">
        {/* Header */}
        <div className="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-xl">
          <h1 className="text-2xl font-bold text-white">Create a New Quiz Session</h1>
          <p className="mt-1 text-sm text-gray-200/90">Design your quiz, customize timing and marks, and invite others to join.</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            {code ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/20 px-3 py-1 text-white">
                ✅ Quiz Code Generated: <span className="font-semibold">{code}</span>
                <button onClick={copyCode} className="inline-flex items-center gap-1 rounded-md bg-white/20 px-2 py-1"><Copy size={14}/>Copy</button>
              </span>
            ) : (
              <button onClick={genCode} className="btn-outline inline-flex items-center gap-2"><Plus size={16}/> Generate Quiz Code</button>
            )}
          </div>
        </div>

        {/* Quiz Information */}
        <motion.div initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.45 }} className="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-xl">
          <h2 className="text-lg font-semibold text-white">Quiz Information</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input value={title} onChange={(e)=>setTitle(e.target.value)} className="w-full rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm text-white outline-none ring-2 ring-transparent transition placeholder:text-gray-300 focus:ring-brand-primary/50" placeholder="Quiz Title" />
            <select value={difficulty} onChange={(e)=>setDifficulty(e.target.value)} className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm text-white outline-none ring-2 ring-transparent transition focus:ring-brand-primary/50">
              <option>Easy</option><option>Medium</option><option>Hard</option>
            </select>
            <textarea value={desc} onChange={(e)=>setDesc(e.target.value)} className="sm:col-span-2 w-full rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm text-white outline-none ring-2 ring-transparent transition placeholder:text-gray-300 focus:ring-brand-primary/50" rows="4" placeholder="Description"></textarea>
            <div className="flex items-center gap-2">
              <TimerIcon size={16} className="text-gray-700"/>
              <input value={sessionMinutes} onChange={(e)=>setSessionMinutes(e.target.value.replace(/\D/g,''))} className="w-full rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm text-white outline-none ring-2 ring-transparent transition placeholder:text-gray-300 focus:ring-brand-primary/50" placeholder="Session Timer (minutes, optional)" />
            </div>
          </div>
        </motion.div>

        {/* Questions */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Add Questions</h2>
          <AnimatePresence initial={false}>
            {questions.map((q) => (
              <motion.div key={q.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }} className="rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-xl">
                <div className="mb-3 flex items-center justify-between text-sm">
                  <div className="font-semibold text-white">Question {q.id}</div>
                  <button onClick={() => deleteQuestion(q.id)} className="inline-flex items-center gap-1 rounded-md border border-red-300/40 bg-red-500/20 px-2 py-1 text-red-100 hover:bg-red-500/30"><Trash2 size={14}/>Delete</button>
                </div>
                <textarea value={q.text} onChange={(e)=>updateQuestion(q.id, (prev)=>({ ...prev, text: e.target.value }))} className="mb-3 w-full rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm text-white outline-none ring-2 ring-transparent transition placeholder:text-gray-300 focus:ring-brand-primary/50" rows="3" placeholder="Enter the question text"></textarea>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(['A','B','C','D']).map((k) => (
                    <input key={k} value={q.options[k]} onChange={(e)=>updateQuestion(q.id, (prev)=>({ ...prev, options: { ...prev.options, [k]: e.target.value } }))} className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm text-white outline-none ring-2 ring-transparent transition placeholder:text-gray-300 focus:ring-brand-primary/50" placeholder={`Option ${k}`} />
                  ))}
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <select value={q.correct} onChange={(e)=>updateQuestion(q.id, (prev)=>({ ...prev, correct: e.target.value }))} className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm text-white outline-none ring-2 ring-transparent transition focus:ring-brand-primary/50">
                    <option value="A">Correct: A</option>
                    <option value="B">Correct: B</option>
                    <option value="C">Correct: C</option>
                    <option value="D">Correct: D</option>
                  </select>
                  <input type="number" min="1" value={q.marks} onChange={(e)=>updateQuestion(q.id, (prev)=>({ ...prev, marks: parseInt(e.target.value||'0') }))} className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm text-white outline-none ring-2 ring-transparent transition placeholder:text-gray-300 focus:ring-brand-primary/50" placeholder="Marks" />
                  <input value={q.timer} onChange={(e)=>updateQuestion(q.id, (prev)=>({ ...prev, timer: e.target.value.replace(/\D/g,'') }))} className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm text-white outline-none ring-2 ring-transparent transition placeholder:text-gray-300 focus:ring-brand-primary/50" placeholder="Timer (seconds, optional)" />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <button onClick={addQuestion} className="btn-outline inline-flex items-center gap-2"><Plus size={16}/> Add Another Question</button>
        </div>

        {/* Summary */}
        <motion.div initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.45 }} className="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-xl">
          <h2 className="text-lg font-semibold text-white">Quiz Summary</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3 text-sm text-white">
            <div className="rounded-xl border border-white/30 bg-white/10 p-4"><div className="opacity-80">Total Questions</div><div className="mt-1 text-lg font-semibold">{totals.count}</div></div>
            <div className="rounded-xl border border-white/30 bg-white/10 p-4"><div className="opacity-80">Total Marks</div><div className="mt-1 text-lg font-semibold">{totals.marks}</div></div>
            <div className="rounded-xl border border-white/30 bg-white/10 p-4"><div className="opacity-80">Total Duration</div><div className="mt-1 text-lg font-semibold">{totals.duration} min</div></div>
          </div>

          {error && (
            <div className="mt-3 rounded-lg border border-red-300/40 bg-red-500/20 px-3 py-2 text-xs text-red-100">{error}</div>
          )}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button onClick={onSave} disabled={saving} className="btn-primary w-full sm:w-auto">
              {saving ? 'Creating...' : 'Save & Create Session'}
            </button>
            {!code && (
              <button onClick={genCode} type="button" className="btn-outline w-full sm:w-auto">Generate Quiz Code</button>
            )}
          </div>

          {/* Success */}
          <AnimatePresence>
            {success && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="mt-4 rounded-xl border border-white/30 bg-white/20 p-4 text-sm text-white">
                <div className="text-base font-semibold">🎉 Quiz session created successfully!</div>
                <div className="mt-1">Your session code is <span className="font-semibold">{code}</span>. Share this with participants.</div>
                <button onClick={copyCode} className="mt-3 inline-flex items-center gap-2 rounded-md bg-white/20 px-3 py-2 text-xs"><Copy size={14}/>Copy Code</button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  </div>
  )
}

function computeTotals(questions, sessionMinutes) {
  const count = questions.length
  const marks = questions.reduce((a, b) => a + (parseInt(b.marks||0) || 0), 0)
  const perQuestionSeconds = questions.reduce((a, b) => a + (parseInt(b.timer||0) || 0), 0)
  const totalMinutes = sessionMinutes ? parseInt(sessionMinutes || '0') : Math.ceil(perQuestionSeconds / 60)
  return { count, marks, duration: isNaN(totalMinutes) ? 0 : totalMinutes }
}
