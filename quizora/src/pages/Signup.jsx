import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signupWithEmail } from '../services/auth'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const navigate = useNavigate()

  const strength = useMemo(() => {
    let score = 0
    if (password.length >= 8) score++
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
    if (/\d/.test(password) || /[^A-Za-z0-9]/.test(password)) score++
    if (score <= 1) return { label: 'Weak', color: 'bg-red-500' }
    if (score === 2) return { label: 'Medium', color: 'bg-yellow-500' }
    return { label: 'Strong', color: 'bg-emerald-500' }
  }, [password])

  const match = confirm.length > 0 && password === confirm

  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    try {
      await signupWithEmail({ email, password, name })
      navigate('/dashboard')
    } catch (err) {
      setError(err?.message || 'Signup failed')
    }
  }

  return (
    <div className="relative bg-[linear-gradient(135deg,#0f172a,_#1e1b4b)]">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-[-10%] h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-brand-primary/30 blur-3xl"></div>
        <div className="absolute right-[-10%] top-1/3 h-[28rem] w-[28rem] rounded-full bg-brand-violet/30 blur-3xl"></div>
        <div className="absolute inset-0 backdrop-blur-[2px]"></div>
      </div>

      <section className="container-page py-16 sm:py-20 lg:py-28">
        <div className="mx-auto max-w-md rounded-lg border border-white/30 bg-white/20 p-6 text-white shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
          <h1 className="text-2xl font-bold">Create your Quizora account</h1>
          <form className="mt-4 space-y-3" onSubmit={onSubmit}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-white/30 bg-white/70 px-3 py-2 text-sm text-gray-900 outline-none ring-2 ring-transparent transition placeholder:text-gray-500 focus:ring-brand-primary/50 dark:border-white/10 dark:bg-white/10 dark:text-gray-100"
            placeholder="Name"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-white/30 bg-white/70 px-3 py-2 text-sm text-gray-900 outline-none ring-2 ring-transparent transition placeholder:text-gray-500 focus:ring-brand-primary/50 dark:border-white/10 dark:bg-white/10 dark:text-gray-100"
            placeholder="Email"
          />
          <div className="space-y-2">
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-white/30 bg-white/70 px-3 py-2 pr-10 text-sm text-gray-900 outline-none ring-2 ring-transparent transition placeholder:text-gray-500 focus:ring-brand-primary/50 dark:border-white/10 dark:bg-white/10 dark:text-gray-100"
                placeholder="Password"
              />
              <button type="button" onClick={() => setShowPwd(v=>!v)} className="absolute inset-y-0 right-2 my-auto h-8 w-8 rounded-md text-lg opacity-80 transition hover:opacity-100">{showPwd ? '🙈' : '👁️'}</button>
            </div>
            <div className="flex items-center justify-between text-xs text-white/90">
              <div className="flex w-40 items-center gap-1">
                <div className={`h-1 flex-1 rounded ${password ? strength.color : 'bg-white/30'}`}></div>
                <div className={`h-1 flex-1 rounded ${password.length >= 8 ? strength.color : 'bg-white/30'}`}></div>
                <div className={`h-1 flex-1 rounded ${password.length >= 12 ? strength.color : 'bg-white/30'}`}></div>
              </div>
              <div className="font-medium">{password ? strength.label : 'Strength'}</div>
            </div>
          </div>
          <div className="space-y-1">
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-lg border border-white/30 bg-white/70 px-3 py-2 pr-10 text-sm text-gray-900 outline-none ring-2 ring-transparent transition placeholder:text-gray-500 focus:ring-brand-primary/50 dark:border-white/10 dark:bg-white/10 dark:text-gray-100"
                placeholder="Confirm Password"
              />
              <button type="button" onClick={() => setShowConfirm(v=>!v)} className="absolute inset-y-0 right-2 my-auto h-8 w-8 rounded-md text-lg opacity-80 transition hover:opacity-100">{showConfirm ? '🙈' : '👁️'}</button>
            </div>
            {confirm.length > 0 && (
              <div className={`text-xs ${match ? 'text-emerald-200' : 'text-red-200'}`}>{match ? 'Passwords match' : 'Passwords do not match'}</div>
            )}
          </div>
          {error && <div className="text-xs text-red-200">{error}</div>}
          <button type="submit" className="btn-primary w-full transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:brightness-105">Signup</button>
          </form>
          <div className="mt-3 text-center text-sm text-white/90">
            Already have an account?{' '}
            <Link to="/login" className="underline decoration-white/70 underline-offset-4 hover:text-white">Login</Link>
          </div>
        </div>
      </section>
    </div>
  )
}
