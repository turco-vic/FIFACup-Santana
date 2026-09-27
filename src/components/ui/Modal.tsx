import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cx } from '../../lib/cx'

type Props = {
    open: boolean
    onClose: () => void
    title: ReactNode
    description?: ReactNode
    // Botões de ação no rodapé (ficam fixos enquanto o conteúdo rola)
    footer?: ReactNode
    size?: 'sm' | 'md'
    // false: não fecha com Esc nem clicando fora (ex.: enquanto salva)
    dismissible?: boolean
    children?: ReactNode
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Celular: folha que sobe de baixo (alcance do polegar). Telas maiores: centralizado.
export default function Modal({
    open, onClose, title, description, footer, size = 'sm', dismissible = true, children,
}: Props) {
    const panelRef = useRef<HTMLDivElement>(null)
    const titleId = useId()
    const descId = useId()
    // onClose/dismissible mudam a cada render do pai; o efeito de abertura não deve reiniciar por isso
    const latest = useRef({ onClose, dismissible })
    useEffect(() => { latest.current = { onClose, dismissible } })

    useEffect(() => {
        if (!open) return
        const previouslyFocused = document.activeElement as HTMLElement | null
        const panel = panelRef.current
        // Foco no primeiro campo/botão do conteúdo; sem nenhum, no próprio painel
        // (não no X, para o anel de foco não aparecer sem o usuário ter feito nada)
        const first = panel?.querySelector('[data-modal-body]')?.querySelector<HTMLElement>(FOCUSABLE)
        ;(first ?? panel)?.focus()

        const { overflow } = document.body.style
        document.body.style.overflow = 'hidden'

        function onKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape' && latest.current.dismissible) {
                e.stopPropagation()
                latest.current.onClose()
                return
            }
            // Mantém o Tab dentro do modal
            if (e.key === 'Tab' && panel) {
                const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
                if (items.length === 0) { e.preventDefault(); return }
                const firstItem = items[0], lastItem = items[items.length - 1]
                if (e.shiftKey && document.activeElement === firstItem) { e.preventDefault(); lastItem.focus() }
                else if (!e.shiftKey && document.activeElement === lastItem) { e.preventDefault(); firstItem.focus() }
            }
        }
        document.addEventListener('keydown', onKeyDown)
        return () => {
            document.removeEventListener('keydown', onKeyDown)
            document.body.style.overflow = overflow
            previouslyFocused?.focus?.()
        }
    }, [open])

    if (!open) return null

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-overlay backdrop-blur-sm motion-safe:animate-fade-in"
            onMouseDown={e => { if (e.target === e.currentTarget && dismissible) onClose() }}
        >
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={description ? descId : undefined}
                tabIndex={-1}
                className={cx(
                    'w-full flex flex-col max-h-[90dvh] bg-elevated border border-subtle shadow-xl',
                    'rounded-t-sheet sm:rounded-sheet motion-safe:animate-sheet-in focus:outline-none',
                    size === 'sm' ? 'sm:max-w-sm' : 'sm:max-w-md',
                )}
            >
                {/* Alça visual da folha no celular */}
                <div className="sm:hidden mx-auto mt-2 h-1 w-10 rounded-full bg-fill-strong" aria-hidden />
                <div className="flex items-start gap-3 px-6 pt-4 sm:pt-6 pb-3">
                    <div className="flex-1 min-w-0">
                        <h2 id={titleId} className="font-display font-bold text-headline uppercase tracking-wide text-primary">
                            {title}
                        </h2>
                        {description && <p id={descId} className="text-body text-muted mt-0.5">{description}</p>}
                    </div>
                    {dismissible && (
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Fechar"
                            className="-mr-2 -mt-1 h-10 w-10 flex items-center justify-center rounded-control text-muted hover:text-primary hover:bg-fill-strong transition-colors"
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>
                <div data-modal-body className="px-6 pb-4 overflow-y-auto">{children}</div>
                {footer && (
                    <div className="flex gap-3 px-6 pt-3 pb-6 border-t border-subtle [&>*]:flex-1">
                        {footer}
                    </div>
                )}
            </div>
        </div>,
        document.body,
    )
}
