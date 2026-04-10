import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { FaInstagram, FaLinkedin } from 'react-icons/fa'
import { X, Menu, Users, Shield, Home, User, Trophy } from 'lucide-react'

export default function Sidebar() {
    const { profile, isSupreme } = useAuth()
    const location = useLocation()
    const [open, setOpen] = useState(false)

    const items = isSupreme
        ? [
            { path: '/', label: 'Home', icon: Home },
            { path: '/tournaments', label: 'Campeonatos', icon: Trophy },
            { path: '/players', label: 'Todos os usuários', icon: Users },
            { path: '/admin', label: 'Painel Supreme', icon: Shield },
            { path: '/profile', label: 'Meu Perfil', icon: User },
        ]
        : [
            { path: '/', label: 'Home', icon: Home },
            { path: '/tournaments', label: 'Meus campeonatos', icon: Trophy },
            { path: '/profile', label: 'Meu Perfil', icon: User },
        ]

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="p-2 text-white/60 hover:text-white transition"
            >
                <Menu size={28} />
            </button>

            {open && (
                <div
                    className="fixed inset-0 z-[60] bg-black/60"
                    onClick={() => setOpen(false)}
                />
            )}

            <div
                className={`fixed top-0 right-0 h-full z-[70] w-72 flex flex-col overflow-hidden transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}
                style={{ backgroundColor: '#081f16', borderLeft: '1px solid rgba(255,255,255,0.1)' }}
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                    <div className="flex items-center gap-2">
                        <img src="/logo.png" alt="FifaCup" className="h-8 w-8 object-contain" />
                        <span className="font-bold text-sm" style={{ color: 'var(--color-gold)' }}>
                            FifaCup <span className="text-white">Santana</span>
                        </span>
                    </div>
                    <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white transition">
                        <X size={20} />
                    </button>
                </div>

                {/* Info do usuário */}
                {profile && (
                    <div className="px-5 py-4 border-b border-white/10">
                        <div className="flex items-center gap-3">
                            <div
                                className="w-10 h-10 rounded-full overflow-hidden bg-white/10 flex-shrink-0 flex items-center justify-center border"
                                style={{ borderColor: 'var(--color-gold)' }}
                            >
                                {profile.avatar_url
                                    ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                                    : <span className="text-white/40 text-sm font-bold">{profile.name?.charAt(0) ?? '?'}</span>
                                }
                            </div>
                            <div className="min-w-0">
                                <p className="text-white text-sm font-bold truncate">
                                    {isSupreme ? 'AdminSupremo' : profile.name ?? 'Sem nome'}
                                </p>
                                {profile.username && !isSupreme && (
                                    <p className="text-white/40 text-xs">@{profile.username}</p>
                                )}
                                {isSupreme && (
                                    <p className="text-xs" style={{ color: 'var(--color-gold)' }}>Turco</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex flex-col p-4 gap-1 flex-1 min-h-0 overflow-y-auto">
                    {items.map(({ path, label, icon: Icon }) => (
                        <Link
                            key={path}
                            to={path}
                            onClick={() => setOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl transition font-medium text-sm"
                            style={
                                location.pathname === path
                                    ? { backgroundColor: 'var(--color-gold)', color: 'var(--color-green)' }
                                    : { color: 'rgba(255,255,255,0.7)' }
                            }
                            onMouseEnter={e => {
                                if (location.pathname !== path)
                                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'
                            }}
                            onMouseLeave={e => {
                                if (location.pathname !== path)
                                    e.currentTarget.style.backgroundColor = 'transparent'
                            }}
                        >
                            <Icon size={18} />
                            {label}
                        </Link>
                    ))}
                </div>

                <div className="px-5 py-4 border-t border-white/10 flex flex-col items-center gap-3 flex-shrink-0">
                    <p className="text-white/30 text-xs">Desenvolvido por Turco</p>
                    <div className="flex items-center gap-4">
                        <a href="https://www.instagram.com/turco.vic" target="_blank" rel="noopener noreferrer"
                            className="text-white/30 hover:text-white transition">
                            <FaInstagram size={20} />
                        </a>
                        <a href="https://www.linkedin.com/in/enzoturcovic/" target="_blank" rel="noopener noreferrer"
                            className="text-white/30 hover:text-white transition">
                            <FaLinkedin size={20} />
                        </a>
                    </div>
                </div>
            </div>
        </>
    )
}
