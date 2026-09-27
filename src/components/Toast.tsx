import { useEffect } from 'react'
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import type { ToastType } from '../hooks/useToast'
import { cx } from '../lib/cx'

type Props = {
    message: string
    type?: ToastType
    onClose: () => void
}

const TYPE_STYLE: Record<ToastType, { icon: typeof Info; iconClass: string; stripe: string; ms: number }> = {
    success: { icon: CheckCircle2, iconClass: 'text-success-strong', stripe: 'border-l-success-strong', ms: 3000 },
    info: { icon: Info, iconClass: 'text-info-strong', stripe: 'border-l-info-strong', ms: 3000 },
    warning: { icon: AlertTriangle, iconClass: 'text-warning-strong', stripe: 'border-l-warning-strong', ms: 4500 },
    // Erro fica mais tempo: costuma pedir uma ação
    error: { icon: XCircle, iconClass: 'text-danger-strong', stripe: 'border-l-danger-strong', ms: 5000 },
}

// Fundo claro (bg-inverse) para se destacar do verde do app; a faixa lateral e o ícone dão o tipo.
// Celular: faixa no topo, abaixo da barra. Telas maiores: canto superior direito.
export default function Toast({ message, type = 'success', onClose }: Props) {
    const style = TYPE_STYLE[type]
    const Icon = style.icon

    useEffect(() => {
        const timer = setTimeout(onClose, style.ms)
        return () => clearTimeout(timer)
    }, [onClose, style.ms])

    return (
        <div
            // Erro interrompe o leitor de tela; os demais esperam a vez
            role={type === 'error' ? 'alert' : 'status'}
            aria-live={type === 'error' ? 'assertive' : 'polite'}
            className={cx(
                'fixed z-[100] top-[calc(4.5rem+env(safe-area-inset-top))] inset-x-4 sm:inset-x-auto sm:right-4 sm:w-96',
                'flex items-start gap-3 pl-4 pr-2 py-3 rounded-card border border-inverse border-l-4',
                'bg-inverse shadow-xl motion-safe:animate-toast-in',
                style.stripe,
            )}
        >
            <Icon size={20} className={cx('flex-shrink-0 mt-px', style.iconClass)} aria-hidden />
            <p className="flex-1 text-body font-medium text-inverse pt-0.5">{message}</p>
            <button
                type="button"
                onClick={onClose}
                aria-label="Fechar aviso"
                // Anel de foco escuro: o dourado claro padrão sumiria no fundo branco
                className="-my-1 h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-control text-inverse-muted hover:text-inverse hover:bg-black/5 transition-colors focus-visible:outline-[var(--background-color-canvas)]"
            >
                <X size={16} />
            </button>
        </div>
    )
}
