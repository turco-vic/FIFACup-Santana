import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Home, Users, User, Shield, Trophy } from 'lucide-react'
import { useState, useEffect } from 'react'

export default function BottomNav() {
    const { isSupreme } = useAuth()
    const location = useLocation()
    const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640)

    useEffect(() => {
        const handler = () => setIsMobile(window.innerWidth < 640)
        window.addEventListener('resize', handler)
        return () => window.removeEventListener('resize', handler)
    }, [])

    if (!isMobile) return null

    const navItems = isSupreme
        ? [
            { path: '/', label: 'Home', icon: Home },
            { path: '/tournaments', label: 'Campeonatos', icon: Trophy },
            { path: '/players', label: 'Usuários', icon: Users },
            { path: '/admin', label: 'Supreme', icon: Shield },
        ]
        : [
            { path: '/', label: 'Home', icon: Home },
            { path: '/tournaments', label: 'Campeonatos', icon: Trophy },
            { path: '/profile', label: 'Perfil', icon: User },
        ]

    return (
        <nav
            className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around px-2 py-2 border-t border-white/10"
            style={{ backgroundColor: 'rgba(5,40,30,0.97)', backdropFilter: 'blur(10px)' }}
        >
            {navItems.map(({ path, label, icon: Icon }) => {
                // Dentro de um campeonato (/tournament/:id) a aba Campeonatos continua ativa
                const active = path === '/tournaments'
                    ? location.pathname.startsWith('/tournament')
                    : location.pathname === path
                return (
                    <Link
                        key={path}
                        to={path}
                        className="flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition"
                    >
                        <Icon
                            size={22}
                            style={active ? { color: 'var(--color-gold)' } : { color: 'rgba(255,255,255,0.4)' }}
                        />
                        <span
                            className="text-xs font-medium"
                            style={active ? { color: 'var(--color-gold)' } : { color: 'rgba(255,255,255,0.4)' }}
                        >
                            {label}
                        </span>
                    </Link>
                )
            })}
        </nav>
    )
}
