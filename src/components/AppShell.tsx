import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { usePendingApprovals } from '../hooks/usePendingApprovals'
import NavBar from './NavBar'
import BottomNav from './BottomNav'
import AppFooter from './AppFooter'

// Moldura das telas logadas: cabeçalho, BottomNav (mobile), conteúdo e rodapé.
// Busca perfil, rota e pendentes uma vez só e repassa por props.
export default function AppShell({ children }: { children: ReactNode }) {
    const { profile, isSupreme } = useAuth()
    const { pathname } = useLocation()
    const pendingCount = usePendingApprovals(isSupreme, pathname)

    return (
        <>
            {/* Teclado: primeiro Tab da página pula o cabeçalho */}
            <a
                href="#conteudo"
                className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[110] focus:px-4 focus:py-2 focus:rounded-control focus:bg-brand focus:text-on-brand focus:font-semibold"
            >
                Pular para o conteúdo
            </a>

            <NavBar
                isSupreme={isSupreme}
                pathname={pathname}
                pendingCount={pendingCount}
                displayName={profile?.username ?? profile?.name}
                avatarUrl={profile?.avatar_url}
            />
            <BottomNav isSupreme={isSupreme} pathname={pathname} pendingCount={pendingCount} />

            {/* pt: altura do cabeçalho (64px) + área do notch no app instalado.
                pb: espaço da BottomNav flutuante (só < 768px): 24px de afastamento + 82px da pílula + folga.
                min-h + flex: em telas curtas o rodapé fica no fim da tela, não no meio. */}
            <main
                id="conteudo"
                tabIndex={-1}
                className="min-h-dvh flex flex-col focus:outline-none pt-[calc(4rem+env(safe-area-inset-top))] pb-[calc(7.5rem+env(safe-area-inset-bottom))] md:pb-0"
            >
                <div className="flex-1">{children}</div>
                <AppFooter />
            </main>
        </>
    )
}
