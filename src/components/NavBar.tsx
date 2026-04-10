import { Link } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function Navbar() {
  return (
    <nav
      className="fixed top-0 left-0 w-full z-50 border-b border-white/10 px-4 py-3 flex items-center justify-between"
      style={{ backgroundColor: 'rgba(5,40,30,0.97)' }}
    >
      <Link to="/" className="flex items-center gap-2">
        <img src="/logo.png" alt="FifaCup Santana" className="h-10 w-10 object-contain" />
        <span className="font-bold text-sm hidden sm:inline" style={{ color: 'var(--color-gold)' }}>
          FifaCup <span className="text-white">Santana</span>
        </span>
      </Link>

      <Sidebar />
    </nav>
  )
}
