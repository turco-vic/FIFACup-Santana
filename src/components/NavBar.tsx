import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const navItems = [
  { path: '/', label: '🏠 Home' },
  { path: '/players', label: '👥 Jogadores' },
  { path: '/1v1', label: '⚔️ 1v1' },
  { path: '/2v2', label: '🤝 2v2' },
  { path: '/draw', label: '🎲 Sorteio' },
]

export default function Navbar() {
  const { profile } = useAuth()
  const location = useLocation()

  return (
    <nav
      className="w-full border-b border-white/10 px-4 py-3 flex items-center justify-between"
      style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}
    >
      {/* Logo */}
      <Link to="/" className="font-bold text-sm" style={{ color: 'var(--color-gold)' }}>
        FifaCup <span className="text-white">San Tanã</span>
      </Link>

      {/* Links */}
      <div className="flex items-center gap-1">
        {navItems.map(item => (
          <Link
            key={item.path}
            to={item.path}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              location.pathname === item.path
                ? 'text-white'
                : 'text-white/50 hover:text-white hover:bg-white/10'
            }`}
            style={
              location.pathname === item.path
                ? { backgroundColor: 'var(--color-gold)', color: 'var(--color-green)' }
                : {}
            }
          >
            {item.label}
          </Link>
        ))}

        {/* Perfil / Admin */}
        {profile && (
          <Link
            to={profile.role === 'admin' ? '/admin' : '/profile'}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              ['/admin', '/profile'].includes(location.pathname)
                ? 'text-white'
                : 'text-white/50 hover:text-white hover:bg-white/10'
            }`}
            style={
              ['/admin', '/profile'].includes(location.pathname)
                ? { backgroundColor: 'var(--color-gold)', color: 'var(--color-green)' }
                : {}
            }
          >
            {profile.role === 'admin' ? '⚙️ Admin' : '👤 Perfil'}
          </Link>
        )}
      </div>
    </nav>
  )
}
