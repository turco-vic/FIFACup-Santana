import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Settings, User } from 'lucide-react'

export default function Navbar() {
  const { profile } = useAuth()
  const location = useLocation()

  return (
    <nav
      className="w-full border-b border-white/10 px-4 py-3 flex items-center justify-between"
      style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}
    >
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2">
        <img src="/logo.png" alt="FifaCup Santana" className="h-10 w-10 object-contain" />
        <span className="font-bold text-sm" style={{ color: 'var(--color-gold)' }}>
          FifaCup <span className="text-white">Santana</span>
        </span>
      </Link>

      {/* Usuário logado */}
      {profile && (
        <Link
          to={profile.role === 'admin' ? '/admin' : '/profile'}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${['/admin', '/profile'].includes(location.pathname)
              ? ''
              : 'text-white/50 hover:text-white hover:bg-white/10'
            }`}
          style={
            ['/admin', '/profile'].includes(location.pathname)
              ? { backgroundColor: 'var(--color-gold)', color: 'var(--color-green)' }
              : {}
          }
        >
          {profile.role === 'admin'
            ? <Settings size={14} />
            : <User size={14} />
          }
          <span>
            {profile.role === 'admin'
              ? 'Admin'
              : `@${profile.username ?? profile.name?.split(' ')[0]}`
            }
          </span>
        </Link>
      )}
    </nav>
  )
}
