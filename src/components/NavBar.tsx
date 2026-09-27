import { Link } from 'react-router-dom'
import { cx } from '../lib/cx'
import Avatar from './ui/Avatar'
import { getNavItems, isNavActive, PENDING_HINT } from './nav'

// Cabeçalho das telas logadas. Só apresentação: os dados vêm do AppShell (e da vitrine /design).
//   mobile  (< 768px): logo + nome do usuário; a navegação fica toda na BottomNav
//   desktop (>= 768px): logo + os destinos em texto (os mesmos da BottomNav) + usuário
// Os breakpoints são container queries (@3xl = 48rem = 768px, @5xl = 1024px): o cabeçalho
// ocupa a largura toda, então equivalem ao md/lg da tela e ainda funcionam dentro da vitrine.
// inline: renderiza no fluxo da página em vez de fixo no topo (vitrine)
export default function NavBar({ isSupreme, pathname, pendingCount, displayName, avatarUrl, inline = false }: {
    isSupreme: boolean
    pathname: string
    pendingCount: number
    displayName?: string | null
    avatarUrl?: string | null
    inline?: boolean
}) {
    const items = getNavItems(isSupreme, pendingCount)

    return (
        <header
            className={cx(
                '@container bg-deep/95 backdrop-blur-md border-b border-subtle',
                // z-30: abaixo da BottomNav (40), modais (50) e Toast (100)
                inline ? 'relative' : 'fixed top-0 inset-x-0 z-30',
            )}
            // App instalado no iPhone (status bar translúcida): desce abaixo do relógio/notch
            style={inline ? undefined : { paddingTop: 'env(safe-area-inset-top)' }}
        >
            <div className="h-16 max-w-6xl mx-auto px-4 @3xl:px-6 flex items-center gap-4 @5xl:gap-6">
                <Link to="/" aria-label="FifaCup Santana, ir para a Home" className="flex items-center gap-2 flex-shrink-0 rounded-control">
                    <img src="/logo.png" alt="" className="h-10 w-10 object-contain" />
                    <span aria-hidden className="font-display font-bold text-title uppercase tracking-wide leading-none @3xl:hidden @5xl:inline">
                        <span className="text-brand-text">FifaCup</span> Santana
                    </span>
                </Link>

                {/* Desktop: display:none no mobile, então os links não recebem foco lá */}
                <nav aria-label="Navegação principal" className="hidden @3xl:flex items-center gap-1">
                    {items.map(item => {
                        const { path, label, icon: Icon, badge } = item
                        const active = isNavActive(item, pathname)
                        const showBadge = badge && !active
                        return (
                            <Link
                                key={path}
                                to={path}
                                aria-current={active ? 'page' : undefined}
                                className={cx(
                                    'flex items-center gap-2 h-10 px-3.5 rounded-full text-body font-semibold whitespace-nowrap transition-colors',
                                    active
                                        ? 'bg-white/16 text-brand-text'
                                        : 'text-muted hover:text-primary hover:bg-white/8',
                                )}
                            >
                                <Icon size={17} strokeWidth={active ? 2 : 1.75} className={active ? 'text-brand' : undefined} aria-hidden />
                                {label}
                                {showBadge && <>
                                    <span className="w-2 h-2 rounded-full bg-danger-solid" aria-hidden />
                                    <span className="sr-only">({PENDING_HINT})</span>
                                </>}
                            </Link>
                        )
                    })}
                </nav>

                {displayName && (
                    <div className="ml-auto flex items-center gap-2 min-w-0">
                        <span className="text-caption text-muted truncate @3xl:hidden @5xl:inline">{displayName}</span>
                        <Avatar src={avatarUrl} name={displayName} size="sm" />
                    </div>
                )}
            </div>
        </header>
    )
}
