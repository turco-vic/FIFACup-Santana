import { Link } from 'react-router-dom'
import { cx } from '../lib/cx'
import { getNavItems, isNavActive, PENDING_HINT } from './nav'

// Pílula flutuante só no mobile (< 768px); no desktop a navegação fica no cabeçalho (NavBar).
// Só apresentação: os dados vêm do AppShell (e da vitrine /design).
// inline: renderiza no fluxo da página em vez de fixa na base (vitrine)
export default function BottomNav({ isSupreme, pathname, pendingCount, inline = false }: {
    isSupreme: boolean
    pathname: string
    pendingCount: number
    inline?: boolean
}) {
    const items = getNavItems(isSupreme, pendingCount)

    return (
        <nav
            aria-label="Navegação principal"
            className={cx(
                'rounded-full bg-deep shadow-xl border border-white/10 flex items-center justify-between px-4 py-4',
                // z-40: acima do conteúdo e do cabeçalho (30), abaixo de modais (50) e Toast (100)
                inline ? 'relative' : 'md:hidden fixed left-10 right-10 z-40',
            )}
            // Acima da barra de gestos do iPhone (env() exige viewport-fit=cover no index.html)
            style={inline ? undefined : { bottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
        >
            {items.map(item => {
                const { path, label, icon: Icon, badge } = item
                const active = isNavActive(item, pathname)
                const showBadge = badge && !active
                return (
                    <Link
                        key={path}
                        to={path}
                        aria-label={showBadge ? `${label} (${PENDING_HINT})` : label}
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
