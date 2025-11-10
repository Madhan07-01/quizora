import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { loginWithEmail } from '../services/auth'

export default function Login() {
  const navigate = useNavigate()
  const [show, setShow] = useState(false)
  async function onSubmit(e) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const email = form.get('email')
    const password = form.get('password')
    try {
      await loginWithEmail({ email, password })
      navigate('/dashboard')
    } catch (err) {
      alert(err?.message || 'Login failed')
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
          <h1 className="text-2xl font-bold">Login to Quizora</h1>
          <form className="mt-4 space-y-3" onSubmit={onSubmit}>
            <input
              type="email"
              name="email"
              className="w-full rounded-lg border border-white/30 bg-white/70 px-3 py-2 text-sm text-gray-900 outline-none ring-2 ring-transparent transition placeholder:text-gray-500 focus:ring-brand-primary/50 dark:border-white/10 dark:bg-white/10 dark:text-gray-100"
              placeholder="Email"
            />
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                name="password"
                className="w-full rounded-lg border border-white/30 bg-white/70 px-3 py-2 pr-10 text-sm text-gray-900 outline-none ring-2 ring-transparent transition placeholder:text-gray-500 focus:ring-brand-primary/50 dark:border-white/10 dark:bg-white/10 dark:text-gray-100"
                placeholder="Password"
              />
              <button type="button" onClick={() => setShow(v=>!v)} className="absolute inset-y-0 right-2 my-auto h-8 w-8 rounded-md text-lg opacity-80 transition hover:opacity-100">{show ? '🙈' : '👁️'}</button>
            </div>
            <button type="submit" className="btn-primary w-full transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:brightness-105">Login</button>
          </form>
          <div className="mt-3 text-center text-sm text-white/90">
            Don’t have an account?{' '}
            <Link to="/signup" className="underline decoration-white/70 underline-offset-4 hover:text-white">Signup</Link>
          </div>
        </div>
      </section>
    </div>
  )
}
