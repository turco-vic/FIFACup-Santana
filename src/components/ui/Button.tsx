import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { buttonClasses, type ButtonSize, type ButtonVariant } from './variants'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant
    size?: ButtonSize
    fullWidth?: boolean
    loading?: boolean
    // Ícone antes do texto; no loading vira o spinner
    icon?: ReactNode
}

// Para um <Link> com cara de botão: <Link className={buttonClasses({ variant: 'secondary' })}>
export default function Button({
    variant = 'primary', size = 'md', fullWidth, loading = false, icon,
    className, disabled, type = 'button', children, ...rest
}: Props) {
    return (
        <button
            type={type}
            disabled={disabled || loading}
            aria-busy={loading || undefined}
            className={buttonClasses({ variant, size, fullWidth, className })}
            {...rest}
        >
            {loading
                ? <Loader2 size={size === 'sm' ? 14 : 16} className="animate-spin flex-shrink-0" aria-hidden />
                : icon}
            {children}
        </button>
    )
}
