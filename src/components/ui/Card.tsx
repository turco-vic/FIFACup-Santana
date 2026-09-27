import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from '../../lib/cx'

type CardProps = HTMLAttributes<HTMLDivElement> & {
    // accent: borda e brilho dourados (campeão, item selecionado)
    tone?: 'default' | 'accent'
}

export function Card({ tone = 'default', className, children, ...rest }: CardProps) {
    return (
        <div
            className={cx(
                'bg-surface border rounded-card overflow-hidden',
                tone === 'accent' ? 'border-accent shadow-brand' : 'border-subtle',
                className,
            )}
            {...rest}
        >
            {children}
        </div>
    )
}

type HeaderProps = {
    title: ReactNode
    subtitle?: ReactNode
    // Botão/contagem à direita do título
    action?: ReactNode
    icon?: ReactNode
    className?: string
}

export function CardHeader({ title, subtitle, action, icon, className }: HeaderProps) {
    return (
        <div className={cx('flex items-center gap-3 px-card py-3 bg-brand-subtle border-b border-subtle', className)}>
            {icon && <span className="text-brand-text flex-shrink-0">{icon}</span>}
            <div className="flex-1 min-w-0">
                <h3 className="font-display font-bold text-title uppercase tracking-wide text-brand-text truncate">
                    {title}
                </h3>
                {subtitle && <p className="text-caption text-muted truncate">{subtitle}</p>}
            </div>
            {action && <div className="flex-shrink-0">{action}</div>}
        </div>
    )
}

export function CardBody({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
    return <div className={cx('p-card', className)} {...rest}>{children}</div>
}
