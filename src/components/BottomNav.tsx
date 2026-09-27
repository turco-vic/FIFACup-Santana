import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { CircleUser, House, ShieldCheck, Trophy, Users, type LucideIcon } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { cx } from '../lib/cx'

type NavItem = {
    path: string
    label: string
    icon: LucideIcon
    // Rotas além do path exato que mantêm a aba ativa
    matches?: (pathname: string) => boolean
    badge?: boolean
}

// Pílula flutuante só no mobile (< 768px); no desktop a navegação é a Sidebar (☰ da NavBar)
export default function BottomNav() {
    const { isSupreme } = useAuth()
    const { pathname } = useLocation()
    const pendingCount = usePendingApprovals(isSupreme, pathname)
    return <BottomNavBar isSupreme={isSupreme} pathname={pathname} pendingCount={pendingCount} />
}

// Só apresentação (sem login nem rota própria): usada pela BottomNav e pela vitrine /design.
// inline: renderiza no fluxo da página em vez de fixa na base (vitrine)
export function BottomNavBar({ isSupreme, pathname, pendingCount, inline = false }: {
    isSupreme: boolean
    pathname: string
    pendingCount: number
    inline?: boolean
}) {
    const items: NavItem[] = [
        { path: '/', label: 'Home', icon: House },
        // Dentro de um campeonato (/tournament/:id) a aba Campeonatos continua ativa
        { path: '/tournaments', label: 'Campeonatos', icon: Trophy, matches: p => p.startsWith('/tournament') },
        ...(isSupreme ? [
            { path: '/players', label: 'Usuários', icon: Users },
            { path: '/admin', label: 'Supreme', icon: ShieldCheck, badge: pendingCount > 0 },
        ] : []),
        { path: '/profile', label: 'Perfil', icon: CircleUser },
    ]

    return (
        <nav
            aria-label="Navegação principal"
            className={cx(
                'rounded-full bg-deep shadow-xl border border-white/10 flex items-center justify-between px-4 py-4',
                // z-40: acima do conteúdo e abaixo de modais (50), Sidebar (60/70) e Toast (100)
                inline ? 'relative' : 'md:hidden fixed left-10 right-10 z-40',
            )}
            // Acima da barra de gestos do iPhone (env() exige viewport-fit=cover no index.html)
            style={inline ? undefined : { bottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
        >
            {items.map(({ path, label, icon: Icon, matches, badge }) => {
                const active = matches ? matches(pathname) : pathname === path
                const showBadge = badge && !active
                return (
                    <Link
                        key={path}
                        to={path}
                        aria-label={showBadge ? `${label} (cadastros aguardando aprovação)` : label}
                        aria-current={active ? 'page' : undefined}
                        className={cx(
                            'relative flex items-center justify-center w-12 h-12 rounded-full transition-all duration-400',
                            active
                                ? 'bg-white/16 text-brand scale-140'
                                : 'text-white/40 hover:text-white/70 hover:bg-white/8',
                        )}
                    >
                        <Icon className="w-5 h-5" strokeWidth={1.5} aria-hidden />
                        {showBadge && (
                            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-danger-solid" aria-hidden />
                        )}
                    </Link>
                )
            })}
        </nav>
    )
}

// Cadastros com status 'pending' (só o supreme aprova). Recontado a cada troca de rota:
// aprovar alguém em /admin e sair já atualiza a bolinha.
function usePendingApprovals(isSupreme: boolean, pathname: string): number {
    const [count, setCount] = useState(0)

    useEffect(() => {
        if (!isSupreme) { setCount(0); return }
        let cancelled = false
        supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'pending')
            .then(({ count: pending, error }) => {
                if (!cancelled && !error) setCount(pending ?? 0)
            })
        return () => { cancelled = true }
    }, [isSupreme, pathname])

    return count
}
