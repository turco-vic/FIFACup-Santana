import { CircleUser, House, ShieldCheck, Trophy, Users, type LucideIcon } from 'lucide-react'

// Destinos da navegação principal: os mesmos na BottomNav (mobile) e no cabeçalho (desktop)
export type NavItem = {
    path: string
    label: string
    icon: LucideIcon
    // Rotas além do path exato que mantêm o item ativo
    matches?: (pathname: string) => boolean
    badge?: boolean
}

export const PENDING_HINT = 'cadastros aguardando aprovação'

export function getNavItems(isSupreme: boolean, pendingCount: number): NavItem[] {
    return [
        { path: '/', label: 'Home', icon: House },
        // Dentro de um campeonato (/tournament/:id) Campeonatos continua ativo
        { path: '/tournaments', label: 'Campeonatos', icon: Trophy, matches: p => p.startsWith('/tournament') },
        ...(isSupreme ? [
            { path: '/players', label: 'Usuários', icon: Users },
            { path: '/admin', label: 'Supreme', icon: ShieldCheck, badge: pendingCount > 0 },
        ] : []),
        { path: '/profile', label: 'Perfil', icon: CircleUser },
    ]
}

export function isNavActive(item: NavItem, pathname: string): boolean {
    return item.matches ? item.matches(pathname) : pathname === item.path
}
