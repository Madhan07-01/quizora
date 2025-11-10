export default function Footer() {
  const year = 2025
  return (
    <footer className="mt-16 border-t border-white/10 bg-white/20 backdrop-blur-xl">
      <div className="container-page flex flex-col items-center gap-3 py-6 text-xs text-gray-700 dark:text-gray-300">
        <nav className="flex flex-wrap items-center justify-center gap-4">
          <a href="#about" className="hover:underline">About</a>
          <a href="#privacy" className="hover:underline">Privacy Policy</a>
          <a href="#contact" className="hover:underline">Contact</a>
        </nav>
        <div className="text-center">© {year} Quizora</div>
      </div>
    </footer>
  )
}
