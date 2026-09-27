import type { ReactNode } from 'react'
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import { cx } from '../../lib/cx'

type Tone = 'danger' | 'success' | 'warning' | 'info'

const TONE: Record<Tone, { icon: typeof Info; box: string; text: string }> = {
    danger: { icon: AlertCircle, box: 'bg-danger-subtle border-danger-border', text: 'text-danger' },
    success: { icon: CheckCircle2, box: 'bg-success-subtle border-success-border', text: 'text-success' },
    warning: { icon: AlertTriangle, box: 'bg-warning-subtle border-warning-border', text: 'text-warning' },
    info: { icon: Info, box: 'bg-info-subtle border-info-border', text: 'text-info' },
}

// Mensagem dentro do conteúdo (erro de formulário, confirmação). danger é anunciado na hora.
export default function Alert({ tone = 'danger', className, children }: {
    tone?: Tone
    className?: string
    children: ReactNode
}) {
    const t = TONE[tone]
    const Icon = t.icon
    return (
        <div
            role={tone === 'danger' ? 'alert' : 'status'}
            className={cx('flex items-start gap-2.5 px-3.5 py-3 rounded-card border', t.box, className)}
        >
            <Icon size={18} className={cx('flex-shrink-0 mt-px', t.text)} aria-hidden />
            <p className={cx('text-body leading-snug', t.text)}>{children}</p>
        </div>
    )
}
