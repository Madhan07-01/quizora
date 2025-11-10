import Navbar from './Navbar'
import { Outlet } from 'react-router-dom'
import Footer from './Footer'

export default function Layout() {
  return (
    <div className="min-h-svh">
      <Navbar />
      <main className="container-page py-8">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
