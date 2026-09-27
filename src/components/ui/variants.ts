import { cx } from '../../lib/cx'

// Classes dos componentes em arquivo .ts: permite estilizar um <Link> como botão
// (buttonClasses) sem exportar funções de um .tsx (o fast refresh exige só componentes lá).

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'link'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

const BUTTON_BASE =
    'inline-flex items-center justify-center gap-2 font-semibold select-none whitespace-nowrap ' +
    'transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none'

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
    primary: 'bg-brand text-on-brand shadow-sm hover:bg-brand-hover active:bg-brand-active',
    secondary: 'bg-fill-strong text-primary border border-default hover:bg-surface-hover hover:border-strong',
    danger: 'bg-danger-solid text-white shadow-sm hover:bg-danger-solid-hover',
    ghost: 'text-secondary hover:bg-fill-strong hover:text-primary',
    link: 'text-brand-text underline-offset-4 hover:underline',
}

// Alturas: md/lg/icon ≥ 44px (alvo de toque recomendado); sm para ações secundárias densas
const BUTTON_SIZE: Record<ButtonSize, string> = {
    sm: 'h-9 px-3 text-body rounded-control',
    md: 'h-11 px-4 text-body rounded-card',
    lg: 'h-12 px-5 text-body-lg rounded-card',
    icon: 'h-11 w-11 rounded-card',
}

export function buttonClasses({ variant = 'primary', size = 'md', fullWidth = false, className }: {
    variant?: ButtonVariant
    size?: ButtonSize
    fullWidth?: boolean
    className?: string
} = {}): string {
    return cx(
        BUTTON_BASE,
        BUTTON_VARIANT[variant],
        // O link é texto: sem altura nem padding de botão
        variant === 'link' ? 'text-body' : BUTTON_SIZE[size],
        fullWidth && 'w-full',
        className,
    )
}

export type BadgeTone = 'neutral' | 'brand' | 'success' | 'danger' | 'warning' | 'info'

export const BADGE_TONE: Record<BadgeTone, string> = {
    neutral: 'bg-fill-strong text-secondary border-subtle',
    brand: 'bg-brand-muted text-brand-text border-accent',
    success: 'bg-success-subtle text-success border-success-border',
    danger: 'bg-danger-subtle text-danger border-danger-border',
    warning: 'bg-warning-subtle text-warning border-warning-border',
    info: 'bg-info-subtle text-info border-info-border',
}
