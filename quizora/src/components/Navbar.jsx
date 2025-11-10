import { useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import ThemeToggle from './ThemeToggle'
import useAuth from '../hooks/useAuth'
import { logout } from '../services/auth'

const linkBase = 'text-sm font-medium px-3 py-2 rounded-md transition'
const linkIdle = 'text-gray-700/90 hover:bg-white/40 dark:text-gray-200/90 dark:hover:bg-white/10'

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const showCTA = pathname !== '/dashboard'

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/20 bg-white/40 backdrop-blur-xl supports-[backdrop-filter]:bg-white/30 dark:border-white/10 dark:bg-gray-950/40">
      <div className="container-page flex h-16 items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-lg font-extrabold tracking-tight bg-gradient-to-tr from-brand-primary to-brand-violet bg-clip-text text-transparent">Quizora</span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          <NavLink to="/" className={linkBase + ' ' + linkIdle}>Home</NavLink>
          <NavLink to="/join" className={linkBase + ' ' + linkIdle}>Join Quiz</NavLink>
          <NavLink to="/create" className={linkBase + ' ' + linkIdle}>Create Quiz</NavLink>
          <NavLink to="/leaderboard" className={linkBase + ' ' + linkIdle}>Leaderboard</NavLink>
          {!user && <NavLink to="/login" className={linkBase + ' ' + linkIdle}>Login / Signup</NavLink>}
          {user && <NavLink to="/dashboard" className={linkBase + ' ' + linkIdle}>Dashboard</NavLink>}
        </nav>
        <div className="flex items-center gap-2">
          {showCTA && !user && (
            <Link to="/login" className="btn-primary hidden md:inline-flex">Get Started</Link>
          )}
          {user && (
            <button
              onClick={async () => { await logout(); navigate('/'); }}
              className="btn-ghost hidden md:inline-flex"
            >Logout</button>
          )}
          <button className="md:hidden btn-ghost px-3 py-2" aria-label="Menu" onClick={() => setOpen(v => !v)}>
            ☰
          </button>
          <ThemeToggle />
        </div>
      </div>
      {/* Mobile Menu */}
      {open && (
        <div className="md:hidden border-t border-white/20 bg-white/60 backdrop-blur-xl dark:border-white/10 dark:bg-gray-950/60">
          <div className="container-page grid gap-1 py-3">
            <NavLink to="/" className={linkBase + ' ' + linkIdle} onClick={() => setOpen(false)}>Home</NavLink>
            <NavLink to="/join" className={linkBase + ' ' + linkIdle} onClick={() => setOpen(false)}>Join Quiz</NavLink>
            <NavLink to="/create" className={linkBase + ' ' + linkIdle} onClick={() => setOpen(false)}>Create Quiz</NavLink>
            <NavLink to="/leaderboard" className={linkBase + ' ' + linkIdle} onClick={() => setOpen(false)}>Leaderboard</NavLink>
            {!user && <NavLink to="/login" className={linkBase + ' ' + linkIdle} onClick={() => setOpen(false)}>Login / Signup</NavLink>}
            {user && <button className={linkBase + ' ' + linkIdle + ' text-left'} onClick={async () => { setOpen(false); await logout(); navigate('/'); }}>Logout</button>}
          </div>
        </div>
      )}
    </header>
  )
}
