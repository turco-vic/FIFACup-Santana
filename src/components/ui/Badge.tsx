import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'
import { BADGE_TONE, type BadgeTone } from './variants'

type Props = {
    tone?: BadgeTone
    size?: 'sm' | 'md'
    icon?: ReactNode
    // Bolinha de status antes do texto (ex.: "Em andamento")
    dot?: boolean
    className?: string
    children: ReactNode
}

export default function Badge({ tone = 'neutral', size = 'sm', icon, dot, className, children }: Props) {
    return (
        <span className={cx(
            'inline-flex items-center gap-1.5 border font-bold rounded-control whitespace-nowrap',
            size === 'sm' ? 'h-6 px-2 text-caption' : 'h-7 px-2.5 text-body',
            BADGE_TONE[tone],
            className,
        )}>
            {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden />}
            {icon}
            {children}
        </span>
    )
}
